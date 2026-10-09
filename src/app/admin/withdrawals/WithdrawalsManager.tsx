"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Withdrawal = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  amount: number;
  fee: number;
  netAmount: number;
  network: string;
  phone: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "REFUSED";
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
  completedAt: string | null;
};

type Mode = "pending" | "processing" | "history";

type Props = {
  mode: Mode;
};

export default function WithdrawalsManager({ mode }: Props) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PAID" | "REFUSED"
  >("ALL");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formatFCFA = (amount: number) =>
    `${amount.toLocaleString("fr-FR")} FCFA`;

  const formatDate = (date: string | null) => {
    if (!date) return "Non disponible";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date indisponible";
    }

    return parsedDate.toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatNetwork = (network: string) => {
    switch (network.toLowerCase()) {
      case "moov":
      case "moov_tg":
        return "Moov Money";

      case "togocel":
      case "togocel_tg":
        return "TMoney";

      default:
        return network;
    }
  };

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (mode === "history") {
        params.set("history", "true");
      }

      const response = await fetch(
        `/api/admin/withdrawals?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de récupérer les retraits."
        );
      }

      setWithdrawals(data.withdrawals ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void loadWithdrawals();
  }, [loadWithdrawals]);

  const filteredWithdrawals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return withdrawals.filter((withdrawal) => {
      let matchesStatus = false;

      if (mode === "pending") {
        matchesStatus = withdrawal.status === "PENDING";
      } else if (mode === "processing") {
        matchesStatus = withdrawal.status === "PROCESSING";
      } else {
        matchesStatus =
          withdrawal.status === "PAID" ||
          withdrawal.status === "REFUSED";

        if (statusFilter !== "ALL") {
          matchesStatus = withdrawal.status === statusFilter;
        }
      }

      const searchableText = [
        withdrawal.id,
        withdrawal.userId,
        withdrawal.firstName,
        withdrawal.lastName,
        withdrawal.phone,
        withdrawal.network,
        withdrawal.amount.toString(),
        withdrawal.fee.toString(),
        withdrawal.netAmount.toString(),
        withdrawal.status,
        withdrawal.rejectionReason ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (!normalizedSearch ||
          searchableText.includes(normalizedSearch))
      );
    });
  }, [withdrawals, search, mode, statusFilter]);

  async function performAction(
    withdrawalId: string,
    action: "PROCESS" | "COMPLETE",
    status?: "PAID" | "REFUSED"
  ) {
    let confirmation = "";

    if (action === "PROCESS") {
      confirmation =
        "Voulez-vous commencer le traitement de cette demande de retrait ?";
    }

    if (status === "PAID") {
      confirmation =
        "Confirmez-vous que le transfert Mobile Money a réellement réussi ?";
    }

    if (status === "REFUSED") {
      confirmation =
        "Confirmez-vous l'échec du transfert ? Le montant demandé sera recrédité au membre.";
    }

    if (!window.confirm(confirmation)) return;

    setBusyId(withdrawalId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          withdrawalId,
          action,
          ...(status ? { status } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de traiter cette demande."
        );
      }

      setSuccess(data.message || "Opération effectuée.");

      await loadWithdrawals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setBusyId(null);
    }
  }

  const isPending = mode === "pending";
  const isProcessing = mode === "processing";
  const isHistory = mode === "history";

  const pageTitle = isPending
    ? "Tous les retraits"
    : isProcessing
      ? "Retraits à finaliser"
      : "Historique des retraits";

  const pageDescription = isPending
    ? "Consultez les demandes reçues et lancez leur traitement."
    : isProcessing
      ? "Finalisez les transferts Mobile Money après vérification."
      : "Consultez les retraits terminés, réussis ou échoués.";

  const pendingCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "PENDING"
  ).length;

  const processingCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "PROCESSING"
  ).length;

  const paidCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "PAID"
  ).length;

  const refusedCount = withdrawals.filter(
    (withdrawal) => withdrawal.status === "REFUSED"
  ).length;

  return (
    <main className="min-h-screen bg-[#080d16] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* En-tête */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="mb-5 inline-flex text-sm text-gray-400 transition hover:text-[#18d5c4]"
          >
            ← Retour au tableau de bord
          </Link>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-[#18d5c4]">
                Nova Invest · Administration
              </p>

              <h1 className="text-3xl font-bold sm:text-4xl">
                {pageTitle}
              </h1>

              <p className="mt-2 text-sm text-gray-400">
                {pageDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadWithdrawals()}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? "Actualisation..." : "↻ Actualiser"}
            </button>
          </div>
        </div>

        {/* Navigation entre les trois sections */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Link
            href="/admin/withdrawals"
            className={`rounded-2xl border p-4 transition ${
              isPending
                ? "border-[#18d5c4]/50 bg-[#18d5c4]/10"
                : "border-white/10 bg-[#101827] hover:border-white/20"
            }`}
          >
            <p className="text-sm text-gray-400">Étape 1</p>
            <p className="mt-1 font-semibold">Demandes reçues</p>
            <p className="mt-1 text-xs text-gray-500">
              {isPending ? "Demandes en attente" : "Gérer les nouvelles demandes"}
            </p>
          </Link>

          <Link
            href="/admin/withdrawals/finalize"
            className={`rounded-2xl border p-4 transition ${
              isProcessing
                ? "border-[#18d5c4]/50 bg-[#18d5c4]/10"
                : "border-white/10 bg-[#101827] hover:border-white/20"
            }`}
          >
            <p className="text-sm text-gray-400">Étape 2</p>
            <p className="mt-1 font-semibold">Retraits à finaliser</p>
            <p className="mt-1 text-xs text-gray-500">
              Confirmer les transferts
            </p>
          </Link>

          <Link
            href="/admin/withdrawals/history"
            className={`rounded-2xl border p-4 transition ${
              isHistory
                ? "border-[#18d5c4]/50 bg-[#18d5c4]/10"
                : "border-white/10 bg-[#101827] hover:border-white/20"
            }`}
          >
            <p className="text-sm text-gray-400">Étape 3</p>
            <p className="mt-1 font-semibold">Historique</p>
            <p className="mt-1 text-xs text-gray-500">
              Retraits terminés
            </p>
          </Link>
        </div>

        {/* Statistiques */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#101827] p-4">
            <p className="text-xs text-gray-400">En attente</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">
              {isHistory ? "—" : pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101827] p-4">
            <p className="text-xs text-gray-400">En traitement</p>
            <p className="mt-2 text-2xl font-bold text-blue-300">
              {isHistory ? "—" : processingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101827] p-4">
            <p className="text-xs text-gray-400">Réussis</p>
            <p className="mt-2 text-2xl font-bold text-[#18d5c4]">
              {isHistory ? paidCount : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101827] p-4">
            <p className="text-xs text-gray-400">Échoués</p>
            <p className="mt-2 text-2xl font-bold text-red-300">
              {isHistory ? refusedCount : "—"}
            </p>
          </div>
        </div>

        {/* Liste */}
        <section className="rounded-2xl border border-white/10 bg-[#101827] p-4 sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">
                {isPending
                  ? "Demandes en attente"
                  : isProcessing
                    ? "Transferts à finaliser"
                    : "Retraits terminés"}
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                {filteredWithdrawals.length} résultat(s)
              </p>
            </div>
          </div>

          {/* Recherche */}
          <div className="mb-6">
            <label
              htmlFor="withdrawal-search"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Rechercher un retrait
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                ⌕
              </span>

              <input
                id="withdrawal-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom, prénom, numéro, référence, montant..."
                className="w-full rounded-xl border border-white/10 bg-[#080d16] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#18d5c4]/60"
              />
            </div>

            {isHistory && (
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { value: "ALL", label: "Tous" },
                  { value: "PAID", label: "Réussis" },
                  { value: "REFUSED", label: "Échoués" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        option.value as "ALL" | "PAID" | "REFUSED"
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                      statusFilter === option.value
                        ? "border-[#18d5c4]/50 bg-[#18d5c4]/10 text-[#18d5c4]"
                        : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-2 text-xs text-[#18d5c4] hover:underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-[#18d5c4]/20 bg-[#18d5c4]/10 p-4 text-sm text-[#18d5c4]"
            >
              {success}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Chargement des retraits...
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-14 text-center">
              <p className="text-base font-medium text-gray-300">
                {search
                  ? "Aucun résultat trouvé."
                  : isHistory
                    ? "Aucun retrait terminé pour le moment."
                    : isPending
                      ? "Aucune demande en attente."
                      : "Aucun retrait à finaliser."}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                {search
                  ? "Essayez un autre nom, numéro ou identifiant."
                  : "Les nouvelles données apparaîtront ici automatiquement après actualisation."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWithdrawals.map((withdrawal) => {
                const isPaid = withdrawal.status === "PAID";
                const isRefused = withdrawal.status === "REFUSED";

                return (
                  <article
                    key={withdrawal.id}
                    className="rounded-xl border border-white/10 bg-[#080d16] p-4 sm:p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row">
                      {/* Informations du bénéficiaire */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {withdrawal.firstName} {withdrawal.lastName}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              withdrawal.status === "PENDING"
                                ? "bg-amber-400/10 text-amber-300"
                                : withdrawal.status === "PROCESSING"
                                  ? "bg-blue-400/10 text-blue-300"
                                  : isPaid
                                    ? "bg-[#18d5c4]/10 text-[#18d5c4]"
                                    : "bg-red-400/10 text-red-300"
                            }`}
                          >
                            {withdrawal.status === "PENDING"
                              ? "En attente"
                              : withdrawal.status === "PROCESSING"
                                ? "En traitement"
                                : isPaid
                                  ? "Réussi"
                                  : "Échoué"}
                          </span>
                        </div>

                        <p className="mt-2 break-all text-xs text-gray-500">
                          Référence : {withdrawal.id}
                        </p>

                        <p className="mt-2 break-all text-xs text-gray-500">
                          ID membre : {withdrawal.userId}
                        </p>

                        <p className="mt-4 text-sm text-gray-300">
                          Réseau :{" "}
                          <span className="font-medium text-white">
                            {formatNetwork(withdrawal.network)}
                          </span>
                        </p>

                        <p className="mt-2 text-sm text-gray-300">
                          Numéro bénéficiaire :{" "}
                          <span className="font-medium text-white">
                            {withdrawal.phone}
                          </span>
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          Demande : {formatDate(withdrawal.createdAt)}
                        </p>

                        {withdrawal.processedAt && (
                          <p className="mt-2 text-xs text-gray-500">
                            Traitement commencé :{" "}
                            {formatDate(withdrawal.processedAt)}
                          </p>
                        )}

                        {withdrawal.completedAt && (
                          <p className="mt-2 text-xs text-gray-500">
                            Finalisé le :{" "}
                            {formatDate(withdrawal.completedAt)}
                          </p>
                        )}

                        {isRefused && withdrawal.rejectionReason && (
                          <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                            Motif : {withdrawal.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Montants */}
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 lg:min-w-64">
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-gray-400">
                            Montant demandé
                          </span>
                          <span className="font-medium">
                            {formatFCFA(withdrawal.amount)}
                          </span>
                        </div>

                        <div className="mt-3 flex justify-between gap-4 text-sm">
                          <span className="text-gray-400">Frais</span>
                          <span>{formatFCFA(withdrawal.fee)}</span>
                        </div>

                        <div className="mt-3 border-t border-white/10 pt-3">
                          <p className="text-xs text-gray-400">
                            Montant net prévu
                          </p>

                          <p className="mt-1 text-xl font-bold text-[#18d5c4]">
                            {formatFCFA(withdrawal.netAmount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions réservées aux retraits non terminés */}
                    {!isHistory && (
                      <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() =>
                              void performAction(withdrawal.id, "PROCESS")
                            }
                            disabled={busyId === withdrawal.id}
                            className="rounded-xl bg-[#18d5c4] px-5 py-3 text-sm font-bold text-[#07111a] transition hover:bg-[#52eadb] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyId === withdrawal.id
                              ? "Traitement..."
                              : "Traiter la demande →"}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void performAction(
                                  withdrawal.id,
                                  "COMPLETE",
                                  "REFUSED"
                                )
                              }
                              disabled={busyId === withdrawal.id}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Échec du retrait
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void performAction(
                                  withdrawal.id,
                                  "COMPLETE",
                                  "PAID"
                                )
                              }
                              disabled={busyId === withdrawal.id}
                              className="rounded-xl bg-[#18d5c4] px-5 py-3 text-sm font-bold text-[#07111a] transition hover:bg-[#52eadb] disabled:opacity-50"
                            >
                              Retrait réussi ✓
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
