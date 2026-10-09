import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export const instant = false;

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  SUCCESS: "Réussi",
  FAILED: "Échoué",
};

const statusStyles: Record<string, string> = {
  PENDING: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  SUCCESS: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  FAILED: "border-red-500/20 bg-red-500/10 text-red-300",
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

export default async function AdminDepositsPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  const [
    deposits,
    total,
    pending,
    successful,
    failed,
    successfulAmounts,
  ] = await Promise.all([
    prisma.deposit.findMany({
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

    prisma.deposit.count(),

    prisma.deposit.count({
      where: { status: "PENDING" },
    }),

    prisma.deposit.count({
      where: { status: "SUCCESS" },
    }),

    prisma.deposit.count({
      where: { status: "FAILED" },
    }),

    prisma.deposit.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-flex text-sm text-cyan-400 transition hover:text-cyan-300"
            >
              ← Retour à l’administration
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              Gestion des dépôts
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Consulte les dépôts et suis les paiements des membres.
            </p>
          </div>

          <Link
            href="/admin/history"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
          >
            Historique global
          </Link>
        </header>

        {/* Statistiques */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total des dépôts"
            value={total.toString()}
            accent="text-white"
          />

          <StatCard
            label="En attente"
            value={pending.toString()}
            accent="text-amber-300"
          />

          <StatCard
            label="Réussis"
            value={successful.toString()}
            accent="text-emerald-300"
          />

          <StatCard
            label="Échoués"
            value={failed.toString()}
            accent="text-red-300"
          />

          <StatCard
            label="Montant confirmé"
            value={formatAmount(successfulAmounts._sum.amount ?? 0)}
            accent="text-cyan-300"
          />
        </section>

        {/* Tableau des dépôts */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a2b]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-semibold">Tous les dépôts</h2>
              <p className="mt-1 text-xs text-slate-500">
                Les dépôts les plus récents apparaissent en premier.
              </p>
            </div>

            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
              {deposits.length} dépôt(s)
            </span>
          </div>

          {deposits.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mb-3 text-4xl">↓</div>

              <h3 className="font-semibold">Aucun dépôt enregistré</h3>

              <p className="mt-2 text-sm text-slate-400">
                Les dépôts effectués par les membres apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Membre</th>
                    <th className="px-5 py-4">Téléphone</th>
                    <th className="px-5 py-4">Montant</th>
                    <th className="px-5 py-4">Réseau</th>
                    <th className="px-5 py-4">Fournisseur</th>
                    <th className="px-5 py-4">Référence</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {deposits.map((deposit) => (
                    <tr
                      key={deposit.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {deposit.user.firstName} {deposit.user.lastName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          @{deposit.user.username}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {deposit.user.phone}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {formatAmount(deposit.amount)}
                      </td>

                      <td className="px-5 py-4 uppercase text-slate-300">
                        {deposit.network}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {deposit.provider}
                      </td>

                      <td className="max-w-[200px] truncate px-5 py-4 text-xs text-slate-400">
                        {deposit.externalId || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            statusStyles[deposit.status] ??
                            "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          {statusLabels[deposit.status] ?? deposit.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                        {formatDate(deposit.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-5 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.04] p-4 text-sm leading-6 text-slate-400">
          <p>
            <span className="font-semibold text-cyan-300">Information :</span>{" "}
            cette page est en lecture seule. Le statut affiché correspond à
            celui enregistré dans la base de données. Un dépôt en attente
            n'est pas considéré comme un paiement confirmé.
          </p>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1a2b] p-5">
      <p className="text-sm text-slate-400">{label}</p>

      <p className={`mt-3 break-words text-2xl font-bold ${accent}`}>
        {value}
      </p>
    </div>
  );
}