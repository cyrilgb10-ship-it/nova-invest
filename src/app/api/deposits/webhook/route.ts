import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOLERANCE_SECONDS = 300;

type SasPayWebhook = {
  event?: unknown;
  data?: {
    id?: unknown;
    reference?: unknown;
    status?: unknown;
    amount?: unknown;
    currency?: unknown;
  };
};

type SasPayPayment = {
  id?: unknown;
  status?: unknown;
  requested_amount?: unknown;
  currency?: unknown;
};

function jsonResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: status >= 200 && status < 300,
      message,
    },
    { status }
  );
}

/**
 * Vérifie la signature SasPay à partir du corps HTTP brut.
 * La signature attendue est :
 * HMAC-SHA256(secret, timestamp + "." + rawBody)
 */
function verifySignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  if (!/^\d+$/.test(timestamp)) {
    return false;
  }

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const timestampNumber = Number(timestamp);

  if (!Number.isSafeInteger(timestampNumber)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    Math.abs(now - timestampNumber) >
    TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest();

  const received = Buffer.from(signature, "hex");

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  try {
    const webhookSecret =
      process.env.SASPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "SASPAY_WEBHOOK_SECRET est manquante."
      );

      return jsonResponse(
        "Le webhook n'est pas configuré.",
        503
      );
    }

    const signature = request.headers.get(
      "x-webhook-signature"
    );

    const timestamp = request.headers.get(
      "x-webhook-timestamp"
    );

    const headerEvent = request.headers.get(
      "x-webhook-event"
    );

    if (!signature || !timestamp || !headerEvent) {
      return jsonResponse(
        "En-têtes du webhook manquants.",
        401
      );
    }

    // Important : lire le corps brut avant de le parser.
    const rawBody = await request.text();

    if (
      !verifySignature(
        rawBody,
        signature,
        timestamp,
        webhookSecret
      )
    ) {
      console.warn(
        "Signature SasPay invalide ou horodatage expiré."
      );

      return jsonResponse(
        "Signature invalide ou notification expirée.",
        401
      );
    }

    let payload: SasPayWebhook;

    try {
      payload = JSON.parse(rawBody) as SasPayWebhook;
    } catch {
      return jsonResponse(
        "Corps JSON invalide.",
        400
      );
    }

    const event = payload.event;
    const data = payload.data;

    if (
      typeof event !== "string" ||
      event !== headerEvent ||
      !data ||
      typeof data.id !== "string" ||
      data.id.length === 0
    ) {
      return jsonResponse(
        "Format de notification invalide.",
        400
      );
    }

    // Les événements de test ne doivent jamais créditer un compte.
    if (event === "webhook.test") {
      return jsonResponse(
        "Webhook de test reçu.",
        200
      );
    }

    const supportedEvents = [
      "transaction.success",
      "transaction.failed",
      "transaction.cancelled",
    ];

    if (!supportedEvents.includes(event)) {
      // Les autres événements ne concernent pas les dépôts.
      return jsonResponse(
        "Événement ignoré.",
        200
      );
    }

    const deposit = await prisma.deposit.findFirst({
      where: {
        externalId: data.id,
        provider: "saspay",
      },
    });

    if (!deposit) {
      console.warn(
        "Dépôt SasPay introuvable pour cette notification."
      );

      // SasPay pourra retenter la livraison.
      return jsonResponse(
        "Dépôt correspondant introuvable.",
        404
      );
    }

    // Si le dépôt a déjà été traité, ne rien créditer de nouveau.
    if (
      deposit.status === "SUCCESS" ||
      deposit.status === "FAILED"
    ) {
      return jsonResponse(
        "Ce dépôt a déjà été traité.",
        200
      );
    }

    const secretKey = process.env.SASPAY_SECRET_KEY;

    if (!secretKey) {
      console.error("SASPAY_SECRET_KEY est manquante.");

      return jsonResponse(
        "Le service SasPay n'est pas configuré.",
        503
      );
    }

    const apiUrl = (
      process.env.SASPAY_API_URL ||
      "https://api.saspay.me/api/v1"
    ).replace(/\/+$/, "");

    /*
     * Ne jamais créditer un dépôt sur la seule base
     * du contenu de la notification.
     *
     * On vérifie le paiement directement auprès de SasPay.
     */
    const verifyResponse = await fetch(
      `${apiUrl}/payments/${encodeURIComponent(
        deposit.externalId!
      )}/verify/`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      }
    );

    const payment: SasPayPayment | null =
      await verifyResponse
        .json()
        .catch(() => null);

    if (!verifyResponse.ok || !payment) {
      console.error("SASPAY_WEBHOOK_VERIFY_ERROR", {
        depositId: deposit.id,
        httpStatus: verifyResponse.status,
      });

      return jsonResponse(
        "Impossible de vérifier le paiement auprès de SasPay.",
        502
      );
    }

    // Vérification de l'identifiant du paiement.
    if (payment.id !== deposit.externalId) {
      console.error(
        "SASPAY_WEBHOOK_ID_MISMATCH",
        { depositId: deposit.id }
      );

      return jsonResponse(
        "Identifiant du paiement incorrect.",
        409
      );
    }

    // Vérification du montant et de la devise.
    const providerAmount = Number(
      payment.requested_amount
    );

    if (
      payment.requested_amount === undefined ||
      payment.requested_amount === null ||
      payment.requested_amount === "" ||
      !Number.isFinite(providerAmount) ||
      providerAmount !== deposit.amount ||
      payment.currency !== "XOF"
    ) {
      console.error(
        "SASPAY_WEBHOOK_PAYMENT_MISMATCH",
        {
          depositId: deposit.id,
          expectedAmount: deposit.amount,
          providerCurrency: payment.currency,
        }
      );

      return jsonResponse(
        "Le montant ou la devise du paiement ne correspond pas.",
        409
      );
    }

    const providerStatus =
      typeof payment.status === "string"
        ? payment.status.toUpperCase()
        : "";

    /*
     * Un événement de succès n'est accepté que si
     * SasPay confirme également le statut SUCCESS.
     */
    if (
      event === "transaction.success" &&
      providerStatus !== "SUCCESS"
    ) {
      console.warn(
        "Le webhook annonce un succès, mais SasPay ne le confirme pas.",
        { depositId: deposit.id, providerStatus }
      );

      return jsonResponse(
        "Le paiement n'est pas encore confirmé par SasPay.",
        409
      );
    }

    /*
     * Échec ou annulation :
     * le statut doit aussi être confirmé par SasPay.
     */
    if (
      event === "transaction.failed" ||
      event === "transaction.cancelled"
    ) {
      const failedStatuses = [
        "FAILED",
        "CANCELLED",
      ];

      if (!failedStatuses.includes(providerStatus)) {
        return jsonResponse(
          "Le statut final du paiement n'est pas confirmé.",
          409
        );
      }

      const updateResult =
        await prisma.deposit.updateMany({
          where: {
            id: deposit.id,
            provider: "saspay",
            status: "PENDING",
            externalId: deposit.externalId,
          },
          data: {
            status: "FAILED",
          },
        });

      if (updateResult.count === 0) {
        return jsonResponse(
          "Le dépôt a déjà été traité.",
          200
        );
      }

      return jsonResponse(
        "Échec du paiement enregistré.",
        200
      );
    }

    // Un statut inconnu ne doit jamais modifier le solde.
    if (providerStatus !== "SUCCESS") {
      return jsonResponse(
        "Le paiement est toujours en attente de confirmation.",
        200
      );
    }

    /*
     * Crédit atomique :
     * 1. Le dépôt passe de PENDING à SUCCESS.
     * 2. Le solde est incrémenté.
     * 3. La transaction est enregistrée.
     * 4. La notification est créée.
     *
     * Toutes ces opérations sont effectuées dans
     * une seule transaction PostgreSQL.
     */
    const result = await prisma.$transaction(
      async (tx) => {
        const updateResult =
          await tx.deposit.updateMany({
            where: {
              id: deposit.id,
              provider: "saspay",
              status: "PENDING",
              externalId: deposit.externalId,
            },
            data: {
              status: "SUCCESS",
            },
          });

        if (updateResult.count === 0) {
          const latestDeposit =
            await tx.deposit.findUnique({
              where: { id: deposit.id },
              select: { status: true },
            });

          return {
            creditedNow: false,
            status: latestDeposit?.status ?? "PENDING",
          };
        }

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

        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: "DEPOSIT",
            amount: deposit.amount,
            referenceId: deposit.id,
            description:
              `Dépôt SasPay confirmé (${deposit.network})`,
          },
        });

        await tx.notification.create({
          data: {
            userId: deposit.userId,
            type: "SYSTEM",
            title: "Dépôt confirmé",
            message:
              `Ton dépôt de ${deposit.amount} FCFA a été confirmé et ajouté à ton solde d'investissement.`,
          },
        });

        return {
          creditedNow: true,
          status: "SUCCESS",
        };
      }
    );

    console.info("SASPAY_WEBHOOK_PROCESSED", {
      depositId: deposit.id,
      status: result.status,
      creditedNow: result.creditedNow,
    });

    return jsonResponse(
      result.creditedNow
        ? "Paiement confirmé et solde crédité."
        : "Ce dépôt a déjà été traité.",
      200
    );
  } catch (error) {
    console.error(
      "SASPAY_WEBHOOK_ERROR:",
      error
    );

    return jsonResponse(
      "Erreur interne lors du traitement du webhook.",
      500
    );
  }
}