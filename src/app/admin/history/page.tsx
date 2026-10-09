"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type TransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "REFERRAL_REWARD"
  | "INVESTMENT"
  | "INVESTMENT_RETURN"
  | "DAILY_REWARD";

type HistoryTransaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
  user: {
    username: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
};

type HistoryResponse = {
  transactions: HistoryTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalTransactions: number;
    netAmount: number;
    byType: {
      type: TransactionType;
      count: number;
      amount: number;
    }[];
  };
};

const typeLabels: Record<TransactionType, string> = {
  DEPOSIT: "Dépôt",
  WITHDRAWAL: "Retrait",
  REFERRAL_REWARD: "Prime de parrainage",
  INVESTMENT: "Investissement",
  INVESTMENT_RETURN: "Retour d'investissement",
  DAILY_REWARD: "Récompense quotidienne",
};

const money = (amount: number) =>
  new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

const date = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminHistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
      });

      if (search.trim()) params.set("search", search.trim());
      if (type !== "ALL") params.set("type", type);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(
        `/api/admin/history?${params.toString()}`,
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
          : "Impossible de charger l'historique."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, type, from, to]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHistory();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadHistory]);

  function resetFilters() {
    setSearch("");
    setType("ALL");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-[#06141c] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <Link
              href="/admin"
              className="text-sm text-cyan-300 hover:text-cyan-200"
            >
              ← Administration
            </Link>

            <h1 className="mt-2 text-2xl font-bold">
              Historique global
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Consultez les opérations enregistrées sur la plateforme.
            </p>
          </div>

          <Link
            href="/admin/users"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400/30"
          >
            Utilisateurs
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">
              Opérations correspondant aux filtres
            </p>

            <p className="mt-3 text-2xl font-bold text-cyan-300">
              {data?.stats.totalTransactions ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">
              Somme nette des montants affichés par l'API
            </p>

            <p className="mt-3 text-2xl font-bold">
              {data ? money(data.stats.netAmount) : "—"}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Cette somme additionne les montants signés des transactions.
              Elle ne représente pas nécessairement le chiffre d'affaires.
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Membre, téléphone, référence..."
              className="h-12 min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-cyan-400/40"
            />

            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
              className="h-12 rounded-xl border border-white/10 bg-[#0b202a] px-4 text-sm outline-none focus:border-cyan-400/40"
            >
              <option value="ALL">Tous les types</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <input
              type="date"
              aria-label="Date de début"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className="h-12 rounded-xl border border-white/10 bg-[#0b202a] px-4 text-sm outline-none focus:border-cyan-400/40"
            />

            <input
              type="date"
              aria-label="Date de fin"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className="h-12 rounded-xl border border-white/10 bg-[#0b202a] px-4 text-sm outline-none focus:border-cyan-400/40"
            />
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 text-sm font-medium text-cyan-300 hover:text-cyan-200"
          >
            Réinitialiser les filtres
          </button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/[0.025] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Opération</th>
                  <th className="px-5 py-4">Utilisateur</th>
                  <th className="px-5 py-4">Montant</th>
                  <th className="px-5 py-4">Référence</th>
                  <th className="px-5 py-4">Description</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      Chargement de l'historique...
                    </td>
                  </tr>
                )}

                {!loading && data?.transactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      Aucune opération trouvée pour ces critères.
                    </td>
                  </tr>
                )}

                {!loading &&
                  data?.transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold">
                          {typeLabels[transaction.type]}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {transaction.user.firstName}{" "}
                          {transaction.user.lastName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          @{transaction.user.username}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {transaction.user.phone}
                        </p>
                      </td>

                      <td
                        className={`px-5 py-4 font-bold ${
                          transaction.amount < 0
                            ? "text-red-300"
                            : transaction.amount > 0
                              ? "text-emerald-300"
                              : "text-slate-300"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {money(transaction.amount)}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">
                        {transaction.referenceId || "—"}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-slate-400">
                        {transaction.description || "—"}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-slate-400">
                        {date(transaction.createdAt)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {data
                ? `${data.pagination.total} opération(s) · Page ${data.pagination.page} sur ${Math.max(data.pagination.totalPages, 1)}`
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