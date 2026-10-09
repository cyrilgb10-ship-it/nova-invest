"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type DepositResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  depositId?: string;
  paymentId?: string;
  checkoutUrl?: string | null;
  status?: string;
  credited?: boolean;
};

export default function DepositPage() {
  const [amount, setAmount] = useState("1000");
  const [network, setNetwork] = useState("moov_tg");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [depositId, setDepositId] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const checkingRef = useRef(false);

  useEffect(() => {
    if (!depositId) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function verifyPayment() {
      if (cancelled) return;

      if (attempts >= 24) {
        setChecking(false);
        setMessage(
          "La vérification automatique est terminée. Tu peux vérifier à nouveau le statut plus tard."
        );
        return;
      }

      attempts += 1;

      try {
        const response = await fetch(
          `/api/deposits/${encodeURIComponent(depositId)}/status`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = (await response.json()) as DepositResponse;

        if (cancelled) return;

        if (response.ok && data.success) {
          setStatus(data.status ?? "PENDING");

          if (data.status === "SUCCESS" && data.credited) {
            setChecking(false);
            setMessage(
              "Paiement confirmé ! Ton solde d'investissement a été crédité."
            );
            return;
          }

          if (data.status === "FAILED") {
            setChecking(false);
            setMessage(
              "Le paiement a échoué. Aucun solde n'a été crédité."
            );
            return;
          }
        }
      } catch {
        if (!cancelled) {
          setMessage(
            "Vérification temporairement indisponible. Nouvelle tentative en cours."
          );
        }
      }

      if (!cancelled) {
        timer = setTimeout(verifyPayment, 5000);
      }
    }

    setChecking(true);
    void verifyPayment();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [depositId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setStatus("");
    setDepositId("");

    const numericAmount = Number(amount);
    const cleanedPhone = phone.trim().replace(/[\s()-]/g, "");
    const localPhone = cleanedPhone.replace(/^\+?228/, "");

    if (
      !Number.isSafeInteger(numericAmount) ||
      numericAmount < 500 ||
      numericAmount > 1_000_000
    ) {
      setError("Choisis un montant entre 500 et 1 000 000 FCFA.");
      return;
    }

    if (!/^\d{8}$/.test(localPhone)) {
      setError(
        "Saisis un numéro togolais valide de 8 chiffres, avec ou sans indicatif +228."
      );
      return;
    }

    const normalizedPhone = `+228${localPhone}`;

    setLoading(true);

    try {
      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
          network,
          phone: normalizedPhone,
        }),
      });

      const data = (await response.json()) as DepositResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Impossible de créer le dépôt.");
        return;
      }

      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      if (data.depositId) {
        setDepositId(data.depositId);
        setStatus(data.status ?? "PENDING");
        setMessage(
          "Demande transmise. Vérifie ton téléphone et suis les instructions de ton opérateur pour confirmer le paiement."
        );
      } else {
        setMessage(data.message || "Demande de dépôt créée.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  async function checkAgain() {
    if (!depositId || checkingRef.current) return;

    checkingRef.current = true;

    try {
      const response = await fetch(
        `/api/deposits/${encodeURIComponent(depositId)}/status`,
        { cache: "no-store" }
      );

      const data = (await response.json()) as DepositResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Impossible de vérifier le paiement.");
        return;
      }

      setStatus(data.status ?? "PENDING");

      if (data.status === "SUCCESS" && data.credited) {
        setMessage("Paiement confirmé et solde crédité.");
        setChecking(false);
      } else if (data.status === "FAILED") {
        setMessage("Le paiement a échoué.");
        setChecking(false);
      } else {
        setMessage("Le paiement est toujours en attente.");
      }
    } catch {
      setError("La vérification a échoué. Réessaie plus tard.");
    } finally {
      checkingRef.current = false;
    }
  }

  return (
    <main className="min-h-screen bg-[#041018] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-lg">
        <a
          href="/dashboard"
          className="text-sm text-[#18d5c4] hover:underline"
        >
          ← Retour au tableau de bord
        </a>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0a1b25] p-6 shadow-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#18d5c4]">
            Nova Invest
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Effectuer un dépôt
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Choisis le montant, ton réseau Mobile Money et le numéro
            sur lequel tu souhaites recevoir la demande de paiement.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-medium"
              >
                Montant en FCFA
              </label>

              <input
                id="amount"
                type="number"
                min="500"
                max="1000000"
                step="1"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#041018] px-4 py-3 outline-none focus:border-[#18d5c4]"
              />

              <p className="mt-2 text-xs text-slate-500">
                Minimum : 500 FCFA
              </p>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium"
              >
                Numéro Mobile Money
              </label>

              <div className="flex overflow-hidden rounded-xl border border-white/10 bg-[#041018] focus-within:border-[#18d5c4]">
                <span className="flex items-center border-r border-white/10 px-3 text-sm text-slate-400">
                  +228
                </span>

                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="90 00 00 00"
                  maxLength={14}
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none"
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Entre le numéro associé au compte Moov Money ou
                Togocel Money qui servira à payer.
              </p>
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-medium">
                Réseau Mobile Money
              </legend>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-xl border p-4 ${
                    network === "moov_tg"
                      ? "border-[#18d5c4] bg-[#18d5c4]/10"
                      : "border-white/10 bg-[#041018]"
                  }`}
                >
                  <input
                    type="radio"
                    name="network"
                    value="moov_tg"
                    checked={network === "moov_tg"}
                    onChange={() => setNetwork("moov_tg")}
                    className="sr-only"
                  />

                  <span className="block font-semibold">
                    Moov Money
                  </span>

                  <span className="mt-1 block text-xs text-slate-400">
                    Togo
                  </span>
                </label>

                <label
                  className={`cursor-pointer rounded-xl border p-4 ${
                    network === "togocel"
                      ? "border-[#18d5c4] bg-[#18d5c4]/10"
                      : "border-white/10 bg-[#041018]"
                  }`}
                >
                  <input
                    type="radio"
                    name="network"
                    value="togocel"
                    checked={network === "togocel"}
                    onChange={() => setNetwork("togocel")}
                    className="sr-only"
                  />

                  <span className="block font-semibold">
                    Togocel Money
                  </span>

                  <span className="mt-1 block text-xs text-slate-400">
                    Togo
                  </span>
                </label>
              </div>
            </fieldset>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="break-words rounded-xl border border-[#18d5c4]/20 bg-[#18d5c4]/10 p-4 text-sm text-[#a6fff5]"
              >
                {message}
              </div>
            )}

            {depositId && (
              <div className="rounded-xl border border-white/10 bg-[#041018] p-4 text-sm">
                <p className="text-slate-400">
                  Référence du dépôt
                </p>

                <p className="mt-1 break-all font-mono">
                  {depositId}
                </p>

                <p className="mt-3 text-slate-400">
                  Statut actuel
                </p>

                <p className="mt-1 font-semibold text-[#18d5c4]">
                  {status || "PENDING"}
                </p>

                {checking && (
                  <p className="mt-2 text-xs text-slate-400">
                    Vérification automatique en cours...
                  </p>
                )}

                <button
                  type="button"
                  onClick={checkAgain}
                  className="mt-4 rounded-lg border border-[#18d5c4]/40 px-4 py-2 text-[#18d5c4] hover:bg-[#18d5c4]/10"
                >
                  Vérifier maintenant
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#18d5c4] px-5 py-4 font-bold text-[#041018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Préparation..." : "Confirmer le dépôt"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            La confirmation se fait sur ton téléphone. Ne communique
            jamais ton code secret Mobile Money sur Nova Invest.
            Ton solde est crédité uniquement après confirmation
            vérifiée du paiement par SasPay.
          </p>
        </section>
      </div>
    </main>
  );
}
