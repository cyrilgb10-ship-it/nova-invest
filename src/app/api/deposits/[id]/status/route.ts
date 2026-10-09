import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type SasPayPayment = {
  id?: unknown;
  status?: unknown;
  requested_amount?: unknown;
  currency?: unknown;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Tu dois être connecté pour vérifier ce dépôt.",
        401
      );
    }

    const { id } = await context.params;

    const deposit = await prisma.deposit.findFirst({
      where: {
        id,
        userId: user.id,
        provider: "saspay",
      },
    });

    if (!deposit) {
      return errorResponse("Dépôt introuvable.", 404);
    }

    // Un dépôt déjà traité ne doit jamais être crédité une seconde fois.
    if (deposit.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        message: "Ce dépôt a déjà été confirmé.",
        status: "SUCCESS",
        credited: true,
      });
    }

    if (deposit.status === "FAILED") {
      return NextResponse.json({
        success: true,
        message: "Ce paiement a échoué.",
        status: "FAILED",
        credited: false,
      });
    }

    if (!deposit.externalId) {
      return NextResponse.json({
        success: true,
        message: "Le paiement n'a pas encore été initialisé.",
        status: "PENDING",
        credited: false,
      });
    }

    const secretKey = process.env.SASPAY_SECRET_KEY;

    if (!secretKey) {
      console.error("SASPAY_SECRET_KEY manquante.");

      return errorResponse(
        "Le service de paiement n'est pas configuré.",
        503
      );
    }

    const apiUrl = (
      process.env.SASPAY_API_URL ||
      "https://api.saspay.me/api/v1"
    ).replace(/\/+$/, "");

    // Vérification directement auprès de SasPay.
    const response = await fetch(
      `${apiUrl}/payments/${encodeURIComponent(
        deposit.externalId
      )}/verify/`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    const payment: SasPayPayment | null = await response
      .json()
      .catch(() => null);

    if (!response.ok || !payment) {
      console.error("SASPAY_VERIFY_ERROR", {
        depositId: deposit.id,
        httpStatus: response.status,
      });

      return errorResponse(
        "Impossible de confirmer le paiement auprès de SasPay.",
        502
      );
    }

    // Vérifier l'identifiant, le montant et la devise.
    if (
      payment.id !== deposit.externalId ||
      typeof payment.requested_amount !== "string" ||
      payment.currency !== "XOF"
    ) {
      console.error("SASPAY_PAYMENT_MISMATCH", {
        depositId: deposit.id,
      });

      return errorResponse(
        "Les informations du paiement ne correspondent pas au dépôt.",
        409
      );
    }

    const providerAmount = Number(payment.requested_amount);

    if (
      !Number.isFinite(providerAmount) ||
      providerAmount !== deposit.amount
    ) {
      console.error("SASPAY_AMOUNT_MISMATCH", {
        depositId: deposit.id,
        expectedAmount: deposit.amount,
      });

      return errorResponse(
        "Le montant confirmé ne correspond pas au montant du dépôt.",
        409
      );
    }

    const providerStatus =
      typeof payment.status === "string"
        ? payment.status.toUpperCase()
        : "";

    // Un paiement en attente ne modifie aucun solde.
    if (providerStatus === "PENDING") {
      return NextResponse.json({
        success: true,
        message: "Le paiement est toujours en attente.",
        status: "PENDING",
        credited: false,
      });
    }

    // Seul un échec explicitement confirmé peut être marqué FAILED.
    if (providerStatus === "FAILED") {
      const result = await prisma.deposit.updateMany({
        where: {
          id: deposit.id,
          userId: user.id,
          status: "PENDING",
          externalId: deposit.externalId,
        },
        data: {
          status: "FAILED",
        },
      });

      if (result.count === 0) {
        const latest = await prisma.deposit.findUnique({
          where: { id: deposit.id },
          select: { status: true },
        });

        return NextResponse.json({
          success: true,
          status: latest?.status ?? "PENDING",
          credited: latest?.status === "SUCCESS",
        });
      }

      return NextResponse.json({
        success: true,
        message: "Le paiement a échoué.",
        status: "FAILED",
        credited: false,
      });
    }

    // Ne jamais créditer pour un statut inconnu.
    if (providerStatus !== "SUCCESS") {
      return NextResponse.json({
        success: true,
        message: "Le statut du paiement doit encore être vérifié.",
        status: "PENDING",
        credited: false,
      });
    }

    /*
     * Crédit atomique :
     * le passage de PENDING à SUCCESS n'est possible qu'une fois.
     * L'incrément du solde et l'enregistrement de la transaction
     * se font dans la même transaction PostgreSQL.
     */
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.deposit.updateMany({
        where: {
          id: deposit.id,
          userId: user.id,
          status: "PENDING",
          externalId: deposit.externalId,
        },
        data: {
          status: "SUCCESS",
        },
      });

      if (updateResult.count === 0) {
        const latestDeposit = await tx.deposit.findUnique({
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
          id: user.id,
        },
        data: {
          investBalance: {
            increment: deposit.amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          amount: deposit.amount,
          referenceId: deposit.id,
          description: `Dépôt SasPay confirmé (${deposit.network})`,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Dépôt confirmé",
          message: `Ton dépôt de ${deposit.amount} FCFA a été confirmé et ajouté à ton solde d'investissement.`,
        },
      });

      return {
        creditedNow: true,
        status: "SUCCESS",
      };
    });

    return NextResponse.json({
      success: true,
      message: result.creditedNow
        ? "Paiement confirmé. Ton solde d'investissement a été crédité."
        : result.status === "SUCCESS"
          ? "Ce dépôt avait déjà été crédité."
          : "Le dépôt n'a pas pu être crédité. Vérifie son statut.",
      status: result.status,
      credited: result.status === "SUCCESS",
      creditedNow: result.creditedNow,
    });
  } catch (error) {
    console.error("DEPOSIT_STATUS_ERROR:", error);

    return errorResponse(
      "Une erreur est survenue pendant la vérification du dépôt.",
      500
    );
  }
}