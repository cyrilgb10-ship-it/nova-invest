import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const SASPAY_API_URL = (
  process.env.SASPAY_API_URL || "https://api.saspay.me/api/v1"
).replace(/\/+$/, "");

const SASPAY_SECRET_KEY = process.env.SASPAY_SECRET_KEY;

const ALLOWED_NETWORKS = ["moov_tg", "togocel"] as const;

const MIN_DEPOSIT = 500;
const MAX_DEPOSIT = 1_000_000;

type SasPayResponse = {
  id?: string;
  status?: string;
  checkout_url?: string;
  instructions?: unknown;
  message?: string;
  data?: {
    id?: string;
    status?: string;
    checkout_url?: string;
    instructions?: unknown;
    message?: string;
  };
  error?: unknown;
};

function normalizeTogoPhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s().-]/g, "");

  if (/^\d{8}$/.test(cleaned)) {
    return `+228${cleaned}`;
  }

  if (/^228\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (/^\+228\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

function getProviderData(response: SasPayResponse) {
  const data = response.data ?? response;

  return {
    id: typeof data.id === "string" ? data.id : null,
    status:
      typeof data.status === "string"
        ? data.status.toUpperCase()
        : null,
    checkoutUrl:
      typeof data.checkout_url === "string" &&
      data.checkout_url.trim() !== ""
        ? data.checkout_url
        : null,
    instructions: data.instructions,
  };
}

export async function POST(request: NextRequest) {
  let depositId: string | null = null;

  try {
    // 1. Vérifier la connexion.
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Vous devez être connecté pour effectuer un dépôt.",
        },
        { status: 401 }
      );
    }

    // 2. Vérifier la configuration SasPay.
    if (!SASPAY_SECRET_KEY) {
      console.error("SASPAY_SECRET_KEY_MISSING");

      return NextResponse.json(
        {
          success: false,
          error: "Le service de paiement est momentanément indisponible.",
        },
        { status: 503 }
      );
    }

    // 3. Lire les données du formulaire.
    const body = await request.json();

    const amount =
      typeof body.amount === "number"
        ? body.amount
        : typeof body.amount === "string" &&
            body.amount.trim() !== ""
          ? Number(body.amount)
          : NaN;

    const network =
      typeof body.network === "string"
        ? body.network.trim()
        : "";

    const rawPhone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    // Utiliser l'adresse e-mail enregistrée dans le profil.
    const email = user.email?.trim().toLowerCase() ?? "";

    // 4. Valider l'e-mail.
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Veuillez renseigner une adresse e-mail valide dans votre profil avant d'effectuer un dépôt.",
        },
        { status: 400 }
      );
    }

    // 5. Valider le montant.
    if (
      !Number.isSafeInteger(amount) ||
      amount < MIN_DEPOSIT ||
      amount > MAX_DEPOSIT
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Le montant doit être un nombre entier compris entre ${MIN_DEPOSIT.toLocaleString(
            "fr-FR"
          )} et ${MAX_DEPOSIT.toLocaleString("fr-FR")} FCFA.`,
        },
        { status: 400 }
      );
    }

    // 6. Vérifier le réseau.
    if (
      !ALLOWED_NETWORKS.includes(
        network as (typeof ALLOWED_NETWORKS)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Réseau invalide. Choisissez Moov Money ou Togocel Money.",
        },
        { status: 400 }
      );
    }

    // 7. Valider le numéro togolais.
    const phone = normalizeTogoPhone(rawPhone);

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Numéro de téléphone invalide. Saisissez un numéro togolais à 8 chiffres.",
        },
        { status: 400 }
      );
    }

    // 8. Créer le dépôt en attente.
    const deposit = await prisma.deposit.create({
      data: {
        userId: user.id,
        amount,
        network,
        provider: "saspay",
        status: "PENDING",
      },
    });

    depositId = deposit.id;

    // 9. Envoyer la demande de paiement à SasPay.
    let providerResponse: Response;

    try {
      providerResponse = await fetch(
        `${SASPAY_API_URL}/payments/softpay/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SASPAY_SECRET_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": deposit.id,
          },
          body: JSON.stringify({
            amount: amount.toFixed(2),
            currency: "XOF",
            country: "TG",
            description: `Dépôt Nova Invest ${deposit.id}`,
            customer: {
              first_name: user.firstName,
              last_name: user.lastName,
              email,
              phone,
            },
            network,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(30_000),
        }
      );
    } catch (error) {
      console.error("SASPAY_NETWORK_ERROR:", {
        depositId: deposit.id,
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      });

      return NextResponse.json(
        {
          success: false,
          pending: true,
          depositId: deposit.id,
          status: "PENDING",
          message:
            "La réponse du prestataire n'a pas pu être reçue. Vérifiez le statut du paiement avant toute nouvelle tentative.",
        },
        { status: 202 }
      );
    }

    // 10. Lire la réponse du prestataire.
    const responseText = await providerResponse.text();

    let parsedResponse: SasPayResponse;

    try {
      parsedResponse = JSON.parse(responseText) as SasPayResponse;
    } catch {
      console.error("SASPAY_INVALID_JSON:", {
        depositId: deposit.id,
        httpStatus: providerResponse.status,
      });

      if (providerResponse.ok) {
        return NextResponse.json(
          {
            success: false,
            pending: true,
            depositId: deposit.id,
            status: "PENDING",
            message:
              "La réponse du prestataire doit être vérifiée avant toute nouvelle tentative.",
          },
          { status: 202 }
        );
      }

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        {
          success: false,
          error: "SasPay a refusé la demande de paiement.",
          depositId: deposit.id,
        },
        { status: 502 }
      );
    }

    // 11. Gérer un refus de SasPay.
    if (!providerResponse.ok) {
      console.error("SASPAY_PAYMENT_REJECTED:", {
        depositId: deposit.id,
        httpStatus: providerResponse.status,
        providerResponse: parsedResponse,
      });

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "SasPay n'a pas pu initialiser ce paiement. Vérifiez vos informations et réessayez.",
          depositId: deposit.id,
        },
        { status: 502 }
      );
    }

    // 12. Extraire les informations du paiement.
    const payment = getProviderData(parsedResponse);

    if (!payment.id) {
      console.error("SASPAY_PAYMENT_ID_MISSING:", {
        depositId: deposit.id,
        response: parsedResponse,
      });

      return NextResponse.json(
        {
          success: false,
          pending: true,
          depositId: deposit.id,
          status: "PENDING",
          message:
            "Le paiement doit être vérifié auprès du prestataire.",
        },
        { status: 202 }
      );
    }

    // 13. Enregistrer l'identifiant externe.
    const paymentFailed =
      payment.status === "FAILED" ||
      payment.status === "CANCELLED";

    await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        externalId: payment.id,
        status: paymentFailed ? "FAILED" : "PENDING",
      },
    });

    // 14. Répondre au frontend sans créditer le solde.
    return NextResponse.json({
      success: !paymentFailed,
      message: paymentFailed
        ? "Le paiement a échoué ou a été annulé."
        : "Demande de paiement créée. Confirmez le paiement sur votre téléphone si nécessaire.",
      depositId: deposit.id,
      paymentId: payment.id,
      status: paymentFailed ? payment.status : "PENDING",
      checkoutUrl: payment.checkoutUrl,
      instructions: payment.instructions ?? null,
    });
  } catch (error) {
    console.error("CREATE_DEPOSIT_ERROR:", {
      depositId,
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json(
      {
        success: false,
        error:
          "Une erreur interne est survenue lors de la création du dépôt.",
      },
      { status: 500 }
    );
  }
}