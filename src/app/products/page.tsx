import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PurchaseButton from "@/components/PurchaseButton";
import PremiumPurchaseButton from "@/components/PremiumPurchaseButton";

export const instant = false;

function formatAmount(amount: number) {
return new Intl.NumberFormat("fr-FR").format(amount);
}

export default async function ProductsPage() {
const user = await getCurrentUser();

if (!user) {
redirect("/login");
}

const products = await prisma.investmentProduct.findMany({
where: {
active: true,
},
orderBy: [
{
investmentAmount: "asc",
},
{
id: "asc",
},
],
});

return ( <main className="min-h-screen bg-[#f7fbfc] pb-28 text-[#071827]">
{/* Header */} <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur-xl"> <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8"> <div> <p className="text-sm font-medium text-slate-500">
Nova Invest </p>

```
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
          Comparez les offres Normal et Premium, puis choisissez celle
          qui correspond à vos objectifs.
        </p>

        <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold sm:text-sm">
          <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-cyan-200">
            Normal : durée variable
          </span>

          <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-amber-200">
            Premium : 95 jours
          </span>
        </div>
      </div>
    </div>
  </section>

  {/* Products */}
  <section className="mx-auto max-w-6xl px-5 sm:px-8">
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product, index) => {
        const isFeatured = index === products.length - 1;

        // Le gain Premium dépend du rang du produit.
        const premiumReward = 62000 + index * 40000;
        const premiumReturn = product.investmentAmount + premiumReward;

        return (
          <article
            key={product.id}
            className={`group relative overflow-hidden rounded-[2rem] border bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6 ${
              isFeatured
                ? "border-cyan-300 ring-1 ring-cyan-200"
                : "border-slate-200"
            }`}
          >
            {isFeatured && (
              <div className="absolute right-4 top-4 rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-bold text-cyan-700 sm:text-xs">
                Dernier rang
              </div>
            )}

            {/* Product heading */}
            <div className="flex items-start justify-between gap-3 pr-1">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Produit {index + 1}
                </p>

                <h3 className="mt-2 break-words text-xl font-bold text-[#071827]">
                  {product.name}
                </h3>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
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
                    d="M12 3v18M7 8.5h7.5a3 3 0 0 1 0 6H9.5a3.5 3.5 0 0 0 0 7H17"
                  />
                </svg>
              </div>
            </div>

            {/* Shared purchase price */}
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Prix d’achat pour les deux offres
              </p>

              <p className="mt-1 text-2xl font-bold text-[#071827]">
                {formatAmount(product.investmentAmount)} FCFA
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Paiement depuis votre solde à investir
              </p>
            </div>

            {/* Normal and Premium offers */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* NORMAL */}
              <section className="flex min-w-0 flex-col rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-800">
                    Normal
                  </span>

                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-cyan-700">
                    Standard
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-500">
                    Total prévu à l’échéance
                  </p>

                  <p className="mt-1 break-words text-xl font-extrabold text-cyan-800">
                    {formatAmount(product.returnAmount)}
                  </p>

                  <p className="text-xs font-semibold text-slate-500">
                    FCFA
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Gain prévu
                    </p>

                    <p className="mt-1 break-words text-sm font-bold text-emerald-700">
                      +{formatAmount(product.profitAmount)} FCFA
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Durée
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {product.durationDays}{" "}
                      {product.durationDays > 1 ? "jours" : "jour"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Limite d’achat
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {product.purchaseLimit
                        ? `${product.purchaseLimit} achats`
                        : "Illimitée"}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <PurchaseButton productId={product.id} />
                </div>
              </section>

              {/* PREMIUM */}
              <section className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-b from-amber-50 to-white p-4">
                <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-amber-300/20 blur-2xl" />

                <div className="relative flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                    Premium
                  </span>

                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
                    95 jours
                  </span>
                </div>

                <div className="relative mt-4">
                  <p className="text-xs text-slate-500">
                    Total prévu à l’échéance
                  </p>

                  <p className="mt-1 break-words text-xl font-extrabold text-amber-800">
                    {formatAmount(premiumReturn)}
                  </p>

                  <p className="text-xs font-semibold text-slate-500">
                    FCFA
                  </p>
                </div>

                <div className="relative mt-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Gain Premium prévu
                    </p>

                    <p className="mt-1 break-words text-sm font-bold text-emerald-700">
                      +{formatAmount(premiumReward)} FCFA
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Durée
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      95 jours
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Avantage
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-5 text-amber-900">
                      Débloque un achat Normal du même rang
                    </p>
                  </div>
                </div>

                <div className="relative mt-auto pt-5">
                  <PremiumPurchaseButton
                    productId={product.id}
                    productName={product.name}
                    investmentAmount={product.investmentAmount}
                    rewardAmount={premiumReward}
                  />
                </div>
              </section>
            </div>

            <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
              Les montants affichés sont ceux configurés par la plateforme.
              Vérifiez les conditions et les risques avant tout achat.
            </p>
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
  <nav className="fixed bottom-3 left-2 right-2 z-50 mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#071827]/95 p-2 shadow-2xl backdrop-blur-xl">
    <div className="flex items-center justify-around gap-1">
      {/* Accueil */}
      <Link
        href="/dashboard"
        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-slate-400 transition hover:text-white"
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

        <span className="whitespace-nowrap text-[9px] font-medium sm:text-[10px]">
          Accueil
        </span>
      </Link>

      {/* Produits actif */}
      <Link
        href="/products"
        aria-current="page"
        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl bg-cyan-500/15 px-1 py-2.5 text-cyan-300"
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

        <span className="whitespace-nowrap text-[9px] font-semibold sm:text-[10px]">
          Produits
        </span>
      </Link>

      {/* VIP */}
      <Link
        href="/vip"
        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-amber-400 transition hover:bg-amber-400/10 hover:text-amber-300"
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m2 7 5 4 5-7 5 7 5-4-2 13H4L2 7Z" />
          <path d="M4 20h16" />
        </svg>

        <span className="whitespace-nowrap text-[9px] font-bold sm:text-[10px]">
          VIP
        </span>
      </Link>

      {/* Investissements */}
      <Link
        href="/investments"
        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-slate-400 transition hover:text-white"
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

        <span className="whitespace-nowrap text-[9px] font-medium sm:text-[10px]">
          Investissements
        </span>
      </Link>

      {/* Historique */}
      <Link
        href="/history"
        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-slate-400 transition hover:text-white"
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

        <span className="whitespace-nowrap text-[9px] font-medium sm:text-[10px]">
          Historique
        </span>
      </Link>

      {/* Mon compte */}
      <Link
        href="/profile"
        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-slate-400 transition hover:text-white"
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

        <span className="whitespace-nowrap text-[9px] font-medium sm:text-[10px]">
          Mon compte
        </span>
      </Link>
    </div>
  </nav>
</main>

);
}
