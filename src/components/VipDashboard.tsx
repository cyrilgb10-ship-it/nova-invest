"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type VipMetrics = {
  directReferrals: number;
  personalInvestment: number;
  referralInvestment: number;
};

type VipLevel = {
  level: number;
  name: string;
  referralsRequired: number;
  personalInvestmentRequired: number;
  referralInvestmentRequired: number;
  salaryAmount: number;
  salaryDays: number;
  activated: boolean;
  activatedAt: string | null;
  salaryDaysClaimed: number;
  totalSalaryPaid: number;
  salaryAvailable: boolean;
  claimedToday: boolean;
  currentSalaryDay: number | null;
  canActivate: boolean;
  isNextLevel: boolean;
};

type VipData = {
  success: boolean;
  currentLevel: number;
  metrics: VipMetrics;
  levels: VipLevel[];
  today: string;
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function formatDate(date: string | null) {
  if (!date) return "Non activé";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Africa/Lome",
  }).format(new Date(date));
}

function Progress({
  current,
  required,
}: {
  current: number;
  required: number;
}) {
  const percentage =
    required > 0 ? Math.min(100, (current / required) * 100) : 0;

  return (
    <div className="mt-2">
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#18d5c4] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-1 text-right text-xs text-slate-500">
        {formatAmount(current)} / {formatAmount(required)} FCFA
      </p>
    </div>
  );
}

