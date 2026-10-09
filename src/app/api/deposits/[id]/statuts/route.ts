import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const SASPAY_API_URL = (
  process.env.SASPAY_API_URL || "https://api.saspay.me/api/v1"
).replace(/\/+$/, "");

const SASPAY_SECRET_KEY = process.env.SASPAY_SECRET_KEY;

type SasPayPayment = {
  id?: string;
  status?: string;
  currency?: string;
  network?: string;
  requested_amount?: string | number;
  amount?: string | number;
};

function normalizeStatus(value: unknown): string {
  return typeof value === "string" ? value.toUpperCase() : "";
}

function amountMatches(
  providerAmount: unknown,
  expectedAmount: number
): boolean {
  if (
    typeof providerAmount !== "string" &&
    typeof providerAmount !== "number"
  ) {
    return false;
  }

  const amount = Number(providerAmount);

  return Number.isFinite(amount) && amount === expectedAmount;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Veuillez vous connecter." },
        { status: 401 }
      );
    }

    if (!SASPAY_SECRET_KEY) {
      console.error("SASPAY_SECRET_KEY manquante.");

      return NextResponse.json(
        { success: false, message: "Service de paiement indisponible." },
        { status: 500 }
      );
    }

    const { id } = await context.params;

    const deposit = await prisma.deposit.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!deposit) {
      return NextResponse.json(
        { success: false, message: "Dépôt introuvable." },
        { status: 404 }
      );
    }

    if (deposit.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        status: "SUCCESS",
        message: "Dépôt déjà confirmé.",
      });
    }

    if (deposit.status === "FAILED") {
      return NextResponse.json({
        success: true,
        status: "FAILED",
        message: "Ce dépôt a échoué.",
      });
    }

    if (!deposit.externalId) {
      return NextResponse.json({
        success: true,
        status: "PENDING",
        message: "En attente de la référence de paiement SasPay.",
      });
    }

    const response = await fetch(
      `${SASPAY_API_URL}/payments/${encodeURIComponent(
        deposit.externalId
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

    if (!response.ok) {
      console.error(
        "SASPAY_VERIFY_ERROR:",
        response.status,
        await response.text().catch(() => "")
      );

      return NextResponse.json(
        {
          success: false,
          status: "PENDING",
          message: "Impossible de vérifier le paiement pour le moment.",
        },
        { status: 502 }
      );
    }

    const result = await response.json();

    const payment = (
      result?.data && typeof result.data === "object"
        ? result.data
        : result
    ) as SasPayPayment;

    const providerStatus = normalizeStatus(payment.status);

    if (
      payment.id &&
      payment.id !== deposit.externalId
    ) {
      console.error("SASPAY_PAYMENT_ID_MISMATCH:", deposit.id);

      return NextResponse.json(
        {
          success: false,
          message: "La référence du paiement ne correspond pas.",
        },
        { status: 400 }
      );
    }

    if (
      payment.currency &&
      payment.currency.toUpperCase() !== "XOF"
    ) {
      console.error("SASPAY_CURRENCY_MISMATCH:", deposit.id);

      return NextResponse.json(
        {
          success: false,
          message: "La devise du paiement ne correspond pas.",
        },
        { status: 400 }
      );
    }

    if (
      payment.network &&
      payment.network.toLowerCase() !== deposit.network.toLowerCase()
    ) {
      console.error("SASPAY_NETWORK_MISMATCH:", deposit.id);

      return NextResponse.json(
        {
          success: false,
          message: "Le réseau du paiement ne correspond pas.",
        },
        { status: 400 }
      );
    }

    if (
      providerStatus === "FAILED" ||
      providerStatus === "CANCELLED"
    ) {
      await prisma.deposit.updateMany({
        where: {
          id: deposit.id,
          status: "PENDING",
        },
        data: {
          status: "FAILED",
        },
      });

      return NextResponse.json({
        success: true,
        status: "FAILED",
        message: "Le paiement a échoué ou a été annulé.",
      });
    }

    if (providerStatus !== "SUCCESS") {
      return NextResponse.json({
        success: true,
        status: "PENDING",
        message: "Paiement en attente de confirmation.",
      });
    }

    const providerAmount =
      payment.requested_amount ?? payment.amount;

    if (!amountMatches(providerAmount, deposit.amount)) {
      console.error("SASPAY_AMOUNT_MISMATCH:", deposit.id);

      return NextResponse.json(
        {
          success: false,
          message: "Le montant confirmé ne correspond pas au dépôt.",
        },
        { status: 400 }
      );
    }

    const settlement = await prisma.$transaction(async (tx) => {
      // Une seule requête peut faire passer ce dépôt de PENDING à SUCCESS.
      // Cela évite de créditer plusieurs fois le même paiement.
      const updatedDeposit = await tx.deposit.updateMany({
        where: {
          id: deposit.id,
          status: "PENDING",
          externalId: deposit.externalId,
        },
        data: {
          status: "SUCCESS",
        },
      });

      if (updatedDeposit.count !== 1) {
        const currentDeposit = await tx.deposit.findUnique({
          where: { id: deposit.id },
        });

        return {
          alreadyProcessed: true,
          status: currentDeposit?.status ?? "PENDING",
        };
      }

      await tx.user.update({
        where: { id: deposit.userId },
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
          description: "Dépôt confirmé par SasPay",
        },
      });

      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: "SYSTEM",
          title: "Dépôt confirmé",
          message: `Votre dépôt de ${deposit.amount} FCFA a été confirmé. Votre solde d'investissement a été crédité.`,
        },
      });

      // Récompense du parrain : une seule fois par filleul.
      const referral = await tx.referral.findUnique({
        where: {
          referredId: deposit.userId,
        },
      });

      if (referral && !referral.rewardGiven) {
        const rewardAmount = 500;

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
              description: "Récompense du premier dépôt du filleul",
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

      return {
        alreadyProcessed: false,
        status: "SUCCESS",
      };
    });

    return NextResponse.json({
      success: true,
      status: settlement.status,
      message:
        settlement.status === "SUCCESS"
          ? settlement.alreadyProcessed
            ? "Dépôt déjà traité."
            : "Dépôt confirmé et solde crédité."
          : "Le dépôt est en attente.",
    });
  } catch (error) {
    console.error("DEPOSIT_STATUS_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue lors de la vérification du dépôt.",
      },
      { status: 500 }
    );
  }
}
