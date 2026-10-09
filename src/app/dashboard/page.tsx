import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

export const instant = false;

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#06131f] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#18d5c4]/10 blur-3xl" />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-7xl pb-28">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <p className="text-sm text-slate-400">Bienvenue</p>

            <h1 className="mt-1 text-xl font-bold sm:text-2xl">
              {user.firstName} 👋
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationBell />

            {/* Profile */}
            <Link
              href="/account"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#18d5c4] to-[#1689d7] font-bold text-[#041018]"
            >
              {user.firstName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </header>

        {/* Main */}
        <section className="px-5 pt-4 sm:px-8">
          {/* Balances */}
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            {/* Invest balance */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d2835] via-[#09202d] to-[#071721] p-6 shadow-2xl shadow-black/20 sm:p-8">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#18d5c4]/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Solde à investir
                    </p>

                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-4xl font-bold tracking-tight sm:text-5xl">
                        {formatAmount(user.investBalance)}
                      </span>

                      <span className="mb-1 text-sm font-medium text-[#18d5c4]">
                        FCFA
                      </span>
                    </div>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#18d5c4]/10 text-[#18d5c4]">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 2v20" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                </div>

                <Link
                  href="/deposit"
                  className="mt-8 inline-flex items-center justify-center rounded-2xl bg-[#18d5c4] px-5 py-3 font-semibold text-[#041018] transition hover:bg-[#25e4d3]"
                >
                  + Déposer de l'argent
                </Link>
              </div>
            </div>

            {/* Withdraw balance */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
              <p className="text-sm text-slate-400">Solde à retirer</p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-bold">
                  {formatAmount(user.withdrawBalance)}
                </span>

                <span className="mb-1 text-sm text-slate-400">
                  FCFA
                </span>
              </div>

              <div className="mt-6 h-px bg-white/10" />

              <Link
                href="/withdrawal"
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-[#18d5c4]/30 bg-[#18d5c4]/10 px-5 py-3 font-semibold text-[#18d5c4] transition hover:bg-[#18d5c4]/15"
              >
                Retirer mes gains
              </Link>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link
              href="/products"
              className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-[#18d5c4]/30 hover:bg-white/[0.055]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#18d5c4]/10 text-[#18d5c4]">
                ↗
              </div>

              <p className="mt-4 font-semibold">Investir</p>

              <p className="mt-1 text-xs text-slate-500">
                Choisir un produit
              </p>
            </Link>

            <Link
              href="/deposit"
              className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-[#18d5c4]/30 hover:bg-white/[0.055]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                +
              </div>

              <p className="mt-4 font-semibold">Déposer</p>

              <p className="mt-1 text-xs text-slate-500">
                Ajouter des fonds
              </p>
            </Link>

            <Link
              href="/investments"
              className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-[#18d5c4]/30 hover:bg-white/[0.055]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
                ◷
              </div>

              <p className="mt-4 font-semibold">
                Investissements
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Suivre mes placements
              </p>
            </Link>

            <Link
              href="/history"
              className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-[#18d5c4]/30 hover:bg-white/[0.055]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                ≡
              </div>

              <p className="mt-4 font-semibold">
                Historique
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Mes opérations
              </p>
            </Link>
          </div>

          {/* Overview */}
          

          {/* Empty investment state */}
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-lg font-bold">
                    Commencez votre premier investissement
                  </p>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    Utilisez votre solde disponible pour choisir
                    l&apos;un de nos produits d&apos;investissement
                    et faire travailler votre argent.
                  </p>
                </div>

                <Link
                  href="/products"
                  className="shrink-0 rounded-2xl bg-white px-5 py-3 font-semibold text-[#06131f] transition hover:bg-slate-100"
                >
                  Découvrir les produits
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Fixed bottom navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
        <div className="mx-auto flex max-w-xl items-center justify-around rounded-3xl border border-white/10 bg-[#071923]/95 px-2 py-2 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <Link
            href="/dashboard"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[#18d5c4]"
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="m3 10 9-7 9 7" />
              <path d="M5 9v11h14V9" />
              <path d="M9 20v-6h6v6" />
            </svg>

            <span className="text-[10px] font-medium">
              Accueil
            </span>
          </Link>

          <Link
            href="/products"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M12 3v18" />
              <path d="M17 7H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
            </svg>

            <span className="text-[10px] font-medium">
              Produits
            </span>
          </Link>

          <Link
            href="/investments"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>

            <span className="text-[10px] font-medium">
              Investissements
            </span>
          </Link>

          <Link
            href="/history"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>

            <span className="text-[10px] font-medium">
              Historique
            </span>
          </Link>

          <Link
            href="/account"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c.8-3.2 3.3-5 7-5s6.2 1.8 7 5" />
            </svg>

            <span className="text-[10px] font-medium">
              Mon compte
            </span>
          </Link>
        </div>
      </nav>
    </main>
  );
}
