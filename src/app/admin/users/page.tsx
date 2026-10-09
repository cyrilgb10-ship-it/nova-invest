"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AdminUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: "USER" | "ADMIN";
  investBalance: number;
  withdrawBalance: number;
  referralCode: string;
  createdAt: string;
  _count: {
    deposits: number;
    withdrawals: number;
    investments: number;
    referredUsers: number;
  };
};

type UserResponse = {
  users: AdminUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalUsers: number;
    totalAdmins: number;
    totalInvestBalance: number;
    totalWithdrawBalance: number;
  };
};

const money = (amount: number) =>
  new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

const date = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function AdminUsersPage() {
  const [data, setData] = useState<UserResponse | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (role !== "ALL") {
        params.set("role", role);
      }

      const response = await fetch(
        `/api/admin/users?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur de chargement.");
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les utilisateurs."
      );
    } finally {
      setLoading(false);
    }
  }, [page, role, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  return (
    <main className="min-h-screen bg-[#06141c] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <Link
              href="/admin"
              className="text-sm text-cyan-300 hover:text-cyan-200"
            >
              ← Administration
            </Link>

            <h1 className="mt-2 text-2xl font-bold">
              Gestion des utilisateurs
            </h1>
          </div>

          <Link
            href="/admin/history"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400/30"
          >
            Historique
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Membres",
              value: data?.stats.totalUsers,
            },
            {
              label: "Administrateurs",
              value: data?.stats.totalAdmins,
            },
            {
              label: "Soldes d'investissement",
              value:
                data === null
                  ? undefined
                  : money(data.stats.totalInvestBalance),
            },
            {
              label: "Soldes de retrait",
              value:
                data === null
                  ? undefined
                  : money(data.stats.totalWithdrawBalance),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="text-sm text-slate-400">
                {item.label}
              </p>

              <p className="mt-3 text-xl font-bold text-cyan-300">
                {item.value === undefined ? "—" : item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher un membre, téléphone, email..."
              className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-cyan-400/40"
            />

            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
              className="h-12 rounded-xl border border-white/10 bg-[#0b202a] px-4 text-sm outline-none focus:border-cyan-400/40"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="USER">Membres</option>
              <option value="ADMIN">Administrateurs</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-white/[0.025] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Utilisateur</th>
                  <th className="px-5 py-4">Téléphone</th>
                  <th className="px-5 py-4">Rôle</th>
                  <th className="px-5 py-4">Solde investissement</th>
                  <th className="px-5 py-4">Solde retrait</th>
                  <th className="px-5 py-4">Activité</th>
                  <th className="px-5 py-4">Inscription</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      Chargement des utilisateurs...
                    </td>
                  </tr>
                )}

                {!loading && data?.users.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}

                {!loading &&
                  data?.users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          @{user.username}
                        </p>
                        {user.email && (
                          <p className="mt-1 text-xs text-slate-500">
                            {user.email}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {user.phone}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.role === "ADMIN"
                              ? "bg-purple-400/10 text-purple-300"
                              : "bg-cyan-400/10 text-cyan-300"
                          }`}
                        >
                          {user.role === "ADMIN"
                            ? "Administrateur"
                            : "Membre"}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {money(user.investBalance)}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {money(user.withdrawBalance)}
                      </td>

                      <td className="px-5 py-4 text-xs leading-6 text-slate-400">
                        <p>Dépôts : {user._count.deposits}</p>
                        <p>Retraits : {user._count.withdrawals}</p>
                        <p>Investissements : {user._count.investments}</p>
                        <p>Filleuls : {user._count.referredUsers}</p>
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {date(user.createdAt)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {data
                ? `${data.pagination.total} résultat(s) · Page ${data.pagination.page} sur ${Math.max(data.pagination.totalPages, 1)}`
                : "Chargement..."}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm disabled:opacity-30"
              >
                Précédent
              </button>

              <button
                type="button"
                disabled={
                  loading ||
                  !data ||
                  page >= data.pagination.totalPages
                }
                onClick={() => setPage((value) => value + 1)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm disabled:opacity-30"
              >
                Suivant
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}