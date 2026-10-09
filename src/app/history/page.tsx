import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_CONFIG = {
PENDING: {
label: "En attente",
color: "border-amber-400/20 bg-amber-400/10 text-amber-300",
description: "Votre demande attend sa validation.",
},
PROCESSING: {
label: "En traitement",
color: "border-sky-400/20 bg-sky-400/10 text-sky-300",
description: "Votre demande est en cours de traitement.",
},
PAID: {
label: "Payé",
color: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
description: "Votre retrait a été marqué comme payé.",
},
REFUSED: {
label: "Refusé",
color: "border-red-400/20 bg-red-400/10 text-red-300",
description: "Votre demande a été refusée.",
},
} as const;

function formatAmount(amount: number) {
return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function formatDate(date: Date) {
return new Intl.DateTimeFormat("fr-FR", {
day: "2-digit",
month: "long",
year: "numeric",
hour: "2-digit",
minute: "2-digit",
}).format(date);
}

function BottomNavigation() {
const items = [
{ label: "Accueil", href: "/dashboard", icon: "⌂" },
{ label: "Produits", href: "/products", icon: "◇" },
{ label: "Investissements", href: "/investments", icon: "↗" },
{ label: "Historique", href: "/history", icon: "◷" },
{ label: "Mon compte", href: "/account", icon: "◎" },
];

return ( <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"> <div className="mx-auto flex max-w-xl items-center justify-between rounded-3xl border border-white/10 bg-[#071923]/95 px-2 py-2 shadow-2xl shadow-black/30 backdrop-blur-xl">
{items.map((item) => {
const active = item.href === "/history";


      return (
        <Link
          key={item.href}
          href={item.href}
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-center transition ${
            active
              ? "text-[#18d5c4]"
              : "text-slate-500 hover:text-slate-200"
          }`}
        >
          <span className="text-xl leading-none">{item.icon}</span>
          <span className="text-[9px] font-medium sm:text-[10px]">
            {item.label}
          </span>
        </Link>
      );
    })}
  </div>
</nav>


);
}

function HistorySkeleton() {
return ( <main className="min-h-screen bg-[#041018] px-4 pb-32 pt-7 text-white sm:px-6"> <div className="mx-auto max-w-xl animate-pulse"> <div className="mb-3 h-4 w-28 rounded bg-white/10" /> <div className="mb-8 h-9 w-48 rounded bg-white/10" />


    <div className="mb-7 grid grid-cols-2 gap-3">
      <div className="h-24 rounded-3xl bg-[#0a1c27]" />
      <div className="h-24 rounded-3xl bg-[#0a1c27]" />
    </div>

    <div className="mb-4 h-6 w-36 rounded bg-white/10" />

    <div className="space-y-4">
      <div className="h-52 rounded-3xl bg-[#0a1c27]" />
      <div className="h-52 rounded-3xl bg-[#0a1c27]" />
    </div>
  </div>

  <BottomNavigation />
</main>


);
}

async function HistoryContent() {
const user = await getCurrentUser();

if (!user) {
redirect("/login");
}

const [withdrawals, transactions] = await Promise.all([
prisma.withdrawal.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
take: 50,
select: {
id: true,
amount: true,
fee: true,
netAmount: true,
phone: true,
status: true,
rejectionReason: true,
createdAt: true,
completedAt: true,
},
}),
prisma.transaction.findMany({
where: {
userId: user.id,
type: {
in: [
"DEPOSIT",
"REFERRAL_REWARD",
"INVESTMENT",
"INVESTMENT_RETURN",
],
},
},
orderBy: { createdAt: "desc" },
take: 50,
select: {
id: true,
type: true,
amount: true,
description: true,
createdAt: true,
},
}),
]);

const typeLabels: Record<string, string> = {
DEPOSIT: "Dépôt",
REFERRAL_REWARD: "Bonus de parrainage",
INVESTMENT: "Investissement",
INVESTMENT_RETURN: "Retour d'investissement",
};

return ( <main className="min-h-screen bg-[#041018] px-4 pb-32 pt-7 text-white sm:px-6"> <div className="mx-auto max-w-xl"> <header className="mb-8"> <Link
         href="/dashboard"
         className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
       > <span aria-hidden="true">←</span>
Retour au tableau de bord </Link>


      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#18d5c4]">
        Nova Invest
      </p>

      <h1 className="text-3xl font-bold tracking-tight">Historique</h1>

      <p className="mt-2 text-sm text-slate-400">
        Retrouvez vos opérations et suivez vos retraits.
      </p>
    </header>

    <section className="mb-7 grid grid-cols-2 gap-3">
      <div className="rounded-3xl border border-white/10 bg-[#0a1c27] p-4">
        <p className="text-xs text-slate-400">Opérations affichées</p>
        <p className="mt-2 text-2xl font-bold">
          {withdrawals.length + transactions.length}
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0a1c27] p-4">
        <p className="text-xs text-slate-400">Demandes de retrait</p>
        <p className="mt-2 text-2xl font-bold">{withdrawals.length}</p>
      </div>
    </section>

    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Mes retraits</h2>

        <Link
          href="/withdrawal"
          className="rounded-xl border border-[#18d5c4]/20 bg-[#18d5c4]/10 px-3 py-2 text-xs font-semibold text-[#18d5c4] transition hover:bg-[#18d5c4]/20"
        >
          + Nouveau retrait
        </Link>
      </div>

      {withdrawals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#081923] px-5 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl text-slate-400">
            ◷
          </div>

          <h3 className="font-semibold">
            Aucun retrait pour le moment
          </h3>

          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-400">
            Vos demandes apparaîtront ici avec leur statut et leur montant
            net.
          </p>

          <Link
            href="/withdrawal"
            className="mt-5 inline-flex rounded-xl bg-[#18d5c4] px-5 py-3 text-sm font-bold text-[#041018] transition hover:bg-[#5ce8dc]"
          >
            Demander un retrait
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => {
            const status =
              STATUS_CONFIG[
                withdrawal.status as keyof typeof STATUS_CONFIG
              ] ?? STATUS_CONFIG.PENDING;

            return (
              <article
                key={withdrawal.id}
                className="rounded-3xl border border-white/10 bg-[#0a1c27] p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">
                      Demande de retrait
                    </p>
                    <h3 className="mt-1 text-xl font-bold">
                      {formatAmount(withdrawal.amount)}
                    </h3>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="my-4 h-px bg-white/[0.07]" />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Réseau</span>
                    <span className="font-medium">Moov Money</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Numéro</span>
                    <span className="font-medium">{withdrawal.phone}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Frais</span>
                    <span className="font-medium">
                      {formatAmount(withdrawal.fee)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Montant net</span>
                    <span className="font-bold text-[#18d5c4]">
                      {formatAmount(withdrawal.netAmount)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/10 p-3">
                  <p className="text-xs leading-5 text-slate-300">
                    {status.description}
                  </p>

                  {withdrawal.status === "REFUSED" &&
                    withdrawal.rejectionReason && (
                      <p className="mt-2 text-xs leading-5 text-red-300">
                        Motif du refus: {withdrawal.rejectionReason}
                      </p>
                    )}
                </div>

                <p className="mt-4 text-[11px] text-slate-500">
                  Demande créée le {formatDate(withdrawal.createdAt)}
                </p>

                {withdrawal.completedAt && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Traitée le {formatDate(withdrawal.completedAt)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>

    <section>
      <h2 className="mb-4 text-lg font-bold">Autres opérations</h2>

      {transactions.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[#0a1c27] p-5 text-center">
          <p className="text-sm text-slate-400">
            Aucune autre opération enregistrée pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const isPositive =
              transaction.type === "DEPOSIT" ||
              transaction.type === "REFERRAL_REWARD" ||
              transaction.type === "INVESTMENT_RETURN";

            return (
              <article
                key={transaction.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a1c27] p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {typeLabels[transaction.type] ?? transaction.type}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-400">
                    {transaction.description || "Opération Nova Invest"}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>

                <p
                  className={`shrink-0 text-sm font-bold ${
                    isPositive ? "text-[#18d5c4]" : "text-white"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {formatAmount(transaction.amount)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  </div>

  <BottomNavigation />
</main>

);
}

export default function HistoryPage() {
return (
<Suspense fallback={<HistorySkeleton />}> <HistoryContent /> </Suspense>
);
}
