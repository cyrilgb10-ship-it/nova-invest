"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClaimPremiumRewardButtonProps = {
  purchaseId: string;
  maturityDate: string;
  rewardClaimedAt: string | null;
};

export default function ClaimPremiumRewardButton({
  purchaseId,
  maturityDate,
  rewardClaimedAt,
}: ClaimPremiumRewardButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isMatured = Date.now() >= new Date(maturityDate).getTime();

  if (rewardClaimedAt) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5 12 4 4L19 6"
              />
            </svg>
          </div>

          <div>
            <p className="font-bold text-emerald-400">
              Récompense reçue
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Votre récompense Premium a déjà été créditée.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isMatured) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
        <p className="text-sm font-semibold text-amber-300">
          Récompense en attente
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-400">
          Le bouton pour recevoir votre récompense apparaîtra lorsque
          les 95 jours seront écoulés.
        </p>
      </div>
    );
  }

  async function claimReward() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/premium/${encodeURIComponent(purchaseId)}/claim`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(
          data?.error ??
            "Impossible de recevoir votre récompense pour le moment."
        );
        return;
      }

      setMessage("Récompense créditée avec succès.");
      router.refresh();
    } catch {
      setMessage("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={claimReward}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3.5 font-bold text-[#06131f] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#06131f]/30 border-t-[#06131f]" />
            Traitement en cours...
          </>
        ) : (
          "Recevoir ma récompense"
        )}
      </button>

      {message && (
        <p
          aria-live="polite"
          className={`mt-3 text-center text-sm ${
            message.includes("succès")
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
