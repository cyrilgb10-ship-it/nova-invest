import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export const instant = false;

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  PROCESSING: "En cours",
  PAID: "Payé",
  REFUSED: "Refusé",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  PAID: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  REFUSED: "bg-red-500/10 text-red-300 border-red-500/20",
};

function formatAmount(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lome",
  }).format(date);
}

export default async function WithdrawalHistoryPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  const [withdrawals, total, paid, pending, refused, totalPaid] =
    await Promise.all([
      prisma.withdrawal.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      }),
      prisma.withdrawal.count(),
      prisma.withdrawal.count({ where: { status: "PAID" } }),
      prisma.withdrawal.count({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
      }),
      prisma.withdrawal.count({ where: { status: "REFUSED" } }),
      prisma.withdrawal.aggregate({
        where: { status: "PAID" },
        _sum: { netAmount: true },
      }),
    ]);

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-flex text-sm text-cyan-400 transition hover:text-cyan-300"
            >
              ← Retour à l’administration
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              Historique des retraits
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Consulte et vérifie toutes les demandes de retrait des membres.
            </p>
          </div>

          <Link
            href="/admin/withdrawals"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
          >
            Demandes de retrait
          </Link>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total des demandes" value={total.toString()} />
          <StatCard label="Retraits payés" value={paid.toString()} />
          <StatCard label="En attente / en cours" value={pending.toString()} />
          <StatCard label="Refusés" value={refused.toString()} />
          <StatCard
            label="Total net payé"
            value={formatAmount(totalPaid._sum.netAmount ?? 0)}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a2b]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold">Toutes les demandes</h2>
            <span className="text-sm text-slate-400">
              {withdrawals.length} demande(s) affichée(s)
            </span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mb-3 text-4xl">↗</div>
              <h3 className="font-semibold">Aucun retrait enregistré</h3>
              <p className="mt-2 text-sm text-slate-400">
                Les demandes de retrait apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Membre</th>
                    <th className="px-5 py-4">Coordonnées</th>
                    <th className="px-5 py-4">Montant demandé</th>
                    <th className="px-5 py-4">Frais</th>
                    <th className="px-5 py-4">Montant net</th>
                    <th className="px-5 py-4">Réseau</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {withdrawals.map((withdrawal) => (
                    <tr
                      key={withdrawal.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {withdrawal.firstName} {withdrawal.lastName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          @{withdrawal.user.username}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p>{withdrawal.phone}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {withdrawal.user.phone}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {formatAmount(withdrawal.amount)}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {formatAmount(withdrawal.fee)}
                      </td>

                      <td className="px-5 py-4 font-semibold text-emerald-300">
                        {formatAmount(withdrawal.netAmount)}
                      </td>

                      <td className="px-5 py-4 uppercase text-slate-300">
                        {withdrawal.network}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            statusStyles[withdrawal.status] ??
                            "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          {statusLabels[withdrawal.status] ??
                            withdrawal.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-slate-400">
                        {formatDate(withdrawal.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Le montant net payé est calculé à partir des retraits dont le statut
          est « Payé ». Cette page est en lecture seule : elle ne modifie aucun
          solde ni aucune demande.
        </p>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1a2b] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 break-words text-2xl font-bold text-white">{value}</p>
    </div>
  );
}