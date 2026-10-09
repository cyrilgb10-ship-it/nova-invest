"use client";

import { useCallback, useEffect, useState } from "react";

type RewardStatus = {
  amount: number;
  available: boolean;
  claimed: boolean;
  date: string;
  message: string;
};

export default function DailyRewardCard() {
  const [status, setStatus] = useState<RewardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/daily-reward", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de vérifier la récompense.");
      }

      setStatus(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function claimReward() {
    if (claiming || !status?.available) return;

    setClaiming(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/daily-reward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de recevoir la récompense.");
      }

      setSuccess(data.message);
      await loadStatus();

      // Actualise les données du dashboard, dont le solde à investir.
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );

      await loadStatus();
    } finally {
      setClaiming(false);
    }
  }

  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl border border-[#18d5c4]/20 bg-gradient-to-br from-[#0d2835] via-[#09202d] to-[#071721] p-6 shadow-xl shadow-black/10 sm:p-7">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#18d5c4]/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#18d5c4]/20 bg-[#18d5c4]/10 text-3xl">
            🎁
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#18d5c4]">
              Bonus quotidien
            </p>

            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              Reçois 100 FCFA
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
              Récupère ta récompense quotidienne et elle sera ajoutée
              directement à ton solde à investir.
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Disponible du lundi au vendredi · Une fois par jour
            </p>
          </div>
        </div>

        <div className="shrink-0 sm:min-w-44">
          <button
            type="button"
            onClick={claimReward}
            disabled={loading || claiming || !status?.available}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#18d5c4] px-5 py-3 font-bold text-[#041018] transition hover:bg-[#25e4d3] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {loading
              ? "Vérification..."
              : claiming
                ? "Réception..."
                : status?.claimed
                  ? "Déjà reçu ✓"
                  : status?.available
                    ? "Recevoir 100 FCFA"
                    : "Indisponible"}
          </button>

          {status && (
            <p className="mt-2 text-center text-xs text-slate-400">
              {status.message}
            </p>
          )}
        </div>
      </div>

      {success && (
        <div
          role="status"
          className="relative mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
        >
          {success}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="relative mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}
    </section>
  );
}