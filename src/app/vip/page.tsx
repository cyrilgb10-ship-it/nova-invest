import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import VipDashboard from "@/components/VipDashboard";

export const instant = false;

export default async function VipPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#06131f] pb-28 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#18d5c4]/10 blur-3xl" />

        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-amber-400/5 blur-3xl" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-5xl px-5 py-6 sm:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Nova Invest</p>

            <h1 className="mt-1 text-2xl font-bold">Espace VIP</h1>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            Accueil
          </Link>
        </header>

        <VipDashboard />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
        <div className="mx-auto flex max-w-xl items-center justify-around rounded-3xl border border-white/10 bg-[#071923]/95 px-2 py-2 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <Link
            href="/dashboard"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
          >
            <span className="text-xl">⌂</span>
            <span className="text-[10px] font-medium">Accueil</span>
          </Link>

          <Link
            href="/products"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
          >
            <span className="text-xl">↗</span>
            <span className="text-[10px] font-medium">Produits</span>
          </Link>

          <Link
            href="/vip"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl bg-[#18d5c4]/10 py-2 text-[#18d5c4]"
          >
            <span className="text-xl">♛</span>
            <span className="text-[10px] font-medium">VIP</span>
          </Link>

          <Link
            href="/investments"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
          >
            <span className="text-xl">◷</span>
            <span className="text-[10px] font-medium">Investir</span>
          </Link>

          <Link
            href="/profile"
            className="flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
          >
            <span className="text-xl">♙</span>
            <span className="text-[10px] font-medium">Compte</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}