export default function VipDashboard() {
  const [data, setData] = useState<VipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmLevel, setConfirmLevel] = useState<number | null>(null);

  const loadVipData = useCallback(async () => {
    try {
      const response = await fetch("/api/vip", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Impossible de charger les informations VIP.",
        );
      }

      setData(result);
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
    void loadVipData();
  }, [loadVipData]);

  async function performAction(
    level: number,
    action: "activate" | "claim",
  ) {
    if (busyAction) return;

    setBusyAction(`${action}-${level}`);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/vip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          level,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Impossible de réaliser cette opération.",
        );
      }

      setSuccess(result.message);
      setConfirmLevel(null);

      await loadVipData();

      // Actualise notamment le solde à retirer.
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setBusyAction("");
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">
        Chargement du programme VIP...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-red-400/20 bg-red-400/5 p-6">
        <p className="text-sm text-red-300">
          {error || "Impossible de charger le programme VIP."}
        </p>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadVipData();
          }}
          className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const nextLevel = data.levels.find(
    (level) => level.isNextLevel && !level.activated,
  );

  return (
    <div className="space-y-6">
      {/* Niveau actuel */}
      <section className="relative overflow-hidden rounded-3xl border border-[#18d5c4]/20 bg-gradient-to-br from-[#0d2835] via-[#09202d] to-[#071721] p-6 shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#18d5c4]/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#18d5c4]">
                Programme de fidélité
              </p>

              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                {data.currentLevel === 0
                  ? "Deviens VIP"
                  : `VIP ${data.currentLevel}`}
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                Progresse à travers les trois niveaux et reçois tes salaires
                quotidiens après l'activation de chaque niveau.
              </p>
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#18d5c4]/20 bg-[#18d5c4]/10 text-3xl">
              👑
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                className={`rounded-2xl border p-3 text-center ${
                  data.currentLevel >= level
                    ? "border-[#18d5c4]/30 bg-[#18d5c4]/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <p
                  className={`text-sm font-bold ${
                    data.currentLevel >= level
                      ? "text-[#18d5c4]"
                      : "text-slate-500"
                  }`}
                >
                  VIP {level}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {data.currentLevel >= level ? "Activé ✓" : "À débloquer"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conditions générales */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <h2 className="text-lg font-bold">Ma progression</h2>

        <p className="mt-1 text-sm text-slate-400">
          Voici tes statistiques actuelles pour accéder au prochain niveau.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#06131f]/70 p-4">
            <p className="text-sm text-slate-400">Filleuls directs</p>

            <p className="mt-2 text-2xl font-bold">
              {data.metrics.directReferrals}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Inscrits avec ton lien
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#06131f]/70 p-4">
            <p className="text-sm text-slate-400">Investissement personnel</p>

            <p className="mt-2 text-2xl font-bold">
              {formatAmount(data.metrics.personalInvestment)}
            </p>

            <p className="mt-1 text-xs text-slate-500">FCFA investis</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#06131f]/70 p-4">
            <p className="text-sm text-slate-400">Investissements des filleuls</p>

            <p className="mt-2 text-2xl font-bold">
              {formatAmount(data.metrics.referralInvestment)}
            </p>

            <p className="mt-1 text-xs text-slate-500">FCFA au total</p>
          </div>
        </div>

        {nextLevel && (
          <div className="mt-5 rounded-2xl border border-[#18d5c4]/15 bg-[#18d5c4]/5 p-4">
            <p className="font-semibold text-[#18d5c4]">
              Objectif suivant : {nextLevel.name}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Il faut satisfaire les trois conditions de ce niveau pour
              pouvoir l'activer.
            </p>
          </div>
        )}

        {!nextLevel && data.currentLevel === 3 && (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">
            Félicitations ! Tu as atteint le niveau VIP 3.
          </div>
        )}
      </section>

      {/* Cartes des trois niveaux */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Les niveaux VIP</h2>

          <p className="mt-1 text-sm text-slate-400">
            Chaque niveau doit être activé dans l'ordre.
          </p>
        </div>

        <div className="space-y-5">
          {data.levels.map((level) => {
            const referralsProgress = Math.min(
              100,
              (data.metrics.directReferrals / level.referralsRequired) * 100,
            );

            const activated = level.activated;

            const actionKey = `${level.salaryAvailable ? "claim" : "activate"}-${level.level}`;

            return (
              <article
                key={level.level}
                className={`overflow-hidden rounded-3xl border ${
                  activated
                    ? "border-[#18d5c4]/25"
                    : level.canActivate
                      ? "border-amber-400/30"
                      : "border-white/10"
                } bg-white/[0.035]`}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold ${
                          activated
                            ? "bg-[#18d5c4]/15 text-[#18d5c4]"
                            : "bg-white/[0.06] text-slate-300"
                        }`}
                      >
                        {activated ? "✓" : `V${level.level}`}
                      </div>

                      <div>
                        <h3 className="text-xl font-bold">{level.name}</h3>

                        <p className="mt-1 text-sm text-slate-400">
                          {activated
                            ? `Activé le ${formatDate(level.activatedAt)}`
                            : level.isNextLevel
                              ? "Prochain niveau à débloquer"
                              : "Niveau verrouillé"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border border-[#18d5c4]/20 bg-[#18d5c4]/10 px-3 py-1.5 text-sm font-semibold text-[#18d5c4]">
                      {formatAmount(level.salaryAmount)} FCFA/jour
                    </span>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          Filleuls directs requis
                        </p>

                        <span className="text-sm text-slate-400">
                          {data.metrics.directReferrals} /{" "}
                          {level.referralsRequired}
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#18d5c4] transition-all"
                          style={{ width: `${referralsProgress}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        Investissement personnel requis
                      </p>

                      <Progress
                        current={data.metrics.personalInvestment}
                        required={level.personalInvestmentRequired}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        Investissements des filleuls requis
                      </p>

                      <Progress
                        current={data.metrics.referralInvestment}
                        required={level.referralInvestmentRequired}
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#06131f]/70 p-4">
                      <p className="text-xs text-slate-500">
                        Durée du salaire
                      </p>

                      <p className="mt-1 text-lg font-bold">
                        {level.salaryDays} jours
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#06131f]/70 p-4">
                      <p className="text-xs text-slate-500">
                        Total potentiel
                      </p>

                      <p className="mt-1 text-lg font-bold">
                        {formatAmount(level.salaryAmount * level.salaryDays)}{" "}
                        FCFA
                      </p>
                    </div>
                  </div>

                  {activated && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-[#06131f]/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-400">
                          Salaires reçus
                        </p>

                        <p className="text-sm font-bold">
                          {level.salaryDaysClaimed} / {level.salaryDays}
                        </p>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#18d5c4]"
                          style={{
                            width: `${
                              Math.min(
                                100,
                                (level.salaryDaysClaimed / level.salaryDays) *
                                  100,
                              )
                            }%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          Total déjà reçu
                        </p>

                        <p className="text-sm font-semibold text-[#18d5c4]">
                          {formatAmount(level.totalSalaryPaid)} FCFA
                        </p>
                      </div>

                      {level.currentSalaryDay !== null && (
                        <p className="mt-3 text-xs text-slate-400">
                          Jour de salaire actuel : {level.currentSalaryDay} /{" "}
                          {level.salaryDays}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-5">
                    {activated ? (
                      level.salaryAvailable ? (
                        <button
                          type="button"
                          disabled={Boolean(busyAction)}
                          onClick={() =>
                            void performAction(level.level, "claim")
                          }
                          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#18d5c4] px-5 py-3 font-bold text-[#041018] transition hover:bg-[#25e4d3] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyAction === actionKey
                            ? "Versement en cours..."
                            : `Recevoir ${formatAmount(level.salaryAmount)} FCFA`}
                        </button>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-slate-400">
                          {level.claimedToday
                            ? "Salaire du jour déjà reçu ✓"
                            : level.salaryDaysClaimed >= level.salaryDays
                              ? "Programme salarial terminé"
                              : "Le prochain salaire sera disponible demain"}
                        </div>
                      )
                    ) : level.canActivate ? (
                      <button
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => setConfirmLevel(level.level)}
                        className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 font-bold text-[#1b1302] transition hover:bg-amber-300 disabled:opacity-50"
                      >
                        Passer au {level.name}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold text-slate-500"
                      >
                        {level.isNextLevel
                          ? "Conditions non remplies"
                          : "Niveau verrouillé"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Confirmation d'activation */}
      {confirmLevel !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vip-confirm-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1e2a] p-6 shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-3xl">
              👑
            </div>

            <h2
              id="vip-confirm-title"
              className="mt-5 text-xl font-bold"
            >
              Confirmer le passage au VIP {confirmLevel}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Tu es sur le point de passer au VIP {confirmLevel}. Veux-tu
              continuer ?
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Le salaire quotidien de 2 000 FCFA commencera à être disponible
              le lendemain de l'activation.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => {
                  setConfirmLevel(null);
                  setError("");
                }}
                className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() =>
                  void performAction(confirmLevel, "activate")
                }
                className="rounded-2xl bg-[#18d5c4] px-4 py-3 font-bold text-[#041018] transition hover:bg-[#25e4d3] disabled:opacity-50"
              >
                {busyAction === `activate-${confirmLevel}`
                  ? "Activation..."
                  : "Oui, continuer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {success && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
        >
          {success}
        </div>
      )}

      {error && confirmLevel === null && (
        <div
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-6 text-slate-500">
        Les salaires sont crédités sur le solde à retirer. Chaque journée de
        salaire ne peut être payée qu'une seule fois par niveau. Le programme
        commence le lendemain de l'activation.
      </div>

      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm font-semibold text-[#18d5c4] transition hover:text-white"
      >
        ← Retour au tableau de bord
      </Link>
    </div>
  );
}