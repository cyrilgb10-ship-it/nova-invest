import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
    }

    const [notifications, unreadCount] =
      await Promise.all([
        prisma.notification.findMany({
          where: {
            userId: user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 30,
        }),

        prisma.notification.count({
          where: {
            userId: user.id,
            read: false,
          },
        }),
      ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error(
      "GET_NOTIFICATIONS_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les notifications.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (body.all === true) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    if (
      typeof body.id !== "string" ||
      body.id.length === 0
    ) {
      return NextResponse.json(
        { error: "Notification invalide." },
        { status: 400 }
      );
    }

    const notification =
      await prisma.notification.findFirst({
        where: {
          id: body.id,
          userId: user.id,
        },
      });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification introuvable." },
        { status: 404 }
      );
    }

    if (!notification.read) {
      await prisma.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          read: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "PATCH_NOTIFICATION_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de mettre à jour la notification.",
      },
      { status: 500 }
    );
  }
}