import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";


const REWARD_AMOUNT = 100;

// Fuseau horaire du Togo
const TIME_ZONE = "Africa/Lome";

function getLocalDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    weekday: values.weekday,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Tu dois être connecté pour recevoir ta récompense." },
        { status: 401 },
      );
    }

    const now = new Date();
    const { date, weekday } = getLocalDateParts(now);
    const isAvailable = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);

    const reward = await prisma.dailyReward.findUnique({
      where: {
        userId_rewardDate: {
          userId: user.id,
          rewardDate: date,
        },
      },
    });

    return NextResponse.json({
      amount: REWARD_AMOUNT,
      available: isAvailable && !reward,
      claimed: Boolean(reward),
      date,
      message: !isAvailable
        ? "La récompense est disponible du lundi au vendredi."
        : reward
          ? "Tu as déjà reçu ta récompense aujourd'hui."
          : "Ta récompense de 100 FCFA est disponible.",
    });
  } catch (error) {
    console.error("Erreur GET daily reward:", error);

    return NextResponse.json(
      { error: "Impossible de vérifier la récompense." },
      { status: 500 },
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Tu dois être connecté pour recevoir ta récompense." },
        { status: 401 },
      );
    }

    // Vérification côté serveur, avec le fuseau horaire du Togo.
    const now = new Date();
    const { date, weekday } = getLocalDateParts(now);
    const isAvailable = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);

    if (!isAvailable) {
      return NextResponse.json(
        {
          error: "La récompense est disponible uniquement du lundi au vendredi.",
        },
        { status: 403 },
      );
    }

    // Une transaction unique garantit que le solde, la récompense,
    // l'historique et la notification sont enregistrés ensemble.
    await prisma.$transaction(async (tx) => {
      await tx.dailyReward.create({
        data: {
          userId: user.id,
          amount: REWARD_AMOUNT,
          rewardDate: date,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          investBalance: {
            increment: REWARD_AMOUNT,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DAILY_REWARD",
          amount: REWARD_AMOUNT,
          description: `Récompense quotidienne du ${date}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Récompense reçue",
          message:
            "100 FCFA ont été ajoutés à ton solde à investir. Reviens demain pour ta prochaine récompense.",
        },
      });
    });

    return NextResponse.json({
      success: true,
      amount: REWARD_AMOUNT,
      message: "Félicitations ! 100 FCFA ont été ajoutés à ton solde à investir.",
    });
  } catch (error) {
    // La contrainte unique empêche également les doubles réceptions
    // lors de clics simultanés ou de requêtes répétées.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "Tu as déjà reçu ta récompense de 100 FCFA aujourd'hui.",
        },
        { status: 409 },
      );
    }

    console.error("Erreur POST daily reward:", error);

    return NextResponse.json(
      { error: "Impossible de créditer ta récompense pour le moment." },
      { status: 500 },
    );
  }
}