"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

type DepositResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  depositId?: string;
  paymentId?: string;
  status?: PaymentStatus;
  checkoutUrl?: string | null;
  instructions?: string | Record<string, unknown> | null;
};

export default function DepositPage() {
  const [amount, setAmount] = useState("1000");
  const [network, setNetwork] = useState("moov_tg");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [depositId, setDepositId] = useState("");
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [message, setMessage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");

  const pollingRef = useRef(false);

  useEffect(() => {
    if (!depositId || status !== "PENDING") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const checkStatus = async () => {
      if (cancelled || pollingRef.current) return;

      if (Date.now() - startedAt > 180000) {
        setChecking(false);
        setMessage(
          "La confirmation prend plus de temps que prévu. Vous pouvez vérifier à nouveau dans quelques instants."
        );
        return;
      }

      pollingRef.current = true;

      try {
        const response = await fetch(
          `/api/deposits/${encodeURIComponent(depositId)}/status`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = (await response.json()) as DepositResponse;

        if (cancelled) return;

        if (result.status === "SUCCESS") {
          setStatus("SUCCESS");
          setChecking(false);
          setMessage(
            "Votre dépôt est confirmé. Votre solde d'investissement a été crédité."
          );
          return;
        }

        if (result.status === "FAILED") {
          setStatus("FAILED");
          setChecking(false);
          setMessage("Le paiement a échoué ou a été annulé.");
          return;
        }

        if (!response.ok) {
          setMessage(
            result.message ||
              result.error ||
              "La vérification est temporairement indisponible."
          );
        }
      } catch {
        if (!cancelled) {
          setMessage(
            "Connexion temporairement indisponible. Nouvelle vérification en cours."
          );
        }
      } finally {
        pollingRef.current = false;
      }

      if (!cancelled) {
        timer = setTimeout(checkStatus, 5000);
      }
    };

    setChecking(true);
    void checkStatus();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }

      pollingRef.current = false;
    };
  }, [depositId, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setInstructions("");
    setDepositId("");
    setStatus(null);
    setLoading(true);

    const parsedAmount = Number(amount);
    const normalizedPhone = phone.replace(/\D/g, "");

    // Vérifier le montant.
    if (
      !Number.isSafeInteger(parsedAmount) ||
      parsedAmount < 500 ||
      parsedAmount > 1000000
    ) {
      setError(
        "Le montant doit être compris entre 500 et 1 000 000 FCFA."
      );
      setLoading(false);
      return;
    }

    // Vérifier le numéro togolais.
    if (!/^\d{8}$/.test(normalizedPhone)) {
      setError("Saisissez un numéro togolais valide de 8 chiffres.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parsedAmount,
          network,
          phone: normalizedPhone,
        }),
      });

      const result = (await response.json()) as DepositResponse;

      if (!response.ok || !result.success) {
        setError(
          result.error ||
            result.message ||
            "Impossible de démarrer le paiement. Réessayez."
        );
        return;
      }

      if (!result.depositId) {
        setError(
          "Le dépôt a été initié, mais sa référence est manquante. Consultez votre historique avant de recommencer."
        );
        return;
      }

      setDepositId(result.depositId);
      setStatus(result.status || "PENDING");

      if (result.instructions) {
        setInstructions(
          typeof result.instructions === "string"
            ? result.instructions
            : JSON.stringify(result.instructions, null, 2)
        );
      }

      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }

      setMessage(
        "Demande envoyée. Confirmez l'opération sur votre téléphone si SasPay vous le demande."
      );
    } catch {
      setError(
        "Une erreur de connexion est survenue. Vérifiez votre connexion et consultez vos dépôts avant de recommencer."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-orange-400"
        >
          <span aria-hidden="true">←</span>
          Retour au tableau de bord
        </Link>

        <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
          <div className="border-b border-zinc-800 bg-gradient-to-r from-orange-950 to-zinc-900 p-6 sm:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-2xl">
              +
            </div>

            <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">
              Nova Invest
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Effectuer un dépôt
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-300">
              Alimentez votre solde d'investissement grâce à votre
              portefeuille Mobile Money.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-400">Dépôt minimum</p>
                <p className="mt-1 text-lg font-bold">500 FCFA</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-400">Dépôt maximum</p>
                <p className="mt-1 text-lg font-bold">
                  1 000 000 FCFA
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Montant */}
              <div>
                <label
                  htmlFor="amount"
                  className="text-sm font-semibold text-zinc-200"
                >
                  Montant du dépôt (FCFA)
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
                  className={inputClass}
                  placeholder="Ex. : 1000"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {[500, 1000, 2500, 5000, 10000].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        amount === String(value)
                          ? "border-orange-500 bg-orange-500/15 text-orange-400"
                          : "border-zinc-700 text-zinc-300 hover:border-orange-500"
                      }`}
                    >
                      {value.toLocaleString("fr-FR")} F
                    </button>
                  ))}
                </div>
              </div>

              {/* Réseau */}
              <div>
                <label
                  htmlFor="network"
                  className="text-sm font-semibold text-zinc-200"
                >
                  Moyen de paiement
                </label>

                <select
                  id="network"
                  value={network}
                  onChange={(event) => setNetwork(event.target.value)}
                  className={inputClass}
                >
                  <option value="moov_tg">Moov Money Togo</option>
                  <option value="togocel">Togocel Money</option>
                </select>
              </div>

              {/* Numéro Mobile Money */}
              <div>
                <label
                  htmlFor="phone"
                  className="text-sm font-semibold text-zinc-200"
                >
                  Numéro Mobile Money
                </label>

                <div className="mt-2 flex overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 focus-within:border-orange-500">
                  <span className="flex items-center border-r border-zinc-700 bg-zinc-800 px-4 text-sm font-semibold text-zinc-300">
                    +228
                  </span>

                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value.replace(/\D/g, "").slice(0, 8)
                      )
                    }
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none"
                    placeholder="XX XX XX XX"
                    minLength={8}
                    maxLength={8}
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Utilisez le numéro sur lequel vous souhaitez recevoir
                  la demande de confirmation de paiement.
                </p>
              </div>

              {/* Erreur */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
                >
                  {error}
                </div>
              )}

              {/* Message de suivi */}
              {message && (
                <div
                  aria-live="polite"
                  className={`rounded-xl border p-4 text-sm ${
                    status === "SUCCESS"
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : status === "FAILED"
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-orange-500/30 bg-orange-500/10 text-orange-200"
                  }`}
                >
                  <p>{message}</p>

                  {depositId && (
                    <p className="mt-2 break-all text-xs opacity-75">
                      Référence : {depositId}
                    </p>
                  )}
                </div>
              )}

              {/* Instructions du prestataire */}
              {instructions && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4">
                  <h2 className="text-sm font-semibold text-orange-400">
                    Instructions de paiement
                  </h2>

                  <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-zinc-300">
                    {instructions}
                  </pre>
                </div>
              )}

              {/* Vérification du statut */}
              {checking && status === "PENDING" && (
                <div
                  aria-live="polite"
                  className="flex items-center gap-3 text-sm text-zinc-400"
                >
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-orange-500" />
                  Vérification du paiement en cours…
                </div>
              )}

              {/* Retour après confirmation */}
              {status === "SUCCESS" && (
                <Link
                  href="/dashboard"
                  className="block rounded-xl bg-green-600 px-5 py-3 text-center font-bold text-white transition hover:bg-green-500"
                >
                  Retour au tableau de bord
                </Link>
              )}

              {/* Bouton de paiement */}
              {status !== "SUCCESS" && (
                <button
                  type="submit"
                  disabled={loading || checking}
                  className="w-full rounded-xl bg-orange-600 px-5 py-4 font-bold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Préparation du paiement…"
                    : checking
                      ? "Paiement en attente…"
                      : "Continuer vers le paiement"}
                </button>
              )}

              <p className="text-center text-xs leading-5 text-zinc-500">
                Votre solde ne sera crédité qu'après confirmation du
                paiement par SasPay. Ne partagez jamais votre code secret
                Mobile Money.
              </p>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Paiements sécurisés via SasPay · Nova Invest
        </p>
      </div>
    </main>
  );
}
