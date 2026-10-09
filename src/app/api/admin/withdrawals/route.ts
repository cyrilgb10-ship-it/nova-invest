import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

function formatFCFA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function formatNetwork(network: string): string {
  switch (network.toLowerCase()) {
    case "moov":
    case "moov_tg":
      return "Moov Money";

    case "togocel":
    case "togocel_tg":
      return "TMoney";

    default:
      return network;
  }
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Accès réservé aux administrateurs." },
    { status: 403 }
  );
}

function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * GET
 *
 * Récupère les retraits actifs ou l'historique des retraits.
 *
 * Exemples :
 * /api/admin/withdrawals
 * /api/admin/withdrawals?search=228
 * /api/admin/withdrawals?history=true
 * /api/admin/withdrawals?history=true&status=PAID
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);

    const history = searchParams.get("history") === "true";
    const search = searchParams.get("search")?.trim() ?? "";
    const requestedStatus = searchParams.get("status")?.trim().toUpperCase();

    const allowedStatuses = [
      "PENDING",
      "PROCESSING",
      "PAID",
      "REFUSED",
    ] as const;

    if (
      requestedStatus &&
      !allowedStatuses.includes(
        requestedStatus as (typeof allowedStatuses)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Statut de retrait invalide." },
        { status: 400 }
      );
    }

    const where: Prisma.WithdrawalWhereInput = {};

    if (history) {
      if (requestedStatus) {
        where.status = requestedStatus as
          (typeof allowedStatuses)[number];
      } else {
        where.status = {
          in: ["PAID", "REFUSED"],
        };
      }
    } else {
      where.status = {
        in: ["PENDING", "PROCESSING"],
      };
    }

    if (search) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
          },
        },
        {
          id: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          userId: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where,
      orderBy: {
        createdAt: history ? "desc" : "asc",
      },
      take: 200,
      select: {
        id: true,
        userId: true,
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
    console.error("ADMIN_GET_WITHDRAWALS_ERROR:", error);

    return serverError("Impossible de récupérer les retraits.");
  }
}

