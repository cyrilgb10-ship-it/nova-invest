import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function formatFCFA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
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

    let body: { investmentId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    const investmentId =
      typeof body.investmentId === "string"
        ? body.investmentId.trim()
        : "";

    if (!investmentId) {
      return NextResponse.json(
        { error: "Investissement invalide." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      /*
       * Une seule requête peut faire passer l'investissement
       * d'ACTIVE à COMPLETED.
       *
       * La vérification de userId empêche un utilisateur
       * de réclamer l'investissement d'un autre.
       */
      const claimed = await tx.investment.updateMany({
        where: {
          id: investmentId,
          userId: user.id,
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
        const investment = await tx.investment.findFirst({
          where: {
            id: investmentId,
            userId: user.id,
          },
          select: {
            status: true,
            maturityDate: true,
          },
        });

        if (!investment) {
          throw new Error("INVESTMENT_NOT_FOUND");
        }

        if (investment.status === "COMPLETED") {
          throw new Error("ALREADY_CLAIMED");
        }

        if (investment.maturityDate > now) {
          throw new Error("NOT_MATURED");
        }

        throw new Error("CLAIM_UNAVAILABLE");
      }

      const investment = await tx.investment.findUnique({
        where: {
          id: investmentId,
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

      if (!investment) {
        throw new Error("INVESTMENT_NOT_FOUND");
      }

      if (
        !Number.isSafeInteger(investment.returnAmount) ||
        investment.returnAmount <= 0
      ) {
        throw new Error("INVALID_RETURN_AMOUNT");
      }

      // Créditer le solde à retirer.
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          withdrawBalance: {
            increment: investment.returnAmount,
          },
        },
      });

      // Enregistrer le crédit dans l'historique.
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "INVESTMENT_RETURN",
          amount: investment.returnAmount,
          referenceId: investment.id,
          description: `Réclamation investissement ${investment.product.name}`,
        },
      });

      // Informer l'utilisateur.
      await tx.notification.create({
        data: {
          userId: user.id,
          type: "INVESTMENT",
          title: "Fonds crédités",
          message:
            `Votre investissement ${investment.product.name} est arrivé à échéance. ` +
            `${formatFCFA(investment.returnAmount)} ont été ajoutés à votre solde à retirer.`,
        },
      });

      return {
        amount: investment.returnAmount,
        productName: investment.product.name,
      };
    });

    return NextResponse.json({
      success: true,
      amount: result.amount,
      message:
        `${formatFCFA(result.amount)} ont été ajoutés à votre solde à retirer.`,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVESTMENT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Investissement introuvable." },
          { status: 404 }
        );
      }

      if (error.message === "ALREADY_CLAIMED") {
        return NextResponse.json(
          { error: "Les fonds de cet investissement ont déjà été réclamés." },
          { status: 409 }
        );
      }

      if (error.message === "NOT_MATURED") {
        return NextResponse.json(
          { error: "Cet investissement n'est pas encore arrivé à échéance." },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_RETURN_AMOUNT") {
        console.error("INVALID_RETURN_AMOUNT");

        return NextResponse.json(
          { error: "Le montant à récupérer est invalide." },
          { status: 500 }
        );
      }
    }

    console.error("CLAIM_INVESTMENT_ERROR:", error);

    return NextResponse.json(
      { error: "Impossible de réclamer cet investissement pour le moment." },
      { status: 500 }
    );
  }
}