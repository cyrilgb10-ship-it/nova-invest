import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");

    if (
      !cronSecret ||
      authorization !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        {
          error: "Non autorisé.",
        },
        {
          status: 401,
        }
      );
    }

    const now = new Date();

    const investments = await prisma.investment.findMany({
      where: {
        status: "ACTIVE",
        maturityDate: {
          lte: now,
        },
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

    if (investments.length === 0) {
      return NextResponse.json({
        success: true,
        completed: 0,
      });
    }

    let completed = 0;

    for (const investment of investments) {
      await prisma.$transaction(async (tx) => {
        const currentInvestment =
          await tx.investment.findUnique({
            where: {
              id: investment.id,
            },
            select: {
              id: true,
              userId: true,
              returnAmount: true,
              status: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          });

        if (
          !currentInvestment ||
          currentInvestment.status !== "ACTIVE"
        ) {
          return;
        }

        await tx.investment.update({
          where: {
            id: currentInvestment.id,
          },
          data: {
            status: "COMPLETED",
            completedAt: now,
          },
        });

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

        await tx.transaction.create({
          data: {
            userId: currentInvestment.userId,
            type: "INVESTMENT_RETURN",
            amount: currentInvestment.returnAmount,
            referenceId: currentInvestment.id,
            description: `Échéance ${currentInvestment.product.name}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: currentInvestment.userId,
            type: "INVESTMENT",
            title: "Investissement terminé",
            message: `Votre investissement ${currentInvestment.product.name} est arrivé à échéance. ${currentInvestment.returnAmount.toLocaleString(
              "fr-FR"
            )} FCFA ont été ajoutés à votre solde à retirer.`,
          },
        });

        completed++;
      });
    }

    return NextResponse.json({
      success: true,
      completed,
    });
  } catch (error) {
    console.error("COMPLETE_INVESTMENTS_ERROR:", error);

    return NextResponse.json(
      {
        error: "Impossible de terminer les investissements.",
      },
      {
        status: 500,
      }
    );
  }
}