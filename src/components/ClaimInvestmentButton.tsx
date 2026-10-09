"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClaimInvestmentButtonProps = {
  investmentId: string;
  maturityDate: string;
};

export default function ClaimInvestmentButton({
  investmentId,
  maturityDate,
}: ClaimInvestmentButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const matured = Date.now() >= new Date(maturityDate).getTime();

  async function claimInvestment() {
    if (loading || !matured) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/investments/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ investmentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "La réclamation a échoué.");
        return;
      }

      setSuccess(data.message || "Fonds crédités avec succès.");

      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (!matured && !success) {
    return null;
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={claimInvestment}
        disabled={loading || Boolean(success)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18d5c4] px-5 py-3.5 font-bold text-[#041018] transition hover:bg-[#25e4d3] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#041018]/30 border-t-[#041018]" />
            Réclamation en cours...
          </>
        ) : success ? (
          "Fonds réclamés"
        ) : (
          <>
            <span aria-hidden="true">↓</span>
            Réclamer mes gains
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300"
        >
          {success}
        </p>
      )}
    </div>
  );
}