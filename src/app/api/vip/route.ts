import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// =====================================================
// CONFIGURATION VIP
// =====================================================

const TIME_ZONE = "Africa/Lome";
const SALARY_AMOUNT = 2000;

const VIP_LEVELS = {
  1: {
    level: 1,
    name: "VIP 1",
    referralsRequired: 5,
    personalInvestmentRequired: 20000,
    referralInvestmentRequired: 50000,
    salaryAmount: SALARY_AMOUNT,
    salaryDays: 7,
  },
  2: {
    level: 2,
    name: "VIP 2",
    referralsRequired: 9,
    personalInvestmentRequired: 40000,
    referralInvestmentRequired: 100000,
    salaryAmount: SALARY_AMOUNT,
    salaryDays: 20,
  },
  3: {
    level: 3,
    name: "VIP 3",
    referralsRequired: 15,
    personalInvestmentRequired: 70000,
    referralInvestmentRequired: 235000,
    salaryAmount: SALARY_AMOUNT,
    salaryDays: 60,
  },
} as const;

type VipLevel = 1 | 2 | 3;

function isVipLevel(value: unknown): value is VipLevel {
  return value === 1 || value === 2 || value === 3;
}

// =====================================================
// DATE DU TOGO
// =====================================================

function getTogoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getDayDifference(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

// =====================================================
// CALCUL DE L'ÉLIGIBILITÉ
// =====================================================

async function getVipMetrics(userId: string) {
  const directReferrals = await prisma.user.findMany({
    where: {
      referredById: userId,
    },
    select: {
      id: true,
    },
  });

  const referralIds = directReferrals.map((user) => user.id);

  const [personalInvestments, referralInvestments] = await Promise.all([
    prisma.investment.aggregate({
      where: {
        userId,
      },
      _sum: {
        amountInvested: true,
      },
    }),

    referralIds.length > 0
      ? prisma.investment.aggregate({
          where: {
            userId: {
              in: referralIds,
            },
          },
          _sum: {
            amountInvested: true,
          },
        })
      : Promise.resolve({
          _sum: {
            amountInvested: null,
          },
        }),
  ]);

  return {
    directReferrals: directReferrals.length,
    personalInvestment: personalInvestments._sum.amountInvested ?? 0,
    referralInvestment: referralInvestments._sum.amountInvested ?? 0,
  };
}

function isEligible(
  metrics: {
    directReferrals: number;
    personalInvestment: number;
    referralInvestment: number;
  },
  level: VipLevel,
) {
  const requirements = VIP_LEVELS[level];

  return (
    metrics.directReferrals >= requirements.referralsRequired &&
    metrics.personalInvestment >=
      requirements.personalInvestmentRequired &&
    metrics.referralInvestment >=
      requirements.referralInvestmentRequired
  );
}

// =====================================================
// GET : ÉTAT DU SYSTÈME VIP
// =====================================================

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Tu dois être connecté pour accéder au programme VIP." },
        { status: 401 },
      );
    }

    const [metrics, activations] = await Promise.all([
      getVipMetrics(user.id),

      prisma.vipActivation.findMany({
        where: {
          userId: user.id,
        },
        include: {
          payments: {
            orderBy: {
              paymentDay: "asc",
            },
          },
        },
        orderBy: {
          level: "asc",
        },
      }),
    ]);

    const now = new Date();
    const today = getTogoDate(now);

    const levels = ([1, 2, 3] as const).map((level) => {
      const config = VIP_LEVELS[level];

      const activation = activations.find(
        (item) => item.level === level,
      );

      const activationDate = activation
        ? getTogoDate(activation.activatedAt)
        : null;

      const dayNumber = activationDate
        ? getDayDifference(activationDate, today)
        : 0;

      const claimedToday = Boolean(
        activation?.payments.some(
          (payment) => payment.paymentDay === dayNumber,
        ),
      );

      const salaryAvailable = Boolean(
        activation &&
          dayNumber >= 1 &&
          dayNumber <= activation.salaryDays &&
          !claimedToday,
      );

      const nextLevel = user.vipLevel + 1;

      return {
        ...config,
        activated: Boolean(activation),
        activatedAt: activation?.activatedAt ?? null,
        salaryDaysClaimed: activation?.payments.length ?? 0,
        totalSalaryPaid:
          activation?.payments.reduce(
            (total, payment) => total + payment.amount,
            0,
          ) ?? 0,
        salaryAvailable,
        claimedToday,
        currentSalaryDay:
          activation && dayNumber >= 1 && dayNumber <= activation.salaryDays
            ? dayNumber
            : null,
        canActivate:
          !activation &&
          level === nextLevel &&
          isEligible(metrics, level),
        isNextLevel: level === nextLevel,
      };
    });

    return NextResponse.json({
      success: true,
      currentLevel: user.vipLevel,
      metrics,
      levels,
      today,
    });
  } catch (error) {
    console.error("GET VIP ERROR:", error);

    return NextResponse.json(
      { error: "Impossible de charger les informations VIP." },
      { status: 500 },
    );
  }
}

