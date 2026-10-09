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
      // Vérifier que le produit est toujours disponible.
      const product = await tx.investmentProduct.findFirst({
        where: {
          id: productId,
          active: true,
        },
      });

      if (!product) {
        throw new Error("PRODUCT_UNAVAILABLE");
      }

      // Récupérer les données les plus récentes de l'utilisateur.
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

      // Vérifier les paramètres financiers du produit.
      if (
        !Number.isSafeInteger(product.investmentAmount) ||
        product.investmentAmount <= 0 ||
        !Number.isSafeInteger(product.returnAmount) ||
        product.returnAmount < 0 ||
        !Number.isSafeInteger(product.profitAmount) ||
        product.profitAmount < 0 ||
        !Number.isSafeInteger(product.durationDays) ||
        product.durationDays <= 0
      ) {
        throw new Error("INVALID_PRODUCT_CONFIGURATION");
      }

      if (
        product.returnAmount !==
        product.investmentAmount + product.profitAmount
      ) {
        throw new Error("INVALID_PRODUCT_CONFIGURATION");
      }

      // Vérifier la limite d'achat.
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

      /*
       * Débiter le solde de façon conditionnelle.
       * Si plusieurs demandes arrivent simultanément, seule une
       * demande disposant encore du solde nécessaire peut réussir.
       */
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

      const startDate = new Date();
      const maturityDate = new Date(startDate);

      maturityDate.setDate(
        maturityDate.getDate() + product.durationDays
      );

      // Créer l'investissement.
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

      // Enregistrer la sortie du solde à investir.
      await tx.transaction.create({
        data: {
          userId: currentUser.id,
          type: "INVESTMENT",
          amount: product.investmentAmount,
          referenceId: investment.id,
          description: `Investissement ${product.name}`,
        },
      });

      // Notification détaillée de création.
      await tx.notification.create({
        data: {
          userId: currentUser.id,
          type: "INVESTMENT",
          title: "Investissement créé avec succès",
          message:
            `Votre investissement ${product.name} a été créé. ` +
            `Montant investi : ${formatFCFA(product.investmentAmount)}. ` +
            `Bénéfice prévu : ${formatFCFA(product.profitAmount)}. ` +
            `Montant total prévu à l'échéance : ` +
            `${formatFCFA(product.returnAmount)}. ` +
            `Date d'échéance : ${formatDate(maturityDate)}.`,
        },
      });

      /*
       * Bonus de parrainage :
       * attribution lors du premier investissement uniquement.
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
          // Vérifier également que le parrain existe.
          const referrer = await tx.user.findUnique({
            where: {
              id: referral.referrerId,
            },
            select: {
              id: true,
            },
          });

          if (referrer) {
            /*
             * La mise à jour conditionnelle évite de réclamer
             * une seconde fois le même bonus.
             */
            const referralClaim = await tx.referral.updateMany({
              where: {
                id: referral.id,
                rewardGiven: false,
                firstInvestmentAt: null,
              },
              data: {
                firstInvestmentAt: startDate,
                rewardGiven: true,
              },
            });

            if (referralClaim.count === 1) {
              const rewardAmount = referral.rewardAmount;

              if (
                !Number.isSafeInteger(rewardAmount) ||
                rewardAmount < 0
              ) {
                throw new Error("INVALID_REFERRAL_REWARD");
              }

              if (rewardAmount > 0) {
                // Créditer le solde à retirer du parrain.
                await tx.user.update({
                  where: {
                    id: referrer.id,
                  },
                  data: {
                    withdrawBalance: {
                      increment: rewardAmount,
                    },
                  },
                });

                // Enregistrer le bonus.
                await tx.transaction.create({
                  data: {
                    userId: referrer.id,
                    type: "REFERRAL_REWARD",
                    amount: rewardAmount,
                    referenceId: referral.id,
                    description: "Bonus de parrainage",
                  },
                });

                // Notifier le parrain.
                await tx.notification.create({
                  data: {
                    userId: referrer.id,
                    type: "REFERRAL",
                    title: "Bonus de parrainage reçu",
                    message:
                      `Votre filleul a réalisé son premier investissement. ` +
                      `Vous avez reçu ${formatFCFA(rewardAmount)} ` +
                      `sur votre solde à retirer.`,
                  },
                });
              }

              referralRewardGiven = true;
            }
          }
        }
      }

      return {
        investment,
        referralRewardGiven,
      };
    });

    return NextResponse.json(
      {
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

      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          {
            error: "Votre solde à investir est insuffisant.",
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

      if (error.message === "INVALID_PRODUCT_CONFIGURATION") {
        console.error(
          "INVALID_PRODUCT_CONFIGURATION:",
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

      if (error.message === "INVALID_REFERRAL_REWARD") {
        console.error("INVALID_REFERRAL_REWARD");

        return NextResponse.json(
          { error: "Configuration du parrainage invalide." },
          { status: 500 }
        );
      }
    }

    console.error("PURCHASE_INVESTMENT_ERROR:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}