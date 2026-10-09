"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type WithdrawalFormProps = {
  firstName: string;
  lastName: string;
  balance: number;
};

const WITHDRAWAL_FEE = 500;

export default function WithdrawalForm({
  firstName,
  lastName,
  balance,
}: WithdrawalFormProps) {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const numericAmount = Number(amount);

  const netAmount = useMemo(() => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return 0;
    }

    return Math.max(numericAmount - WITHDRAWAL_FEE, 0);
  }, [numericAmount]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!amount.trim()) {
      setError("Veuillez saisir un montant.");
      return;
    }

    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      setError("Le montant doit être un nombre entier valide.");
      return;
    }

    if (numericAmount > balance) {
      setError("Le montant demandé dépasse votre solde disponible.");
      return;
    }

    if (numericAmount <= WITHDRAWAL_FEE) {
      setError(
        "Le montant doit être supérieur à 500 FCFA pour couvrir les frais de retrait."
      );
      return;
    }

    const cleanPhone = phone.replace(/\s+/g, "");

    if (!/^9\d{7,8}$/.test(cleanPhone)) {
      setError("Veuillez saisir un numéro Moov valide.");
      return;
    }

    setPhone(cleanPhone);
    setShowConfirmation(true);
  }

  async function confirmWithdrawal() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
          phone,
          network: "moov",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Impossible d'envoyer la demande de retrait."
        );
        setShowConfirmation(false);
        return;
      }

      setShowConfirmation(false);
      setAmount("");
      setPhone("");

      router.push("/history");
      router.refresh();
    } catch (error) {
      console.error("WITHDRAWAL_SUBMIT_ERROR:", error);

      setError(
        "Une erreur est survenue. Veuillez réessayer."
      );

      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Nom
          </label>

          <input
            type="text"
            value={lastName}
            readOnly
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-300 outline-none"
          />
        </div>

        {/* Prénom */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Prénom
          </label>

          <input
            type="text"
            value={firstName}
            readOnly
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-300 outline-none"
          />
        </div>

        {/* Numéro */}
        <div>
          <label
            htmlFor="withdrawal-phone"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
          >
            Numéro Moov
          </label>

          <input
            id="withdrawal-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Ex : 90123456"
            value={phone}
            onChange={(event) => {
              setPhone(
                event.target.value.replace(/[^\d\s]/g, "")
              );
              setError("");
            }}
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 focus:bg-cyan-400/[0.04]"
          />

          <p className="mt-2 text-[11px] text-slate-600">
            Le retrait est disponible uniquement sur Moov Money.
          </p>
        </div>

        {/* Montant */}
        <div>
          <label
            htmlFor="withdrawal-amount"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
          >
            Montant à retirer
          </label>

          <div className="relative">
            <input
              id="withdrawal-amount"
              type="number"
              inputMode="numeric"
              min="1"
              max={balance}
              step="1"
              placeholder="Ex : 10000"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError("");
              }}
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 pr-20 text-lg font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 focus:bg-cyan-400/[0.04]"
            />

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
              FCFA
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-600">
              Solde disponible
            </span>

            <span className="font-semibold text-slate-400">
              {balance.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </div>

        {/* Résumé */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Montant demandé
            </span>

            <span className="text-sm font-semibold text-white">
              {numericAmount > 0
                ? numericAmount.toLocaleString("fr-FR")
                : "0"}{" "}
              FCFA
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Frais de retrait
            </span>

            <span className="text-sm font-semibold text-slate-400">
              500 FCFA
            </span>
          </div>

          <div className="my-3 border-t border-white/[0.06]" />

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-400">
              Vous recevrez
            </span>

            <span className="text-base font-black text-cyan-400">
              {netAmount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3">
            <p className="text-xs font-medium leading-5 text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* Bouton */}
        <button
          type="submit"
          disabled={loading || balance <= WITHDRAWAL_FEE}
          className="flex h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-sm font-black text-[#041018] shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Demander le retrait
        </button>
      </form>

      {/* Confirmation */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#071923] p-5 shadow-2xl shadow-black/60">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl text-cyan-400">
              ↗
            </div>

            <h2 className="mt-4 text-xl font-black text-white">
              Confirmer le retrait
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Vérifiez les informations avant d'envoyer votre
              demande.
            </p>

            <div className="mt-5 space-y-3 rounded-2xl bg-white/[0.03] p-4">
              <div className="flex justify-between gap-4">
                <span className="text-xs text-slate-500">
                  Bénéficiaire
                </span>

                <span className="text-right text-sm font-semibold text-white">
                  {firstName} {lastName}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-xs text-slate-500">
                  Numéro Moov
                </span>

                <span className="text-sm font-semibold text-white">
                  {phone}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-xs text-slate-500">
                  Montant
                </span>

                <span className="text-sm font-semibold text-white">
                  {numericAmount.toLocaleString("fr-FR")} FCFA
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-xs text-slate-500">
                  Frais
                </span>

                <span className="text-sm font-semibold text-slate-400">
                  500 FCFA
                </span>
              </div>

              <div className="border-t border-white/[0.06] pt-3">
                <div className="flex justify-between gap-4">
                  <span className="text-xs font-semibold text-slate-400">
                    Vous recevrez
                  </span>

                  <span className="text-base font-black text-cyan-400">
                    {netAmount.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={confirmWithdrawal}
                disabled={loading}
                className="h-12 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-black text-[#041018] transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Envoi..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}