import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function formatFCFA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lome",
  });
}

const PREMIUM_DURATION_DAYS = 95;
const FIRST_PREMIUM_REWARD = 62_000;
const REWARD_INCREMENT = 40_000;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 }
      );
    }

    let body: { productId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Les données envoyées sont invalides." },
        { status: 400 }
      );
    }

    const productId =
      typeof body.productId === "string"
        ? body.productId.trim()
        : "";

    if (!productId) {
      return NextResponse.json(
        { error: "Produit invalide." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Charger les produits actifs dans l'ordre des rangs.
      const products = await tx.investmentProduct.findMany({
        where: {
          active: true,
        },
        orderBy: [
          { investmentAmount: "asc" },
          { id: "asc" },
        ],
      });

      const rankIndex = products.findIndex(
        (product) => product.id === productId
      );

      if (rankIndex === -1) {
        throw new Error("PRODUCT_UNAVAILABLE");
      }

      if (rankIndex >= 15) {
        throw new Error("INVALID_PREMIUM_RANK");
      }

      const product = products[rankIndex];

      // Vérifier les montants configurés.
      if (
        !Number.isSafeInteger(product.investmentAmount) ||
        product.investmentAmount <= 0 ||
        !Number.isSafeInteger(product.returnAmount) ||
        !Number.isSafeInteger(product.profitAmount) ||
        product.returnAmount !==
          product.investmentAmount + product.profitAmount
      ) {
        throw new Error("INVALID_PRODUCT_CONFIGURATION");
      }

      // Vérifier l'existence de l'utilisateur.
      const currentUser = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!currentUser) {
        throw new Error("USER_NOT_FOUND");
      }

      /*
       * Le gain Premium dépend du rang du produit :
       * rang 1 = 62 000 FCFA
       * rang 2 = 102 000 FCFA
       * ...
       * rang 15 = 622 000 FCFA
       */
      const rewardAmount =
        FIRST_PREMIUM_REWARD +
        rankIndex * REWARD_INCREMENT;

      // Le montant total comprend le capital et le gain.
      const returnAmount =
        product.investmentAmount + rewardAmount;

      if (
        !Number.isSafeInteger(rewardAmount) ||
        !Number.isSafeInteger(returnAmount)
      ) {
        throw new Error("INVALID_PRODUCT_CONFIGURATION");
      }

      // Débiter le solde à investir de manière conditionnelle.
      const balanceUpdate = await tx.user.updateMany({
        where: {
          id: currentUser.id,
          investBalance: {
            gte: product.investmentAmount,
          },
        },
        data: {
          investBalance: {
            decrement: product.investmentAmount,
          },
        },
      });

      if (balanceUpdate.count !== 1) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const purchasedAt = new Date();
      const maturityDate = new Date(purchasedAt);

      maturityDate.setDate(
        maturityDate.getDate() + PREMIUM_DURATION_DAYS
      );

      // Créer l'achat Premium et son déblocage.
      const premiumPurchase = await tx.premiumPurchase.create({
        data: {
          userId: currentUser.id,
          productId: product.id,
          productName: `${product.name} Premium`,
          amountInvested: product.investmentAmount,
          rewardAmount,
          returnAmount,
          purchasedAt,
          maturityDate,

          // Le déblocage normal est disponible immédiatement.
          unlockedAt: purchasedAt,
        },
      });

      // Enregistrer la transaction financière.
      await tx.transaction.create({
        data: {
          userId: currentUser.id,
          type: "PREMIUM_PURCHASE",
          amount: product.investmentAmount,
          referenceId: premiumPurchase.id,
          description:
            `Achat ${product.name} Premium`,
        },
      });

      // Notifier l'utilisateur.
      await tx.notification.create({
        data: {
          userId: currentUser.id,
          type: "INVESTMENT",
          title: "Achat Premium effectué",
          message:
            `Votre achat ${product.name} Premium a été confirmé. ` +
            `Montant investi : ${formatFCFA(product.investmentAmount)}. ` +
            `Gain prévu : ${formatFCFA(rewardAmount)}. ` +
            `Montant total prévu : ${formatFCFA(returnAmount)}. ` +
            `Votre récompense sera disponible à partir du ` +
            `${formatDate(maturityDate)}. ` +
            `Un achat normal du même rang est maintenant débloqué.`,
        },
      });

      return {
        premiumPurchase,
        productName: product.name,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Achat Premium effectué avec succès.",
        premiumPurchase: {
          id: result.premiumPurchase.id,
          productName: result.premiumPurchase.productName,
          amountInvested:
            result.premiumPurchase.amountInvested,
          rewardAmount: result.premiumPurchase.rewardAmount,
          returnAmount: result.premiumPurchase.returnAmount,
          durationDays: PREMIUM_DURATION_DAYS,
          purchasedAt: result.premiumPurchase.purchasedAt,
          maturityDate: result.premiumPurchase.maturityDate,
          unlocked: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json(
          { error: "Utilisateur introuvable." },
          { status: 404 }
        );
      }

      if (error.message === "PRODUCT_UNAVAILABLE") {
        return NextResponse.json(
          { error: "Ce produit n'est plus disponible." },
          { status: 404 }
        );
      }

      if (error.message === "INVALID_PREMIUM_RANK") {
        return NextResponse.json(
          { error: "Rang Premium invalide." },
          { status: 400 }
        );
      }

      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          {
            error:
              "Votre solde à investir est insuffisant pour cet achat Premium.",
            code: "INSUFFICIENT_BALANCE",
          },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_PRODUCT_CONFIGURATION") {
        console.error(
          "INVALID_PREMIUM_PRODUCT_CONFIGURATION:",
          error.message
        );

        return NextResponse.json(
          {
            error:
              "Ce produit présente une configuration financière invalide.",
          },
          { status: 500 }
        );
      }
    }

    console.error("PREMIUM_PURCHASE_ERROR:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}