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
    { success: false, error: message },
    { status }
  );
}

function normalizeTogoPhone(phone: string): string {
  const cleaned = phone.trim().replace(/[\s()-]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("228")) {
    return `+${cleaned}`;
  }

  return `+228${cleaned}`;
}

export async function POST(request: NextRequest) {
  let depositId: string | undefined;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Connecte-toi pour effectuer un dépôt.",
        401
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse("Données invalides.", 400);
    }

    const amount = body.amount;
    const network = body.network;

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

    if (!isAllowedNetwork(network)) {
      return errorResponse(
        "Choisis Moov Money ou Togocel Money.",
        400
      );
    }

    const secretKey = process.env.SASPAY_SECRET_KEY;

    if (!secretKey) {
      return errorResponse(
        "La configuration SasPay est incomplète.",
        503
      );
    }

    /*
     * Protection pendant le développement :
     * aucun paiement n'est envoyé par défaut.
     */
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

    if (!user.phone.trim()) {
      return errorResponse(
        "Aucun numéro de téléphone n'est associé à ton compte.",
        400
      );
    }

    /*
     * Création locale de la demande.
     * Le solde n'est pas crédité à cette étape.
     */
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
            phone: normalizeTogoPhone(user.phone),
          },
          network,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      }
    );

    const result: unknown = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      console.error("SASPAY_PAYMENT_ERROR", {
        httpStatus: response.status,
        depositId: deposit.id,
      });

      /*
       * On conserve le dépôt en attente : en cas de réponse
       * ambiguë, il faut vérifier le fournisseur avant de
       * déclarer le paiement définitivement échoué.
       */
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

    if (
      !result ||
      typeof result !== "object" ||
      !("id" in result) ||
      typeof result.id !== "string"
    ) {
      console.error("SASPAY_INVALID_RESPONSE", {
        depositId: deposit.id,
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

    await prisma.deposit.update({
      where: { id: deposit.id },
      data: { externalId: payment.id },
    });

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
        error instanceof Error ? error.message : "Erreur inconnue",
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