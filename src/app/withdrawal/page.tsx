import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import WithdrawalForm from "@/components/WithdrawalForm";

export const instant = false;

export default async function WithdrawalPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#06131f] px-4 pb-32 pt-6 text-white">
      <div className="mx-auto w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Retour"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
              Retrait
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
              Retirer mes gains
            </h1>
          </div>
        </div>

        {/* Solde */}
        <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a2531] to-[#071923] p-5 shadow-xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Solde à retirer
          </p>

          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-black tracking-tight text-white">
              {user.withdrawBalance.toLocaleString("fr-FR")}
            </p>

            <p className="pb-1 text-sm font-semibold text-slate-400">
              FCFA
            </p>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Les gains arrivés à échéance sont disponibles ici.
          </p>
        </div>

        {/* Formulaire */}
        <div className="mt-5 rounded-3xl border border-white/10 bg-[#071923] p-5 shadow-xl shadow-black/20">
          <div className="mb-5">
            <h2 className="text-base font-bold text-white">
              Informations du retrait
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Les retraits sont effectués uniquement vers un numéro Moov.
            </p>
          </div>

          <WithdrawalForm
            firstName={user.firstName}
            lastName={user.lastName}
            balance={user.withdrawBalance}
          />
        </div>

        {/* Info */}
        <div className="mt-5 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
              !
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                À savoir
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Des frais fixes de 500 FCFA sont déduits du montant
                demandé. Votre demande sera ensuite vérifiée par notre
                équipe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3">
        <div className="mx-auto flex max-w-xl items-center justify-between rounded-3xl border border-white/10 bg-[#071923]/95 px-2 py-2 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <Link
            href="/dashboard"
            className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-slate-500 transition hover:text-white"
          >
            <span className="text-lg">⌂</span>
            <span className="text-[10px] font-semibold">
              Accueil
            </span>
          </Link>

          <Link
            href="/products"
            className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-slate-500 transition hover:text-white"
          >
            <span className="text-lg">◈</span>
            <span className="text-[10px] font-semibold">
              Produits
            </span>
          </Link>

          <Link
            href="/investments"
            className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-slate-500 transition hover:text-white"
          >
            <span className="text-lg">↗</span>
            <span className="text-[10px] font-semibold">
              Investissements
            </span>
          </Link>

          <Link
            href="/history"
            className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-slate-500 transition hover:text-white"
          >
            <span className="text-lg">◷</span>
            <span className="text-[10px] font-semibold">
              Historique
            </span>
          </Link>

          <Link
            href="/account"
            className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-slate-500 transition hover:text-white"
          >
            <span className="text-lg">●</span>
            <span className="text-[10px] font-semibold">
              Mon compte
            </span>
          </Link>
        </div>
      </nav>
    </main>
  );
}