// =====================================================
// POST : ACTIVER UN VIP OU RECEVOIR UN SALAIRE
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Tu dois être connecté pour continuer." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      !isVipLevel(body.level) ||
      !["activate", "claim"].includes(body.action)
    ) {
      return NextResponse.json(
        { error: "La demande est invalide." },
        { status: 400 },
      );
    }

    const level: VipLevel = body.level;
    const action = body.action;

    // -------------------------------------------------
    // ACTIVATION D'UN NIVEAU
    // -------------------------------------------------

    if (action === "activate") {
      const result = await prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: {
            id: user.id,
          },
          select: {
            id: true,
            vipLevel: true,
          },
        });

        if (!currentUser) {
          throw new Error("USER_NOT_FOUND");
        }

        if (currentUser.vipLevel !== level - 1) {
          throw new Error("VIP_SEQUENCE_INVALID");
        }

        const config = VIP_LEVELS[level];

        const referrals = await tx.user.findMany({
          where: {
            referredById: user.id,
          },
          select: {
            id: true,
          },
        });

        const referralIds = referrals.map((item) => item.id);

        const [personalInvestments, referralInvestments] =
          await Promise.all([
            tx.investment.aggregate({
              where: {
                userId: user.id,
              },
              _sum: {
                amountInvested: true,
              },
            }),

            referralIds.length > 0
              ? tx.investment.aggregate({
                  where: {
                    userId: {
                      in: referralIds,
                    },
                  },
                  _sum: {
                    amountInvested: true,
                  },
                })
              : Promise.resolve({
                  _sum: {
                    amountInvested: null,
                  },
                }),
          ]);

        const metrics = {
          directReferrals: referrals.length,
          personalInvestment:
            personalInvestments._sum.amountInvested ?? 0,
          referralInvestment:
            referralInvestments._sum.amountInvested ?? 0,
        };

        if (!isEligible(metrics, level)) {
          throw new Error("VIP_REQUIREMENTS_NOT_MET");
        }

        // La contrainte unique [userId, level] empêche
        // une deuxième activation du même niveau.
        const activation = await tx.vipActivation.create({
          data: {
            userId: user.id,
            level,
            salaryDays: config.salaryDays,
            salaryAmount: config.salaryAmount,
          },
        });

        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            vipLevel: level,
            vipActivatedAt: activation.activatedAt,
          },
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            type: "SYSTEM",
            title: `${config.name} activé`,
            message:
              `Félicitations ! Ton niveau ${config.name} est activé. ` +
              "Ton salaire quotidien sera disponible à partir de demain.",
          },
        });

        return {
          level,
          name: config.name,
          activatedAt: activation.activatedAt,
        };
      });

      return NextResponse.json({
        success: true,
        message:
          `${result.name} activé avec succès ! ` +
          "Tu pourras recevoir ton premier salaire à partir de demain.",
        activation: result,
      });
    }

    // -------------------------------------------------
    // RÉCLAMATION DU SALAIRE QUOTIDIEN
    // -------------------------------------------------

    const result = await prisma.$transaction(async (tx) => {
      const activation = await tx.vipActivation.findUnique({
        where: {
          userId_level: {
            userId: user.id,
            level,
          },
        },
      });

      if (!activation) {
        throw new Error("VIP_NOT_ACTIVATED");
      }

      const today = getTogoDate(new Date());
      const activationDate = getTogoDate(activation.activatedAt);

      const paymentDay = getDayDifference(activationDate, today);

      if (paymentDay < 1 || paymentDay > activation.salaryDays) {
        throw new Error("VIP_SALARY_NOT_AVAILABLE");
      }

      const payment = await tx.vipSalaryPayment.create({
        data: {
          activationId: activation.id,
          paymentDay,
          amount: activation.salaryAmount,
        },
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          withdrawBalance: {
            increment: activation.salaryAmount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "VIP_SALARY",
          amount: activation.salaryAmount,
          referenceId: payment.id,
          description:
            `Salaire quotidien ${VIP_LEVELS[level].name} ` +
            `— jour ${paymentDay}/${activation.salaryDays}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Salaire VIP reçu",
          message:
            `${activation.salaryAmount.toLocaleString("fr-FR")} FCFA ` +
            `ont été ajoutés à ton solde à retirer pour ${VIP_LEVELS[level].name}.`,
        },
      });

      return {
        amount: activation.salaryAmount,
        level,
        paymentDay,
        salaryDays: activation.salaryDays,
      };
    });

    return NextResponse.json({
      success: true,
      amount: result.amount,
      message:
        `${result.amount.toLocaleString("fr-FR")} FCFA ont été ajoutés ` +
        `à ton solde à retirer. Jour ${result.paymentDay}/${result.salaryDays}.`,
    });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, { status: number; message: string }> = {
        USER_NOT_FOUND: {
          status: 404,
          message: "Utilisateur introuvable.",
        },
        VIP_SEQUENCE_INVALID: {
          status: 409,
          message: "Tu dois activer les niveaux VIP dans l'ordre.",
        },
        VIP_REQUIREMENTS_NOT_MET: {
          status: 403,
          message: "Tu ne remplis pas encore toutes les conditions de ce niveau VIP.",
        },
        VIP_NOT_ACTIVATED: {
          status: 403,
          message: "Tu dois d'abord activer ce niveau VIP.",
        },
        VIP_SALARY_NOT_AVAILABLE: {
          status: 403,
          message: "Le salaire de ce niveau n'est pas disponible aujourd'hui.",
        },
      };

      const knownError = messages[error.message];

      if (knownError) {
        return NextResponse.json(
          { error: knownError.message },
          { status: knownError.status },
        );
      }
    }

    // Une contrainte unique empêche le double paiement
    // d'un même jour pour la même activation.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "Le salaire de ce niveau a déjà été réclamé pour aujourd'hui.",
        },
        { status: 409 },
      );
    }

    // Les transactions concurrentes peuvent être annulées
    // par PostgreSQL. Le client peut alors recharger le statut.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error: "Une opération est déjà en cours. Actualise la page puis réessaie.",
        },
        { status: 409 },
      );
    }

    console.error("POST VIP ERROR:", error);

    return NextResponse.json(
      { error: "Impossible de traiter cette opération VIP pour le moment." },
      { status: 500 },
    );
  }
}