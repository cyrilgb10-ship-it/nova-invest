import Link from "next/link";
import { redirect } from "next/navigation";

import InvestmentCountdown from "@/components/InvestmentCountdown";
import InvestmentTabs from "@/components/InvestmentTabs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ClaimInvestmentButton from "@/components/ClaimInvestmentButton";

export const instant = false;

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

type InvestmentWithProduct = {
  id: string;
  amountInvested: number;
  profitAmount: number;
  returnAmount: number;
  startDate: Date;
  maturityDate: Date;
  status: "ACTIVE" | "COMPLETED";
  completedAt: Date | null;
  product: {
    name: string;
    investmentAmount: number;
    returnAmount: number;
    profitAmount: number;
    durationDays: number;
  };
};

function ActiveInvestments({
  investments,
}: {
  investments: InvestmentWithProduct[];
}) {
  if (investments.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18d5c4]/10 text-[#18d5c4]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>

        <h2 className="mt-5 text-xl font-bold">
          Aucun investissement en cours
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          Vous n&apos;avez actuellement aucun investissement actif.
          Découvrez nos produits et commencez à faire travailler votre
          argent.
        </p>

        <Link
          href="/products"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#18d5c4] px-5 py-3 font-semibold text-[#041018] transition hover:bg-[#25e4d3]"
        >
          Découvrir les produits
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {investments.map((investment) => (
        <div
          key={investment.id}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/10"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#18d5c4]/10 blur-3xl" />

          <div className="relative">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#18d5c4]">
                  Investissement actif
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  {investment.product.name}
                </h2>
              </div>

              <span className="shrink-0 rounded-full border border-[#18d5c4]/20 bg-[#18d5c4]/10 px-3 py-1.5 text-[11px] font-bold text-[#18d5c4]">
                En cours
              </span>
            </div>

            {/* Amounts */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs text-slate-500">
                  Montant investi
                </p>

                <p className="mt-2 text-lg font-bold text-white">
                  {formatAmount(investment.amountInvested)}
                  <span className="ml-1 text-xs font-medium text-slate-500">
                    FCFA
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-[#18d5c4]/10 bg-[#18d5c4]/[0.04] p-4">
                <p className="text-xs text-slate-500">
                  Gain prévu
                </p>

                <p className="mt-2 text-lg font-bold text-[#18d5c4]">
                  +{formatAmount(investment.profitAmount)}
                  <span className="ml-1 text-xs font-medium text-[#18d5c4]/70">
                    FCFA
                  </span>
                </p>
              </div>
            </div>

            {/* Return */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3">
              <span className="text-sm text-slate-400">
                Montant à l&apos;échéance
              </span>

              <span className="text-base font-bold text-white">
                {formatAmount(investment.returnAmount)} FCFA
              </span>
            </div>

            {/* Countdown */}
            <InvestmentCountdown
              startDate={investment.startDate.toISOString()}
              maturityDate={investment.maturityDate.toISOString()}
            />
            <ClaimInvestmentButton
              investmentId={investment.id}
              maturityDate={investment.maturityDate.toISOString()}
            />

            {/* Dates */}
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Début
                </p>

                <p className="mt-1 text-xs font-medium text-slate-300">
                  {formatDate(investment.startDate)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Échéance
                </p>

                <p className="mt-1 text-xs font-medium text-slate-300">
                  {formatDate(investment.maturityDate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompletedInvestments({
  investments,
}: {
  investments: InvestmentWithProduct[];
}) {
  if (investments.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <svg
            width="28"
            height="28"
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

        <h2 className="mt-5 text-xl font-bold text-white">
          Aucun investissement terminé
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          Vos investissements arrivés à échéance apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {investments.map((investment) => (
        <div
          key={investment.id}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-400">
                  Investissement terminé
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  {investment.product.name}
                </h2>
              </div>

              <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400">
                Terminé
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs text-slate-500">
                  Investi
                </p>

                <p className="mt-2 text-lg font-bold text-white">
                  {formatAmount(investment.amountInvested)}
                  <span className="ml-1 text-xs font-medium text-slate-500">
                    FCFA
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4">
                <p className="text-xs text-slate-500">
                  Gain
                </p>

                <p className="mt-2 text-lg font-bold text-emerald-400">
                  +{formatAmount(investment.profitAmount)}
                  <span className="ml-1 text-xs font-medium text-emerald-400/70">
                    FCFA
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Montant versé
                  </p>

                  <p className="mt-1 text-xl font-bold text-white">
                    {formatAmount(investment.returnAmount)} FCFA
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
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
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Début
                </p>

                <p className="mt-1 text-xs font-medium text-slate-300">
                  {formatDate(investment.startDate)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Terminé le
                </p>

                <p className="mt-1 text-xs font-medium text-slate-300">
                  {investment.completedAt
                    ? formatDate(investment.completedAt)
                    : formatDate(investment.maturityDate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function InvestmentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const investments = (await prisma.investment.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      amountInvested: true,
      profitAmount: true,
      returnAmount: true,
      startDate: true,
      maturityDate: true,
      status: true,
      completedAt: true,
      product: {
        select: {
          name: true,
          investmentAmount: true,
          returnAmount: true,
          profitAmount: true,
          durationDays: true,
        },
      },
    },
  })) as InvestmentWithProduct[];

  const activeInvestments = investments.filter(
    (investment) => investment.status === "ACTIVE"
  );

  const completedInvestments = investments.filter(
    (investment) => investment.status === "COMPLETED"
  );

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
            <p className="text-sm text-slate-400">
              Votre espace
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Mes investissements
            </h1>
          </div>

          <Link
            href="/products"
            className="flex h-11 items-center justify-center rounded-2xl border border-[#18d5c4]/20 bg-[#18d5c4]/10 px-4 text-sm font-semibold text-[#18d5c4] transition hover:bg-[#18d5c4]/15"
          >
            + Investir
          </Link>
        </header>

        {/* Main */}
        <section className="px-5 pt-3 sm:px-8">
          {/* Section title */}
          <div className="mb-5 mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#18d5c4]">
              Portefeuille
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Suivez vos investissements
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Consultez l&apos;avancement de vos placements et vos
              investissements arrivés à échéance.
            </p>
          </div>

          {/* Tabs + content */}
          <InvestmentTabs
            activeCount={activeInvestments.length}
            completedCount={completedInvestments.length}
            activeContent={
              <ActiveInvestments investments={activeInvestments} />
            }
            completedContent={
              <CompletedInvestments
                investments={completedInvestments}
              />
            }
          />
        </section>
      </div>

      {/* Fixed bottom navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
        <div className="mx-auto flex max-w-xl items-center justify-around rounded-3xl border border-white/10 bg-[#071923]/95 px-2 py-2 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <Link
            href="/dashboard"
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

          {/* Investissements actif */}
          <Link
            href="/investments"
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