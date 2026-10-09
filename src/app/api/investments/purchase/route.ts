import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 }
      );
    }

    const body = await request.json();

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

    const product = await prisma.investmentProduct.findFirst({
      where: {
        id: productId,
        active: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Ce produit n'est plus disponible." },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      /*
       * On récupère l'utilisateur directement dans la transaction
       * afin d'utiliser son solde le plus récent.
       */
      const currentUser = await tx.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          investBalance: true,
          referredById: true,
        },
      });

      if (!currentUser) {
        throw new Error("USER_NOT_FOUND");
      }

      /*
       * Vérification du solde disponible.
       */
      if (currentUser.investBalance < product.investmentAmount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      /*
       * Vérification de la limite d'achat du produit.
       * Les produits avec purchaseLimit = null sont illimités.
       */
      if (product.purchaseLimit !== null) {
        const purchaseCount = await tx.investment.count({
          where: {
            userId: currentUser.id,
            productId: product.id,
          },
        });

        if (purchaseCount >= product.purchaseLimit) {
          throw new Error("PURCHASE_LIMIT_REACHED");
        }
      }

      const startDate = new Date();

      const maturityDate = new Date(startDate);
      maturityDate.setDate(
        maturityDate.getDate() + product.durationDays
      );

      /*
       * Déduction du montant du Solde à investir.
       */
      await tx.user.update({
        where: {
          id: currentUser.id,
        },
        data: {
          investBalance: {
            decrement: product.investmentAmount,
          },
        },
      });

      /*
       * Création de l'investissement.
       */
      const investment = await tx.investment.create({
        data: {
          userId: currentUser.id,
          productId: product.id,
          amountInvested: product.investmentAmount,
          profitAmount: product.profitAmount,
          returnAmount: product.returnAmount,
          startDate,
          maturityDate,
          status: "ACTIVE",
        },
        include: {
          product: true,
        },
      });

      /*
       * Transaction financière de l'investissement.
       */
      await tx.transaction.create({
        data: {
          userId: currentUser.id,
          type: "INVESTMENT",
          amount: product.investmentAmount,
          referenceId: investment.id,
          description: `Investissement ${product.name}`,
        },
      });

      /*
       * Parrainage :
       * le bonus de 500 FCFA est attribué uniquement
       * lors du premier investissement du filleul.
       */
      let referralRewardGiven = false;

      if (currentUser.referredById) {
        const referral = await tx.referral.findUnique({
          where: {
            referredId: currentUser.id,
          },
        });

        if (
          referral &&
          !referral.rewardGiven &&
          referral.firstInvestmentAt === null
        ) {
          const rewardAmount = referral.rewardAmount;

          await tx.referral.update({
            where: {
              id: referral.id,
            },
            data: {
              firstInvestmentAt: startDate,
              rewardGiven: true,
            },
          });

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
              referenceId: referral.id,
              description: "Bonus de parrainage",
            },
          });

          await tx.notification.create({
            data: {
              userId: referral.referrerId,
              type: "REFERRAL",
              title: "Bonus de parrainage reçu",
              message: `Vous avez reçu ${rewardAmount.toLocaleString(
                "fr-FR"
              )} FCFA de bonus de parrainage.`,
            },
          });

          referralRewardGiven = true;
        }
      }

      /*
       * Notification pour l'investissement.
       */
      await tx.notification.create({
        data: {
          userId: currentUser.id,
          type: "INVESTMENT",
          title: "Investissement créé",
          message: `Votre investissement ${product.name} a été créé avec succès.`,
        },
      });

      return {
        investment,
        referralRewardGiven,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Investissement créé avec succès.",
      investment: {
        id: result.investment.id,
        productName: result.investment.product.name,
        amountInvested: result.investment.amountInvested,
        profitAmount: result.investment.profitAmount,
        returnAmount: result.investment.returnAmount,
        startDate: result.investment.startDate,
        maturityDate: result.investment.maturityDate,
        status: result.investment.status,
      },
      referralRewardGiven: result.referralRewardGiven,
    });
  } catch (error) {
    console.error("PURCHASE_INVESTMENT_ERROR:", error);

    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json(
          { error: "Utilisateur introuvable." },
          { status: 404 }
        );
      }

      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          {
            error: "Solde insuffisant.",
            code: "INSUFFICIENT_BALANCE",
          },
          { status: 400 }
        );
      }

      if (error.message === "PURCHASE_LIMIT_REACHED") {
        return NextResponse.json(
          {
            error: "Vous avez atteint la limite d'achat de ce produit.",
            code: "PURCHASE_LIMIT_REACHED",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}