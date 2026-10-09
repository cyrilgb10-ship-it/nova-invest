import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatFCFA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export async function POST(request: NextRequest) {
  try {
    // Sécuriser l'exécution automatique.
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");

    if (
      !cronSecret ||
      authorization !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const now = new Date();

    // Rechercher les investissements arrivés à échéance.
    const investments = await prisma.investment.findMany({
      where: {
        status: "ACTIVE",
        maturityDate: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
    });

    let completed = 0;
    let skipped = 0;
    let failed = 0;

    for (const investment of investments) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          /*
           * La mise à jour conditionnelle est essentielle :
           * un seul traitement peut faire passer cet investissement
           * d'ACTIVE à COMPLETED.
           */
          const claimed = await tx.investment.updateMany({
            where: {
              id: investment.id,
              status: "ACTIVE",
              maturityDate: {
                lte: now,
              },
            },
            data: {
              status: "COMPLETED",
              completedAt: now,
            },
          });

          if (claimed.count !== 1) {
            return "SKIPPED" as const;
          }

          const currentInvestment =
            await tx.investment.findUnique({
              where: {
                id: investment.id,
              },
              select: {
                id: true,
                userId: true,
                returnAmount: true,
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            });

          if (!currentInvestment) {
            throw new Error("INVESTMENT_NOT_FOUND");
          }

          // Créditer le solde à retirer.
          await tx.user.update({
            where: {
              id: currentInvestment.userId,
            },
            data: {
              withdrawBalance: {
                increment: currentInvestment.returnAmount,
              },
            },
          });

          // Enregistrer le mouvement financier.
          await tx.transaction.create({
            data: {
              userId: currentInvestment.userId,
              type: "INVESTMENT_RETURN",
              amount: currentInvestment.returnAmount,
              referenceId: currentInvestment.id,
              description:
                `Échéance ${currentInvestment.product.name}`,
            },
          });

          // Notifier l'utilisateur.
          await tx.notification.create({
            data: {
              userId: currentInvestment.userId,
              type: "INVESTMENT",
              title: "Investissement arrivé à échéance",
              message:
                `Votre investissement ${currentInvestment.product.name} ` +
                `est arrivé à échéance. ` +
                `${formatFCFA(currentInvestment.returnAmount)} ` +
                `ont été ajoutés à votre solde à retirer.`,
            },
          });

          return "COMPLETED" as const;
        });

        if (result === "COMPLETED") {
          completed++;
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;

        console.error(
          `INVESTMENT_COMPLETION_ERROR [${investment.id}]:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      found: investments.length,
      completed,
      skipped,
      failed,
    });
  } catch (error) {
    console.error("COMPLETE_INVESTMENTS_ERROR:", error);

    return NextResponse.json(
      {
        error: "Impossible de terminer les investissements.",
      },
      { status: 500 }
    );
  }
}