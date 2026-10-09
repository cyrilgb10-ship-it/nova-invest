import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const SASPAY_API_URL = (
  process.env.SASPAY_API_URL || "https://api.saspay.me/api/v1"
).replace(/\/+$/, "");

const ALLOWED_NETWORKS = ["moov_tg", "togocel"] as const;

type AllowedNetwork = (typeof ALLOWED_NETWORKS)[number];

function isAllowedNetwork(value: unknown): value is AllowedNetwork {
  return (
    typeof value === "string" &&
    ALLOWED_NETWORKS.includes(value as AllowedNetwork)
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

/**
 * Normalise et valide un numéro togolais.
 * Accepte notamment :
 * 90 00 00 00
 * 22890000000
 * +22890000000
 *
 * Retourne null si le numéro est invalide.
 */
function normalizeTogoPhone(phone: string): string | null {
  const cleaned = phone.trim().replace(/[\s()-]/g, "");

  let localNumber = cleaned;

  if (cleaned.startsWith("+228")) {
    localNumber = cleaned.slice(4);
  } else if (cleaned.startsWith("228") && cleaned.length === 11) {
    localNumber = cleaned.slice(3);
  }

  if (!/^\d{8}$/.test(localNumber)) {
    return null;
  }

  return `+228${localNumber}`;
}

function getProviderError(result: unknown): string {
  if (!result || typeof result !== "object") {
    return "Aucun détail fourni par SasPay";
  }

  if ("message" in result && typeof result.message === "string") {
    return result.message.slice(0, 500);
  }

  if ("error" in result && typeof result.error === "string") {
    return result.error.slice(0, 500);
  }

  return "Aucun détail fourni par SasPay";
}

export async function POST(request: NextRequest) {
  let depositId: string | undefined;

  try {
    // 1. Vérifier l'utilisateur connecté
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Connecte-toi pour effectuer un dépôt.",
        401
      );
    }

    // 2. Lire les données du formulaire
    const body: unknown = await request.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      !("amount" in body) ||
      !("network" in body) ||
      !("phone" in body)
    ) {
      return errorResponse(
        "Renseigne le montant, le réseau Mobile Money et le numéro de téléphone.",
        400
      );
    }

    const amount = body.amount;
    const network = body.network;
    const submittedPhone = body.phone;

    // 3. Valider le montant
    if (
      typeof amount !== "number" ||
      !Number.isSafeInteger(amount) ||
      amount < 500 ||
      amount > 1_000_000
    ) {
      return errorResponse(
        "Le montant doit être compris entre 500 et 1 000 000 FCFA.",
        400
      );
    }

    // 4. Valider le réseau Mobile Money
    if (!isAllowedNetwork(network)) {
      return errorResponse(
        "Choisis Moov Money ou Togocel Money.",
        400
      );
    }

    // 5. Valider le numéro saisi dans le formulaire
    if (typeof submittedPhone !== "string") {
      return errorResponse(
        "Renseigne un numéro de téléphone valide.",
        400
      );
    }

    const phone = normalizeTogoPhone(submittedPhone);

    if (!phone) {
      return errorResponse(
        "Le numéro doit contenir 8 chiffres togolais, avec ou sans l'indicatif +228.",
        400
      );
    }

    // 6. Vérifier la configuration SasPay
    const secretKey = process.env.SASPAY_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "SASPAY_CONFIGURATION_ERROR: clé secrète absente"
      );

      return errorResponse(
        "La configuration SasPay est incomplète.",
        503
      );
    }

    // 7. Garder les paiements désactivés hors production
    if (
      process.env.SASPAY_ENABLE_LIVE_PAYMENTS !== "true" ||
      process.env.NODE_ENV !== "production"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paiements désactivés pendant le développement. Aucun paiement n'a été envoyé.",
        },
        { status: 503 }
      );
    }

    // 8. Vérifier l'URL publique
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (
      !appUrl ||
      !appUrl.startsWith("https://") ||
      /localhost|127\.0\.0\.1/i.test(appUrl)
    ) {
      return errorResponse(
        "Une URL publique HTTPS doit être configurée.",
        503
      );
    }

    // 9. Créer le dépôt en attente.
    // Le solde n'est pas crédité à cette étape.
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

    // 10. Envoyer la demande de paiement à SasPay
    const response = await fetch(
      `${SASPAY_API_URL}/payments/softpay/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
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
            phone,
          },
          network,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      }
    );

    // 11. Lire la réponse du prestataire
    const result: unknown = await response
      .json()
      .catch(() => null);

    // 12. Diagnostiquer une réponse HTTP négative
    if (!response.ok) {
      console.error("SASPAY_PAYMENT_ERROR", {
        httpStatus: response.status,
        depositId: deposit.id,
        providerMessage: getProviderError(result),
      });

      return NextResponse.json(
        {
          success: false,
          depositId: deposit.id,
          error:
            "SasPay n'a pas confirmé la création du paiement. Vérifie son statut avant de réessayer.",
        },
        { status: 502 }
      );
    }

    // 13. Vérifier la réponse de SasPay
    if (
      !result ||
      typeof result !== "object" ||
      !("id" in result) ||
      typeof result.id !== "string" ||
      !result.id.trim()
    ) {
      console.error("SASPAY_INVALID_RESPONSE", {
        depositId: deposit.id,
        responseReceived: result !== null,
      });

      return NextResponse.json(
        {
          success: false,
          depositId: deposit.id,
          error:
            "Réponse SasPay inattendue. Le dépôt doit être vérifié avant toute nouvelle tentative.",
        },
        { status: 502 }
      );
    }

    const payment = result as {
      id: string;
      status?: string;
      checkout_url?: string;
    };

    // 14. Enregistrer l'identifiant du paiement SasPay
    await prisma.deposit.update({
      where: {
        id: deposit.id,
      },
      data: {
        externalId: payment.id,
      },
    });

    // 15. Confirmer la création de la demande
    return NextResponse.json({
      success: true,
      message:
        "Demande de paiement transmise à SasPay. Confirme le paiement sur ton téléphone si nécessaire.",
      depositId: deposit.id,
      paymentId: payment.id,
      status: payment.status ?? "PENDING",
      checkoutUrl: payment.checkout_url || null,
    });
  } catch (error) {
    console.error("DEPOSIT_API_ERROR", {
      depositId,
      message:
        error instanceof Error
          ? error.message
          : "Erreur inconnue",
    });

    return NextResponse.json(
      {
        success: false,
        ...(depositId ? { depositId } : {}),
        error:
          "Une erreur est survenue. Vérifie le statut du dépôt avant de réessayer.",
      },
      { status: 500 }
    );
  }
}
