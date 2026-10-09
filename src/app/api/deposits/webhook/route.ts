import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const SASPAY_API_URL = (
  process.env.SASPAY_API_URL || "https://api.saspay.me/api/v1"
).replace(/\/+$/, "");

const SASPAY_SECRET_KEY = process.env.SASPAY_SECRET_KEY;
const SASPAY_WEBHOOK_SECRET = process.env.SASPAY_WEBHOOK_SECRET;

type SasPayPayment = {
  id?: string;
  status?: string;
  currency?: string;
  network?: string;
  requested_amount?: string | number;
  amount?: string | number;
};

type WebhookPayload = {
  event?: string;
  type?: string;
  data?: {
    id?: string;
    payment_id?: string;
    transaction_id?: string;
    status?: string;
  };
  id?: string;
  payment_id?: string;
  transaction_id?: string;
  status?: string;
};

function jsonResponse(message: string, status = 200) {
  return NextResponse.json(
    {
      received: status === 200,
      message,
    },
    { status }
  );
}

/**
 * Vérifie la signature du webhook SasPay.
 */
function verifySignature(
  rawBody: string,
  timestamp: string,
  signatureHeader: string
): boolean {
  if (!SASPAY_WEBHOOK_SECRET) {
    console.error("SASPAY_WEBHOOK_SECRET manquante.");
    return false;
  }

  const signature = signatureHeader
    .trim()
    .replace(/^sha256=/i, "");

  if (!/^[a-fA-F0-9]{64}$/.test(signature)) {
    return false;
  }

  const timestampNumber = Number(timestamp);

  if (
    !Number.isSafeInteger(timestampNumber) ||
    timestampNumber <= 0
  ) {
    return false;
  }

  // Accepter les timestamps en secondes ou en millisecondes.
  const timestampMs =
    timestampNumber < 1_000_000_000_000
      ? timestampNumber * 1000
      : timestampNumber;

  // Refuser les webhooks trop anciens ou datés dans le futur.
  const age = Math.abs(Date.now() - timestampMs);

  if (age > 5 * 60 * 1000) {
    return false;
  }

  // Format de signature utilisé dans le code existant.
  const signedContent = `${timestamp}.${rawBody}`;

  const expectedSignature = createHmac(
    "sha256",
    SASPAY_WEBHOOK_SECRET
  )
    .update(signedContent, "utf8")
    .digest();

  const receivedSignature = Buffer.from(signature, "hex");

  return (
    receivedSignature.length === expectedSignature.length &&
    timingSafeEqual(receivedSignature, expectedSignature)
  );
}

function normalizeStatus(value: unknown): string {
  return typeof value === "string"
    ? value.toUpperCase()
    : "";
}

function amountMatches(
  amount: unknown,
  expectedAmount: number
): boolean {
  if (
    typeof amount !== "string" &&
    typeof amount !== "number"
  ) {
    return false;
  }

  const parsedAmount = Number(amount);

  return (
    Number.isFinite(parsedAmount) &&
    parsedAmount === expectedAmount
  );
}

/**
 * Enregistre un dépôt échoué ou annulé et notifie le client.
 * Le dépôt doit encore être PENDING pour être modifié.
 */
async function markDepositFailed(depositId: string) {
  await prisma.$transaction(async (tx) => {
    const result = await tx.deposit.updateMany({
      where: {
        id: depositId,
        status: "PENDING",
      },
      data: {
        status: "FAILED",
      },
    });

    // Évite les notifications répétées pour le même dépôt.
    if (result.count !== 1) {
      return;
    }

    const deposit = await tx.deposit.findUnique({
      where: {
        id: depositId,
      },
      select: {
        id: true,
        userId: true,
        amount: true,
      },
    });

    if (!deposit) {
      throw new Error(
        "Dépôt introuvable après mise à jour."
      );
    }

    await tx.notification.create({
      data: {
        userId: deposit.userId,
        type: "SYSTEM",
        title: "Échec du dépôt",
        message:
          `Votre dépôt de ${deposit.amount} FCFA a échoué ou a été annulé. ` +
          "Aucun montant n'a été crédité sur votre solde.",
      },
    });
  });
}

/**
 * Confirme un dépôt après vérification auprès de SasPay.
 * Le solde n'est crédité qu'une seule fois.
 */
