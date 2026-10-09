import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const WITHDRAWAL_FEE = 500;
const MAX_WITHDRAWAL_AMOUNT = 2_000_000_000;
const MAX_WITHDRAWALS_PER_REQUEST = 50;

function formatFCFA(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function normalizePhone(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, "").replace(/^\+228/, "");
}

function isValidMoovTogoPhone(phone: string): boolean {
  return /^(76|77|78|79|96|97|98|99)\d{6}$/.test(phone);
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

    let body: { amount?: unknown; phone?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Les données envoyées sont invalides." },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);
    const phone = normalizePhone(body.phone);

    // Validation du montant.
    if (
      !Number.isSafeInteger(amount) ||
      amount <= WITHDRAWAL_FEE
    ) {
      return NextResponse.json(
        {
          error:
            "Le montant doit être un nombre entier supérieur à 500 FCFA.",
        },
        { status: 400 }
      );
    }

    if (amount > MAX_WITHDRAWAL_AMOUNT) {
      return NextResponse.json(
        { error: "Le montant demandé est trop élevé." },
        { status: 400 }
      );
    }

    // Validation du numéro Moov Togo.
    // Exactement 8 chiffres avec un préfixe autorisé.
    if (!isValidMoovTogoPhone(phone)) {
      return NextResponse.json(
        {
          error:
            "Veuillez saisir un numéro Moov Togo valide de 8 chiffres commençant par 76, 77, 78, 79, 96, 97, 98 ou 99.",
        },
        { status: 400 }
      );
    }

    const netAmount = amount - WITHDRAWAL_FEE;

    const withdrawal = await prisma.$transaction(
      async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            withdrawBalance: true,
          },
        });

        if (!currentUser) {
          throw new Error("USER_NOT_FOUND");
        }

        // Réserver le montant demandé de manière conditionnelle
        // pour éviter les doubles retraits sur le même solde.
        const balanceUpdate = await tx.user.updateMany({
          where: {
            id: currentUser.id,
            withdrawBalance: {
              gte: amount,
            },
          },
          data: {
            withdrawBalance: {
              decrement: amount,
            },
          },
        });

        if (balanceUpdate.count !== 1) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // Créer la demande de retrait.
        const createdWithdrawal = await tx.withdrawal.create({
          data: {
            userId: currentUser.id,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            amount,
            fee: WITHDRAWAL_FEE,
            netAmount,
            network: "moov",
            phone,
            status: "PENDING",
          },
        });

        // Enregistrer le mouvement financier.
        await tx.transaction.create({
          data: {
            userId: currentUser.id,
            type: "WITHDRAWAL",
            amount: -amount,
            referenceId: createdWithdrawal.id,
            description: "Demande de retrait en attente",
          },
        });

        // Créer la notification dans la même transaction.
        await tx.notification.create({
          data: {
            userId: currentUser.id,
            type: "WITHDRAWAL",
            title: "Demande de retrait envoyée",
            message:
              `Votre demande de retrait de ${formatFCFA(amount)} ` +
              `a été enregistrée. Les frais sont de ` +
              `${formatFCFA(WITHDRAWAL_FEE)} et le montant prévu ` +
              `à recevoir est de ${formatFCFA(netAmount)}. ` +
              `Votre demande est en attente de validation.`,
          },
        });

        return createdWithdrawal;
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Votre demande de retrait a été enregistrée.",
        withdrawal: {
          id: withdrawal.id,
          amount: withdrawal.amount,
          fee: withdrawal.fee,
          netAmount: withdrawal.netAmount,
          network: withdrawal.network,
          phone: withdrawal.phone,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          {
            error:
              "Votre solde disponible est insuffisant pour ce retrait.",
          },
          { status: 400 }
        );
      }

      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json(
          { error: "Utilisateur introuvable." },
          { status: 404 }
        );
      }
    }

    console.error("CREATE_WITHDRAWAL_ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue lors de la création du retrait.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 }
      );
    }

    // Récupérer uniquement les retraits de l'utilisateur connecté.
    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: MAX_WITHDRAWALS_PER_REQUEST,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        amount: true,
        fee: true,
        netAmount: true,
        network: true,
        phone: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        processedAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      withdrawals,
    });
  } catch (error) {
    console.error("GET_WITHDRAWALS_ERROR:", error);

    return NextResponse.json(
      {
        error: "Impossible de récupérer l'historique des retraits.",
      },
      { status: 500 }
    );
  }
}