"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PurchaseButtonProps = {
  productId: string;
};

export default function PurchaseButton({
  productId,
}: PurchaseButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<
    "success" | "insufficient" | "limit" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePurchase = async () => {
    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/investments/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setModal("success");
        return;
      }

      if (data.code === "INSUFFICIENT_BALANCE") {
        setModal("insufficient");
        return;
      }

      if (data.code === "PURCHASE_LIMIT_REACHED") {
        setErrorMessage(
          data.error ||
            "Vous avez atteint la limite d'achat de ce produit."
        );
        setModal("limit");
        return;
      }

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      setErrorMessage(
        data.error || "Une erreur est survenue. Veuillez réessayer."
      );
      setModal("limit");
    } catch {
      setErrorMessage(
        "Impossible de traiter votre achat. Veuillez réessayer."
      );
      setModal("limit");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModal(null);
    setErrorMessage("");
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePurchase}
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-[#071827] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Achat en cours..." : "Acheter"}
      </button>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071827]/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] border border-slate-200/20 bg-white p-7 text-center shadow-2xl">

            {/* Achat réussi */}
            {modal === "success" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m5 12 4 4L19 6"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="mt-5 text-xl font-bold text-[#071827]">
                  Achat effectué
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Votre achat a été effectué avec succès.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    router.push("/investments");
                  }}
                  className="mt-7 w-full rounded-2xl bg-[#071827] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-cyan-700"
                >
                  OK
                </button>
              </>
            )}

            {/* Solde insuffisant */}
            {modal === "insufficient" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v4"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 17h.01"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="mt-5 text-xl font-bold text-[#071827]">
                  Solde insuffisant
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Votre solde est insuffisant pour effectuer cet achat.
                </p>

                <button
                  type="button"
                  onClick={() => router.push("/deposit")}
                  className="mt-7 w-full rounded-2xl bg-[#071827] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-cyan-700"
                >
                  Déposer
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[#071827]"
                >
                  Annuler
                </button>
              </>
            )}

            {/* Limite / autre erreur */}
            {modal === "limit" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16h.01"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="mt-5 text-xl font-bold text-[#071827]">
                  Achat impossible
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {errorMessage}
                </p>

                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-7 w-full rounded-2xl bg-[#071827] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-cyan-700"
                >
                  OK
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
