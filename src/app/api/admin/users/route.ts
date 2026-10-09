import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

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
    const role = searchParams.get("role");
    const pageParam = Number(searchParams.get("page") ?? "1");

    const page =
      Number.isInteger(pageParam) && pageParam > 0
        ? Math.min(pageParam, 100000)
        : 1;

    const pageSize = 20;

    const where: Prisma.UserWhereInput = {
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { email: { contains: search, mode: "insensitive" } },
              { referralCode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(role === "ADMIN" || role === "USER"
        ? { role }
        : {}),
    };

    const [
      users,
      total,
      totalUsers,
      totalAdmins,
      totalInvestBalance,
      totalWithdrawBalance,
    ] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
          investBalance: true,
          withdrawBalance: true,
          referralCode: true,
          createdAt: true,
          _count: {
            select: {
              deposits: true,
              withdrawals: true,
              investments: true,
              referredUsers: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.aggregate({
        where: { role: "USER" },
        _sum: { investBalance: true },
      }),
      prisma.user.aggregate({
        where: { role: "USER" },
        _sum: { withdrawBalance: true },
      }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        totalUsers,
        totalAdmins,
        totalInvestBalance:
          totalInvestBalance._sum.investBalance ?? 0,
        totalWithdrawBalance:
          totalWithdrawBalance._sum.withdrawBalance ?? 0,
      },
    });
  } catch (error) {
    console.error("ADMIN_USERS_GET_ERROR:", error);

    return NextResponse.json(
      { error: "Impossible de charger les utilisateurs." },
      { status: 500 }
    );
  }
}