async function settleDeposit(payment: SasPayPayment) {
  if (!payment.id) {
    return {
      processed: false,
      retry: false,
    };
  }

  const deposit = await prisma.deposit.findFirst({
    where: {
      externalId: payment.id,
    },
  });

  if (!deposit) {
    console.error(
      "SASPAY_WEBHOOK_DEPOSIT_NOT_FOUND:",
      payment.id
    );

    return {
      processed: false,
      retry: true,
    };
  }

  if (deposit.status === "SUCCESS") {
    // Dépôt déjà crédité.
    return {
      processed: true,
      retry: false,
    };
  }

  if (deposit.status === "FAILED") {
    // Ne pas créditer un dépôt déjà marqué comme échoué.
    return {
      processed: false,
      retry: false,
    };
  }

  if (normalizeStatus(payment.status) !== "SUCCESS") {
    return {
      processed: false,
      retry: true,
    };
  }

  if (
    typeof payment.currency !== "string" ||
    payment.currency.toUpperCase() !== "XOF"
  ) {
    console.error(
      "SASPAY_WEBHOOK_CURRENCY_MISMATCH:",
      deposit.id
    );

    return {
      processed: false,
      retry: false,
    };
  }

  if (
    typeof payment.network !== "string" ||
    payment.network.toLowerCase() !==
      deposit.network.toLowerCase()
  ) {
    console.error(
      "SASPAY_WEBHOOK_NETWORK_MISMATCH:",
      deposit.id
    );

    return {
      processed: false,
      retry: false,
    };
  }

  const providerAmount =
    payment.requested_amount ?? payment.amount;

  if (!amountMatches(providerAmount, deposit.amount)) {
    console.error(
      "SASPAY_WEBHOOK_AMOUNT_MISMATCH:",
      deposit.id
    );

    return {
      processed: false,
      retry: false,
    };
  }

  const processed = await prisma.$transaction(async (tx) => {
    // Revendiquer le dépôt uniquement s'il est encore en attente.
    const claimed = await tx.deposit.updateMany({
      where: {
        id: deposit.id,
        status: "PENDING",
        externalId: payment.id,
      },
      data: {
        status: "SUCCESS",
      },
    });

    if (claimed.count !== 1) {
      // Un autre webhook a peut-être déjà traité ce dépôt.
      return false;
    }

    // Créditer le solde d'investissement.
    await tx.user.update({
      where: {
        id: deposit.userId,
      },
      data: {
        investBalance: {
          increment: deposit.amount,
        },
      },
    });

    // Ajouter le dépôt à l'historique des transactions.
    await tx.transaction.create({
      data: {
        userId: deposit.userId,
        type: "DEPOSIT",
        amount: deposit.amount,
        referenceId: deposit.id,
        description: "Dépôt confirmé par SasPay",
      },
    });

    // Notifier le client.
    await tx.notification.create({
      data: {
        userId: deposit.userId,
        type: "SYSTEM",
        title: "Dépôt confirmé",
        message:
          `Votre dépôt de ${deposit.amount} FCFA a été confirmé. ` +
          "Votre solde d'investissement a été crédité.",
      },
    });

    /*
     * Bonus de parrainage :
     * 500 FCFA, une seule fois, lors du premier dépôt confirmé
     * du filleul, selon la logique existante du projet.
     */
    const referral = await tx.referral.findUnique({
      where: {
        referredId: deposit.userId,
      },
    });

    if (referral && !referral.rewardGiven) {
      const rewardAmount = 500;

      // Réserver la récompense de façon atomique.
      const rewardClaim = await tx.referral.updateMany({
        where: {
          id: referral.id,
          rewardGiven: false,
        },
        data: {
          rewardGiven: true,
          rewardAmount,
        },
      });

      if (rewardClaim.count === 1) {
        await tx.user.update({
          where: {
            id: referral.referrerId,
          },
          data: {
            withdrawBalance: {
              increment: rewardAmount,
            },
          },
        });

        await tx.transaction.create({
          data: {
            userId: referral.referrerId,
            type: "REFERRAL_REWARD",
            amount: rewardAmount,
            referenceId: deposit.id,
            description:
              "Bonus de 500 FCFA pour le premier dépôt du filleul",
          },
        });

        await tx.notification.create({
          data: {
            userId: referral.referrerId,
            type: "REFERRAL",
            title: "Bonus de parrainage reçu",
            message:
              "Vous avez reçu 500 FCFA sur votre solde de retrait grâce au premier dépôt de votre filleul.",
          },
        });
      }
    }

    return true;
  });

  return {
    processed: true,
    retry: false,
    newlyProcessed: processed,
  };
}

/**
 * Point d'entrée du webhook SasPay.
 */
