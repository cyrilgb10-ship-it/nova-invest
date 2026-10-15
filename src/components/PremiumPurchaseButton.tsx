"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PremiumPurchaseButtonProps = {
  productId: string;
  productName: string;
  investmentAmount: number;
  rewardAmount: number;
};

function formatFCFA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export default function PremiumPurchaseButton({
  productId,
  productName,
  investmentAmount,
  rewardAmount,
}: PremiumPurchaseButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const totalReturn = investmentAmount + rewardAmount;

  async function handlePurchase() {
    if (loading) return;

    setLoading(true);
    setMessage("");
    setError(false);

    try {
      const response = await fetch("/api/premium/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }

        setError(true);
        setMessage(
          data.error || "Impossible d'effectuer cet achat Premium."
        );
        return;
      }

      setShowConfirmation(false);
      setMessage(
        `Achat Premium réussi ! ${formatFCFA(totalReturn)} sont prévus à l'échéance de 95 jours. Votre achat normal de ${productName} est maintenant débloqué.`
      );

      router.refresh();
    } catch {
      setError(true);
      setMessage(
        "Une erreur de connexion est survenue. Réessayez."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => {
          setMessage("");
          setError(false);
          setShowConfirmation(true);
        }}
        disabled={loading}
        className="w-full rounded-xl bg-amber-500 px-4 py-3 font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Acheter Premium
      </button>

      {message && (
        <div
          role="status"
          className={`mt-3 rounded-lg border p-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {showConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="premium-confirmation-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2
              id="premium-confirmation-title"
              className="text-xl font-bold text-gray-900"
            >
              Confirmer l'achat Premium
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Vous êtes sur le point d'acheter le Premium{" "}
              <strong>{productName}</strong>.
            </p>

            <div className="mt-4 space-y-3 rounded-xl bg-amber-50 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-600">
                  Montant à payer
                </span>
                <strong className="text-gray-900">
                  {formatFCFA(investmentAmount)}
                </strong>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-600">
                  Gain annoncé
                </span>
                <strong className="text-green-700">
                  {formatFCFA(rewardAmount)}
                </strong>
              </div>

              <div className="flex justify-between gap-3 border-t border-amber-200 pt-3">
                <span className="text-gray-700">
                  Total annoncé après 95 jours
                </span>
                <strong className="text-gray-900">
                  {formatFCFA(totalReturn)}
                </strong>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              Cet achat débloque un seul achat normal du même rang.
              La récompense Premium pourra être réclamée après 95 jours
              révolus.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handlePurchase}
                disabled={loading}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Traitement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
