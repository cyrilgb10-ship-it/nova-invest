import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

function generateReferralCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 8; i++) {
    code += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return `NOVA-${code}`;
}

async function createUniqueReferralCode() {
  let referralCode = generateReferralCode();

  while (
    await prisma.user.findUnique({
      where: {
        referralCode,
      },
    })
  ) {
    referralCode = generateReferralCode();
  }

  return referralCode;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : "";

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const referralCode =
      typeof body.referralCode === "string"
        ? body.referralCode.trim()
        : "";

    // Validation
    if (
      !username ||
      !lastName ||
      !firstName ||
      !phone ||
      !password
    ) {
      return NextResponse.json(
        {
          error: "Veuillez remplir tous les champs obligatoires.",
        },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        {
          error: "Le pseudo doit contenir au moins 3 caractères.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Le mot de passe doit contenir au moins 6 caractères.",
        },
        { status: 400 }
      );
    }

    // Vérification du pseudo
    const existingUsername = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (existingUsername) {
      return NextResponse.json(
        {
          error: "Ce pseudo est déjà utilisé.",
        },
        { status: 409 }
      );
    }

    // Vérification du numéro
    const existingPhone = await prisma.user.findUnique({
      where: {
        phone,
      },
    });

    if (existingPhone) {
      return NextResponse.json(
        {
          error: "Ce numéro est déjà associé à un compte.",
        },
        { status: 409 }
      );
    }

    // Recherche du parrain
    let referrer = null;

    if (referralCode) {
      referrer = await prisma.user.findUnique({
        where: {
          referralCode,
        },
        select: {
          id: true,
          referralCode: true,
        },
      });

      if (!referrer) {
        return NextResponse.json(
          {
            error: "Le code de parrainage est invalide.",
          },
          { status: 400 }
        );
      }
    }

    // Sécurité : hash du mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Génération du code personnel
    const userReferralCode =
      await createUniqueReferralCode();

    // Création du compte + parrainage dans une transaction
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username,
          firstName,
          lastName,
          phone,
          passwordHash,
          referralCode: userReferralCode,
          referredById: referrer?.id ?? null,
        },
      });

      if (referrer) {
        await tx.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: createdUser.id,
            rewardAmount: 500,
            rewardGiven: false,
          },
        });
      }

      return createdUser;
    });

    // Connexion automatique
    const response = NextResponse.json({
      success: true,
      message: "Compte créé avec succès.",
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        referralCode: user.referralCode,
      },
    });

    response.cookies.set("nova_invest_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("REGISTER_ERROR:", error);

    return NextResponse.json(
      {
        error: "Une erreur interne est survenue.",
      },
      { status: 500 }
    );
  }
}