export async function POST(request: NextRequest) {
  try {
    if (!SASPAY_WEBHOOK_SECRET || !SASPAY_SECRET_KEY) {
      console.error(
        "Configuration SasPay incomplète : clé API ou secret webhook absent."
      );

      return jsonResponse(
        "Configuration du webhook indisponible.",
        500
      );
    }

    const signature =
      request.headers.get("X-Webhook-Signature") ?? "";

    const timestamp =
      request.headers.get("X-Webhook-Timestamp") ?? "";

    const headerEvent =
      request.headers.get("X-Webhook-Event") ?? "";

    // Lire le corps brut avant le parsing JSON.
    const rawBody = await request.text();

    if (
      !signature ||
      !timestamp ||
      !verifySignature(rawBody, timestamp, signature)
    ) {
      console.warn("SASPAY_WEBHOOK_INVALID_SIGNATURE");

      return jsonResponse("Signature invalide.", 401);
    }

    let payload: WebhookPayload;

    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return jsonResponse("Corps JSON invalide.", 400);
    }

    const event =
      headerEvent || payload.event || payload.type || "";

    if (
      headerEvent &&
      payload.event &&
      headerEvent !== payload.event
    ) {
      return jsonResponse(
        "L'événement de l'en-tête ne correspond pas au corps.",
        400
      );
    }

    // Événement de test.
    if (event === "webhook.test") {
      return jsonResponse("Webhook de test reçu.");
    }

    const supportedEvents = [
      "transaction.success",
      "transaction.failed",
      "transaction.cancelled",
      "transaction.created",
    ];

    if (!supportedEvents.includes(event)) {
      return jsonResponse("Événement ignoré.");
    }

    const paymentId =
      payload.data?.id ??
      payload.data?.payment_id ??
      payload.data?.transaction_id ??
      payload.payment_id ??
      payload.transaction_id ??
      payload.id;

    if (!paymentId) {
      return jsonResponse(
        "Référence de paiement manquante.",
        400
      );
    }

    const deposit = await prisma.deposit.findFirst({
      where: {
        externalId: paymentId,
      },
    });

    if (!deposit) {
      console.warn(
        "SASPAY_WEBHOOK_UNKNOWN_PAYMENT:",
        paymentId
      );

      // Demander une nouvelle tentative à SasPay.
      return jsonResponse(
        "Dépôt introuvable. Nouvelle tentative nécessaire.",
        500
      );
    }

    // Paiement échoué.
    if (event === "transaction.failed") {
      await markDepositFailed(deposit.id);

      return jsonResponse("Échec du paiement enregistré.");
    }

    // Paiement annulé.
    if (event === "transaction.cancelled") {
      await markDepositFailed(deposit.id);

      return jsonResponse("Annulation du paiement enregistrée.");
    }

    // Paiement créé, mais pas encore confirmé.
    if (event === "transaction.created") {
      return jsonResponse("Paiement en attente.");
    }

    /*
     * Pour un événement de succès, vérifier le paiement
     * auprès de l'API officielle SasPay avant tout crédit.
     */
    const verificationResponse = await fetch(
      `${SASPAY_API_URL}/payments/${encodeURIComponent(
        paymentId
      )}/verify/`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${SASPAY_SECRET_KEY}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!verificationResponse.ok) {
      console.error(
        "SASPAY_WEBHOOK_VERIFY_ERROR:",
        verificationResponse.status,
        await verificationResponse.text().catch(() => "")
      );

      return jsonResponse(
        "Vérification SasPay temporairement impossible.",
        500
      );
    }

    const verificationResult =
      await verificationResponse.json();

    const payment = (
      verificationResult?.data &&
      typeof verificationResult.data === "object"
        ? verificationResult.data
        : verificationResult
    ) as SasPayPayment;

    if (payment.id !== paymentId) {
      console.error(
        "SASPAY_WEBHOOK_PAYMENT_ID_MISMATCH:",
        paymentId
      );

      return jsonResponse(
        "Référence de paiement incohérente.",
        400
      );
    }

    if (normalizeStatus(payment.status) !== "SUCCESS") {
      return jsonResponse(
        "Paiement pas encore confirmé par SasPay."
      );
    }

    const result = await settleDeposit(payment);

    if (result.retry) {
      return jsonResponse(
        "Le paiement n'a pas encore pu être traité.",
        500
      );
    }

    if (!result.processed) {
      return jsonResponse(
        "Le paiement n'a pas pu être validé.",
        400
      );
    }

    return jsonResponse("Paiement traité avec succès.");
  } catch (error) {
    console.error("SASPAY_WEBHOOK_ERROR:", error);

    return jsonResponse(
      "Erreur interne lors du traitement du webhook.",
      500
    );
  }
}