/**
 * POST
 *
 * Actions autorisées :
 *
 * PROCESS :
 * PENDING -> PROCESSING
 *
 * COMPLETE + PAID :
 * PROCESSING -> PAID
 *
 * COMPLETE + REFUSED :
 * PROCESSING -> REFUSED
 * Le montant demandé est alors remboursé sur le solde à retirer.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    let body: {
      withdrawalId?: unknown;
      action?: unknown;
      status?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Les données envoyées sont invalides." },
        { status: 400 }
      );
    }

    const withdrawalId =
      typeof body.withdrawalId === "string"
        ? body.withdrawalId.trim()
        : "";

    const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase()
        : "";

    const requestedStatus =
      typeof body.status === "string"
        ? body.status.trim().toUpperCase()
        : "";

    if (!withdrawalId) {
      return NextResponse.json(
        { error: "Identifiant de retrait invalide." },
        { status: 400 }
      );
    }

    /**
     * ÉTAPE 1 : passer le retrait en cours de traitement.
     */
    if (action === "PROCESS") {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.withdrawal.updateMany({
          where: {
            id: withdrawalId,
            status: "PENDING",
          },
          data: {
            status: "PROCESSING",
            processedAt: new Date(),
          },
        });

        if (updated.count !== 1) {
          throw new Error("WITHDRAWAL_NOT_PENDING");
        }

        const withdrawal = await tx.withdrawal.findUnique({
          where: {
            id: withdrawalId,
          },
          select: {
            id: true,
            userId: true,
            amount: true,
            fee: true,
            netAmount: true,
            network: true,
            phone: true,
          },
        });

        if (!withdrawal) {
          throw new Error("WITHDRAWAL_NOT_FOUND");
        }

        await tx.notification.create({
          data: {
            userId: withdrawal.userId,
            type: "WITHDRAWAL",
            title: "Retrait en cours de traitement",
            message:
              `Votre demande de retrait de ${formatFCFA(withdrawal.amount)} ` +
              "est maintenant en cours de traitement. " +
              `Réseau : ${formatNetwork(withdrawal.network)}. ` +
              `Numéro bénéficiaire : ${withdrawal.phone}. ` +
              `Frais : ${formatFCFA(withdrawal.fee)}. ` +
              `Montant net prévu : ${formatFCFA(withdrawal.netAmount)}. ` +
              "Vous recevrez une notification lorsque le traitement sera terminé.",
          },
        });

        return {
          id: withdrawal.id,
        };
      });

      return NextResponse.json({
        success: true,
        message: "La demande est maintenant en cours de traitement.",
        withdrawalId: result.id,
      });
    }

    /**
     * ÉTAPE 2 : terminer le retrait.
     */
    if (action === "COMPLETE") {
      if (!["PAID", "REFUSED"].includes(requestedStatus)) {
        return NextResponse.json(
          {
            error: "Le statut final doit être PAID ou REFUSED.",
          },
          { status: 400 }
        );
      }

      const finalStatus = requestedStatus as "PAID" | "REFUSED";

      const result = await prisma.$transaction(async (tx) => {
        const withdrawal = await tx.withdrawal.findUnique({
          where: {
            id: withdrawalId,
          },
         select: {
            id: true,
            userId: true,
            amount: true,
            fee: true,
            netAmount: true,
            network: true,
            phone: true,
         },
        });

        if (!withdrawal) {
          throw new Error("WITHDRAWAL_NOT_FOUND");
        }

        /**
         * La condition PROCESSING empêche de finaliser deux fois
         * la même demande et évite un double remboursement.
         */
        const updated = await tx.withdrawal.updateMany({
          where: {
            id: withdrawalId,
            status: "PROCESSING",
          },
          data: {
            status: finalStatus,
            completedAt: new Date(),
            rejectionReason:
              finalStatus === "REFUSED"
                ? "Transfert Mobile Money échoué"
                : null,
          },
        });

        if (updated.count !== 1) {
          throw new Error("WITHDRAWAL_NOT_PROCESSING");
        }

        /**
         * CAS 1 : le transfert a échoué.
         * Le montant initial est restitué au solde à retirer.
         */
        if (finalStatus === "REFUSED") {
          await tx.user.update({
            where: {
              id: withdrawal.userId,
            },
            data: {
              withdrawBalance: {
                increment: withdrawal.amount,
              },
            },
          });

          await tx.transaction.create({
            data: {
              userId: withdrawal.userId,
              type: "WITHDRAWAL",
              amount: withdrawal.amount,
              referenceId: withdrawal.id,
              description: "Remboursement d'un retrait échoué",
            },
          });

          await tx.notification.create({
            data: {
              userId: withdrawal.userId,
              type: "WITHDRAWAL",
              title: "Retrait échoué : montant remboursé",
              message:
                `Le transfert de ${formatFCFA(withdrawal.amount)} ` +
                `vers le numéro ${withdrawal.phone} via ` +
                `${formatNetwork(withdrawal.network)} a échoué. ` +
                `${formatFCFA(withdrawal.amount)} ont été recrédités ` +
                "sur votre solde à retirer. " +
                `Les frais prévus étaient de ${formatFCFA(withdrawal.fee)}. ` +
                "Vous pouvez vérifier votre solde avant d'effectuer une nouvelle demande.",
            },
          });
        } else {
          /**
           * CAS 2 : le retrait a été effectué avec succès.
           *
           * On ne crée pas de transaction supplémentaire à zéro FCFA.
           */
          await tx.notification.create({
            data: {
              userId: withdrawal.userId,
              type: "WITHDRAWAL",
              title: "Retrait effectué avec succès",
              message:
                `Votre retrait de ${formatFCFA(withdrawal.amount)} ` +
                "a été marqué comme effectué. " +
                `Montant envoyé : ${formatFCFA(withdrawal.netAmount)}. ` +
                `Réseau : ${formatNetwork(withdrawal.network)}. ` +
                `Numéro bénéficiaire : ${withdrawal.phone}. ` +
                `Frais appliqués : ${formatFCFA(withdrawal.fee)}. ` +
                "Merci d'utiliser Nova Invest.",
            },
          });
        }

        return {
          id: withdrawal.id,
          status: finalStatus,
        };
      });

      return NextResponse.json({
        success: true,
        message:
          result.status === "PAID"
            ? "Le retrait a été marqué comme réussi."
            : "Le retrait a échoué et le montant a été remboursé.",
        withdrawalId: result.id,
        status: result.status,
      });
    }

    return NextResponse.json(
      { error: "Action non reconnue." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "WITHDRAWAL_NOT_FOUND") {
        return NextResponse.json(
          { error: "Retrait introuvable." },
          { status: 404 }
        );
      }

      if (error.message === "WITHDRAWAL_NOT_PENDING") {
        return NextResponse.json(
          {
            error:
              "Cette demande n'est plus en attente. Actualisez la liste.",
          },
          { status: 409 }
        );
      }

      if (error.message === "WITHDRAWAL_NOT_PROCESSING") {
        return NextResponse.json(
          {
            error:
              "Ce retrait n'est plus en cours de traitement. Actualisez la liste.",
          },
          { status: 409 }
        );
      }
    }

    console.error("ADMIN_WITHDRAWAL_ACTION_ERROR:", error);

    return serverError(
      "Une erreur est survenue lors du traitement du retrait."
    );
  }
}
