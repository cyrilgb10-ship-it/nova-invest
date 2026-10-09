import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PurchaseButton from "@/components/PurchaseButton";

export const instant = false;

export default async function ProductsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const products = await prisma.investmentProduct.findMany({
    where: {
      active: true,
    },
    orderBy: {
      investmentAmount: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-[#f7fbfc] pb-28 text-[#071827]">
      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Nova Invest
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Produits d’investissement
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
          >
            Retour
          </Link>
        </div>
      </header>

      {/* Intro */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-8 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#071827] px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Nos produits
            </p>

            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Choisissez votre investissement
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              Sélectionnez le produit qui correspond à votre capital et à
              la durée souhaitée.
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product, index) => {
            const isFeatured = index === products.length - 1;

            return (
              <article
                key={product.id}
                className={`group relative overflow-hidden rounded-[2rem] border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  isFeatured
                    ? "border-cyan-300 ring-1 ring-cyan-200"
                    : "border-slate-200"
                }`}
              >
                {isFeatured && (
                  <div className="absolute right-5 top-5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                    Populaire
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Produit {index + 1}
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-[#071827]">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v18M7 8.5h7.5a3 3 0 0 1 0 6H9.5a3 3 0 0 0 0 6H17"
                      />
                    </svg>
                  </div>
                </div>

                {/* Amount */}
                <div className="mt-7 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Montant à investir
                  </p>

                  <p className="mt-1 text-2xl font-bold text-[#071827]">
                    {product.investmentAmount.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>

                {/* Details */}
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">
                      À l’échéance
                    </span>

                    <span className="text-sm font-bold text-cyan-700">
                      {product.returnAmount.toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">
                      Votre gain
                    </span>

                    <span className="text-sm font-bold text-emerald-600">
                      +{product.profitAmount.toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">
                      Durée
                    </span>

                    <span className="text-sm font-semibold text-slate-800">
                      {product.durationDays}{" "}
                      {product.durationDays > 1 ? "jours" : "jour"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Limite d’achat
                    </span>

                    <span className="text-sm font-semibold text-slate-800">
                      {product.purchaseLimit
                        ? `${product.purchaseLimit} achats`
                        : "Illimitée"}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <PurchaseButton productId={product.id} />
              </article>
            );
          })}
        </div>

        {products.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="font-semibold text-slate-700">
              Aucun produit disponible.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Les produits d’investissement seront bientôt disponibles.
            </p>
          </div>
        )}
      </section>

      {/* Bottom navigation */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-3xl border border-white/10 bg-[#071827]/95 p-2 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-5 gap-1">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-slate-400 transition hover:text-white"
          >
            <span className="text-lg">⌂</span>
            <span className="text-[10px] font-medium">Accueil</span>
          </Link>

          <Link
            href="/products"
            className="flex flex-col items-center gap-1 rounded-2xl bg-cyan-500/15 px-2 py-2.5 text-cyan-300"
          >
            <span className="text-lg">◈</span>
            <span className="text-[10px] font-semibold">Produits</span>
          </Link>

          <Link
            href="/investments"
            className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-slate-400 transition hover:text-white"
          >
            <span className="text-lg">↗</span>
            <span className="text-[10px] font-medium">
              Investissements
            </span>
          </Link>

          <Link
            href="/history"
            className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-slate-400 transition hover:text-white"
          >
            <span className="text-lg">◷</span>
            <span className="text-[10px] font-medium">Historique</span>
          </Link>

          <Link
            href="/account"
            className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-slate-400 transition hover:text-white"
          >
            <span className="text-lg">◎</span>
            <span className="text-[10px] font-medium">Mon compte</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}
