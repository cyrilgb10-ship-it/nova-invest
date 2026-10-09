import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();

  if (!email) return null;

  return email;
};

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// GET : récupérer les informations du compte connecté
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("PROFILE_GET_ERROR:", error);

    return NextResponse.json(
      { error: "Impossible de récupérer votre profil." },
      { status: 500 }
    );
  }
}

// PATCH : modifier les informations du compte connecté
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const username =
      typeof body.username === "string" ? body.username.trim() : "";

    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";

    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";

    const email = normalizeEmail(body.email);

    if (!username || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis." },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        {
          error:
            "Le nom d'utilisateur doit contenir entre 3 et 30 caractères.",
        },
        { status: 400 }
      );
    }

    if (firstName.length > 60 || lastName.length > 60) {
      return NextResponse.json(
        {
          error: "Le nom et le prénom ne doivent pas dépasser 60 caractères.",
        },
        { status: 400 }
      );
    }

    if (!/^\+?[0-9\s()-]{8,20}$/.test(phone)) {
      return NextResponse.json(
        { error: "Le numéro de téléphone n'est pas valide." },
        { status: 400 }
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: "L'adresse e-mail n'est pas valide." },
        { status: 400 }
      );
    }

    const usernameOwner = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (usernameOwner && usernameOwner.id !== user.id) {
      return NextResponse.json(
        { error: "Ce nom d'utilisateur est déjà utilisé." },
        { status: 409 }
      );
    }

    if (email) {
      const emailOwner = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (emailOwner && emailOwner.id !== user.id) {
        return NextResponse.json(
          { error: "Cette adresse e-mail est déjà utilisée." },
          { status: 409 }
        );
      }
    }

    const phoneOwner = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (phoneOwner && phoneOwner.id !== user.id) {
      return NextResponse.json(
        { error: "Ce numéro de téléphone est déjà utilisé." },
        { status: 409 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        username,
        firstName,
        lastName,
        phone,
        email,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        referralCode: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: "Votre profil a été mis à jour.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("PROFILE_PATCH_ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue lors de la modification du profil.",
      },
      { status: 500 }
    );
  }
}

// PUT : modifier le mot de passe du compte connecté
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vous devez être connecté." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const currentPassword =
      typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Tous les champs du mot de passe sont obligatoires." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          error:
            "Le nouveau mot de passe doit contenir au moins 8 caractères.",
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          error: "Les deux nouveaux mots de passe ne correspondent pas.",
        },
        { status: 400 }
      );
    }

    const passwordIsValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        { error: "Votre mot de passe actuel est incorrect." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      message: "Votre mot de passe a été modifié avec succès.",
    });
  } catch (error) {
    console.error("PROFILE_PASSWORD_ERROR:", error);

    return NextResponse.json(
      { error: "Impossible de modifier votre mot de passe." },
      { status: 500 }
    );
  }
}