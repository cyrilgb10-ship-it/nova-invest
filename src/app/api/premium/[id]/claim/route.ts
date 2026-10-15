import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function formatFCFA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Achat Premium invalide." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.premiumPurchase.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!purchase) {
        throw new Error("PREMIUM_PURCHASE_NOT_FOUND");
      }

      if (purchase.rewardClaimedAt) {
        throw new Error("PREMIUM_REWARD_ALREADY_CLAIMED");
      }

      const now = new Date();

      if (now < purchase.maturityDate) {
        throw new Error("PREMIUM_NOT_MATURED");
      }

      if (
        !Number.isSafeInteger(purchase.returnAmount) ||
        purchase.returnAmount <= 0 ||
        !Number.isSafeInteger(purchase.amountInvested) ||
        purchase.amountInvested <= 0 ||
        !Number.isSafeInteger(purchase.rewardAmount) ||
        purchase.rewardAmount < 0 ||
        purchase.returnAmount !==
          purchase.amountInvested + purchase.rewardAmount
      ) {
        throw new Error("INVALID_PREMIUM_CONFIGURATION");
      }

      // Réserver la réclamation pour empêcher tout double paiement.
      const claim = await tx.premiumPurchase.updateMany({
        where: {
          id: purchase.id,
          userId: user.id,
          rewardClaimedAt: null,
          maturityDate: {
            lte: now,
          },
        },
        data: {
          rewardClaimedAt: now,
        },
      });

      if (claim.count !== 1) {
        throw new Error("PREMIUM_REWARD_ALREADY_CLAIMED");
      }

      // Créditer le montant total dû sur le solde à retirer.
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          withdrawBalance: {
            increment: purchase.returnAmount,
          },
        },
      });

      // Enregistrer le paiement dans l'historique financier.
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "PREMIUM_REWARD",
          amount: purchase.returnAmount,
          referenceId: purchase.id,
          description: `Récompense Premium ${purchase.productName}`,
        },
      });

      // Informer l'utilisateur.
      await tx.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Récompense Premium reçue",
          message:
            `Votre cycle Premium ${purchase.productName} est terminé. ` +
            `Montant initial : ${formatFCFA(purchase.amountInvested)}. ` +
            `Gain : ${formatFCFA(purchase.rewardAmount)}. ` +
            `Total crédité sur votre solde à retirer : ` +
            `${formatFCFA(purchase.returnAmount)}.`,
        },
      });

      return {
        amountInvested: purchase.amountInvested,
        rewardAmount: purchase.rewardAmount,
        returnAmount: purchase.returnAmount,
        productName: purchase.productName,
        rewardClaimedAt: now,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Votre récompense Premium a été créditée.",
        purchase: result,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PREMIUM_PURCHASE_NOT_FOUND") {
        return NextResponse.json(
          { error: "Achat Premium introuvable." },
          { status: 404 }
        );
      }

      if (error.message === "PREMIUM_REWARD_ALREADY_CLAIMED") {
        return NextResponse.json(
          {
            error: "Cette récompense Premium a déjà été réclamée.",
            code: "PREMIUM_REWARD_ALREADY_CLAIMED",
          },
          { status: 400 }
        );
      }

      if (error.message === "PREMIUM_NOT_MATURED") {
        return NextResponse.json(
          {
            error: "Votre récompense sera disponible après les 95 jours.",
            code: "PREMIUM_NOT_MATURED",
          },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_PREMIUM_CONFIGURATION") {
        console.error("INVALID_PREMIUM_CONFIGURATION");

        return NextResponse.json(
          { error: "Configuration financière Premium invalide." },
          { status: 500 }
        );
      }
    }

    console.error("CLAIM_PREMIUM_REWARD_ERROR:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}
