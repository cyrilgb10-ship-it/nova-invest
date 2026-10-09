import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";

export const instant = false;

const adminSections = [
  {
    title: "Utilisateurs",
    description:
      "Consulter les membres, rechercher un compte et vérifier les soldes.",
    href: "/admin/users",
    number: "01",
  },
  {
    title: "Dépôts",
    description:
      "Suivre les dépôts des membres et leur validation.",
    href: "/admin/deposits",
    number: "02",
  },
  {
    title: "Retraits en attente",
    description:
      "Examiner les nouvelles demandes de retrait.",
    href: "/admin/withdrawals",
    number: "03",
  },
  {
    title: "Finalisation des retraits",
    description:
      "Terminer le traitement des demandes en cours.",
    href: "/admin/withdrawals/finalize",
    number: "04",
  },
  {
    title: "Historique des retraits",
    description:
      "Consulter les retraits acceptés ou refusés.",
    href: "/admin/withdrawals/history",
    number: "05",
  },
  {
    title: "Historique global",
    description:
      "Consulter les transactions et opérations financières de la plateforme.",
    href: "/admin/history",
    number: "06",
  },
];

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#06141c] text-white">
      {/* En-tête */}
      <header className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-cyan-500 text-xl font-black text-[#06141c]">
              N
            </div>

            <div>
              <p className="font-bold">
                Nova <span className="text-cyan-300">Invest</span>
              </p>

              <p className="text-xs text-slate-500">
                Administration
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
          >
            Espace membre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Présentation */}
        <section className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            SESSION ADMINISTRATEUR
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tableau de bord
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Gérez les membres, les dépôts, les retraits et les opérations
            financières de Nova Invest depuis votre espace d'administration.
          </p>
        </section>

        {/* Administrateur connecté */}
        <section className="mb-10 rounded-2xl border border-cyan-400/15 bg-gradient-to-r from-cyan-400/[0.08] to-blue-500/[0.04] p-6 sm:p-8">
          <p className="text-sm text-slate-400">
            Connecté en tant qu'administrateur
          </p>

          <h2 className="mt-2 text-xl font-bold">
            {admin.username}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Sélectionnez une rubrique pour commencer la gestion de la plateforme.
          </p>
        </section>

        {/* Navigation administrative */}
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-bold">
              Gestion de la plateforme
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Accès rapide aux différentes rubriques administratives.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {adminSections.map((section) => (
              <Link
                key={section.number}
                href={section.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-200 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.05]"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-sm font-bold text-cyan-300">
                    {section.number}
                  </span>

                  <span className="text-xl text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300">
                    →
                  </span>
                </div>

                <h3 className="text-lg font-bold">
                  {section.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {section.description}
                </p>

                <p className="mt-5 text-xs font-semibold text-cyan-300">
                  Ouvrir la rubrique →
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Pied de page */}
        <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-slate-600">
          Nova Invest · Administration sécurisée
        </footer>
      </div>
    </main>
  );
}