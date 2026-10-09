import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const identifier =
      typeof body.identifier === "string"
        ? body.identifier.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!identifier || !password) {
      return NextResponse.json(
        {
          error: "Veuillez renseigner votre identifiant et votre mot de passe.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { phone: identifier },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Identifiants administrateur incorrects.",
        },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          error: "Identifiants administrateur incorrects.",
        },
        { status: 401 }
      );
    }

    // Seuls les administrateurs peuvent se connecter ici.
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Accès refusé. Ce compte n'est pas administrateur.",
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Connexion administrateur réussie.",
      redirectTo: "/admin",
    });

    response.cookies.set("nova_invest_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("ADMIN_LOGIN_ERROR:", error);

    return NextResponse.json(
      {
        error: "Une erreur interne est survenue.",
      },
      { status: 500 }
    );
  }
}