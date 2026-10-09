import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

const allowedTypes = [
  "DEPOSIT",
  "WITHDRAWAL",
  "REFERRAL_REWARD",
  "INVESTMENT",
  "INVESTMENT_RETURN",
  "DAILY_REWARD",
] as const;

type HistoryType = (typeof allowedTypes)[number];

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const search = (searchParams.get("search") ?? "").trim();
    const typeParam = searchParams.get("type") ?? "ALL";
    const pageParam = Number(searchParams.get("page") ?? "1");

    const page =
      Number.isInteger(pageParam) && pageParam > 0
        ? Math.min(pageParam, 100000)
        : 1;

    const pageSize = 30;

    const type: HistoryType | undefined =
      allowedTypes.includes(typeParam as HistoryType)
        ? (typeParam as HistoryType)
        : undefined;

    const dateFromParam = searchParams.get("from");
    const dateToParam = searchParams.get("to");

    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    if (dateFromParam) {
      dateFrom = new Date(`${dateFromParam}T00:00:00.000Z`);

      if (Number.isNaN(dateFrom.getTime())) {
        return NextResponse.json(
          { error: "Date de début invalide." },
          { status: 400 }
        );
      }
    }

    if (dateToParam) {
      dateTo = new Date(`${dateToParam}T23:59:59.999Z`);

      if (Number.isNaN(dateTo.getTime())) {
        return NextResponse.json(
          { error: "Date de fin invalide." },
          { status: 400 }
        );
      }
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json(
        { error: "La période sélectionnée est invalide." },
        { status: 400 }
      );
    }

    const where: Prisma.TransactionWhereInput = {
      ...(type ? { type } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                user: {
                  is: {
                    username: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                user: {
                  is: {
                    firstName: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                user: {
                  is: {
                    lastName: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                user: {
                  is: {
                    phone: {
                      contains: search,
                    },
                  },
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                referenceId: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const [transactions, total, counts, sums] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: {
          id: true,
          userId: true,
          type: true,
          amount: true,
          referenceId: true,
          description: true,
          createdAt: true,
          user: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({
        by: ["type"],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        totalTransactions: sums._count._all,
        netAmount: sums._sum.amount ?? 0,
        byType: counts.map((item) => ({
          type: item.type,
          count: item._count._all,
          amount: item._sum.amount ?? 0,
        })),
      },
    });
  } catch (error) {
    console.error("ADMIN_HISTORY_GET_ERROR:", error);

    return NextResponse.json(
      { error: "Impossible de charger l'historique." },
      { status: 500 }
    );
  }
}