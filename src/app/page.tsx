"use client";

import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    question: "Qu'est-ce que Nova Invest ?",
    answer:
      "Nova Invest est une plateforme qui permet à ses utilisateurs de placer leur argent sur différents produits d'investissement et de récupérer leur capital ainsi que leurs gains à l'échéance.",
  },
  {
    question: "Comment commencer à investir ?",
    answer:
      "Créez simplement votre compte, effectuez un dépôt, puis choisissez le produit d'investissement qui vous convient depuis votre espace personnel.",
  },
  {
    question: "Comment effectuer un dépôt ?",
    answer:
      "Les dépôts sont effectués via TMoney. Une fois votre paiement confirmé, le montant est automatiquement ajouté à votre Solde à investir.",
  },
  {
    question: "Quand est-ce que je reçois mes gains ?",
    answer:
      "À la date d'échéance de votre investissement, votre capital et vos gains sont automatiquement transférés vers votre Solde à retirer.",
  },
  {
    question: "Puis-je retirer mon argent ?",
    answer:
      "Oui. Dès qu'un investissement arrive à échéance et que le montant apparaît dans votre Solde à retirer, vous pouvez effectuer une demande de retrait.",
  },
  {
    question: "Quels sont les frais de retrait ?",
    answer:
      "Des frais fixes de 500 FCFA sont appliqués à chaque retrait. Ils sont déduits directement du montant demandé.",
  },
  {
    question: "Quel réseau est utilisé pour les retraits ?",
    answer:
      "Les retraits sont effectués via Moov Money.",
  },
  {
    question: "Comment fonctionne le parrainage ?",
    answer:
      "Chaque utilisateur dispose d'un lien de parrainage personnel. Lorsqu'une personne s'inscrit avec votre lien et réalise son premier investissement, vous recevez une récompense de 500 FCFA.",
  },
  {
    question: "La récompense de parrainage est-elle versée plusieurs fois ?",
    answer:
      "Non. La récompense de 500 FCFA est attribuée une seule fois pour chaque personne que vous avez parrainée, après son premier investissement.",
  },
  {
    question: "Comment accéder à mon espace personnel ?",
    answer:
      "Après votre inscription, connectez-vous avec votre numéro ou votre pseudo et votre mot de passe pour accéder à votre tableau de bord.",
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen overflow-hidden bg-[#06141d] text-white">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-180px] top-[-180px] h-[500px] w-[500px] rounded-full bg-[#11d9c5]/10 blur-[120px]" />
        <div className="absolute right-[-200px] top-[20%] h-[500px] w-[500px] rounded-full bg-[#0b7cff]/10 blur-[140px]" />
        <div className="absolute bottom-[-250px] left-[30%] h-[500px] w-[500px] rounded-full bg-[#11d9c5]/5 blur-[130px]" />
      </div>

      {/* Navbar */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#06141d]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#17e4cf] to-[#0878ff] shadow-[0_0_30px_rgba(23,228,207,0.2)]">
              <span className="text-lg font-black text-[#06141d]">N</span>
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight">
                Nova<span className="text-[#17e4cf]"> Invest</span>
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a
              href="#accueil"
              className="transition hover:text-[#17e4cf]"
            >
              Accueil
            </a>

            <a
              href="#fonctionnement"
              className="transition hover:text-[#17e4cf]"
            >
              Comment ça marche
            </a>

            <a
              href="#faq"
              className="transition hover:text-[#17e4cf]"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5 sm:block"
            >
              Se connecter
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-[#17e4cf] px-4 py-2.5 text-sm font-bold text-[#06141d] shadow-[0_0_25px_rgba(23,228,207,0.15)] transition hover:-translate-y-0.5 hover:bg-[#32f0dd]"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        id="accueil"
        className="relative flex min-h-screen items-center px-5 pb-20 pt-32 lg:px-8"
      >
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#17e4cf]/20 bg-[#17e4cf]/5 px-4 py-2 text-sm text-[#8ff8ed]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#17e4cf]" />
              Une nouvelle façon de faire travailler votre argent
            </div>

            <h1 className="text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-8xl">
              Faites travailler
              <span className="block bg-gradient-to-r from-[#17e4cf] via-[#38e9da] to-[#5ba7ff] bg-clip-text text-transparent">
                votre argent.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              Une plateforme simple pour investir, suivre vos placements et
              récupérer votre capital et vos gains à l'échéance.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group flex items-center justify-center gap-2 rounded-2xl bg-[#17e4cf] px-7 py-4 font-bold text-[#06141d] transition hover:-translate-y-1 hover:bg-[#32f0dd]"
              >
                Créer un compte
                <span className="transition group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <Link
                href="/login"
                className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-4 font-semibold text-white transition hover:border-[#17e4cf]/30 hover:bg-white/[0.06]"
              >
                Se connecter
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-[#17e4cf]">✓</span>
                Simple
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#17e4cf]">✓</span>
                Transparent
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#17e4cf]">✓</span>
                Rapide
              </div>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-0 rounded-[40px] bg-[#17e4cf]/10 blur-[90px]" />

            <div className="relative rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Vue d'ensemble</p>
                  <p className="mt-1 text-lg font-bold">Mon portefeuille</p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17e4cf]/10 text-[#17e4cf]">
                  ↗
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#06141d]/80 p-5">
                <p className="text-sm text-slate-500">Solde à investir</p>
                <p className="mt-2 text-3xl font-black">25 000 FCFA</p>

                <div className="mt-6 h-24 overflow-hidden rounded-xl bg-gradient-to-t from-[#17e4cf]/10 to-transparent">
                  <svg
                    viewBox="0 0 500 100"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 88 C55 82 70 68 115 73 C155 78 173 53 220 58 C270 64 275 37 325 45 C365 51 400 18 440 28 C465 34 480 15 500 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-[#17e4cf]"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-xs text-slate-500">Solde à retirer</p>
                  <p className="mt-2 text-xl font-bold">15 000 FCFA</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-xs text-slate-500">Investissement actif</p>
                  <p className="mt-2 text-xl font-bold text-[#17e4cf]">
                    01
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#17e4cf]/10 bg-[#17e4cf]/5 p-4">
                <div>
                  <p className="text-xs text-slate-500">Prochaine échéance</p>
                  <p className="mt-1 font-semibold">Dans 5 jours</p>
                </div>

                <span className="rounded-full bg-[#17e4cf]/10 px-3 py-1 text-xs font-medium text-[#7ff7ea]">
                  Actif
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="fonctionnement"
        className="border-t border-white/[0.06] px-5 py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#17e4cf]">
              Comment ça marche
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Investir en quelques étapes.
            </h2>

            <p className="mt-5 text-slate-400">
              Un parcours pensé pour être simple, clair et accessible.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                number: "01",
                title: "Créez votre compte",
                text: "Inscrivez-vous rapidement et accédez à votre espace personnel.",
              },
              {
                number: "02",
                title: "Déposez de l'argent",
                text: "Ajoutez de l'argent à votre Solde à investir via TMoney.",
              },
              {
                number: "03",
                title: "Choisissez un produit",
                text: "Sélectionnez le produit d'investissement qui vous convient.",
              },
              {
                number: "04",
                title: "Recevez votre capital",
                text: "À l'échéance, votre capital et vos gains sont disponibles au retrait.",
              },
            ].map((item) => (
              <div
                key={item.number}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-7 transition duration-300 hover:-translate-y-1 hover:border-[#17e4cf]/20 hover:bg-white/[0.04]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17e4cf]/10 font-bold text-[#17e4cf]">
                  {item.number}
                </div>

                <h3 className="mt-7 text-xl font-bold">{item.title}</h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {item.text}
                </p>

                <div className="absolute -bottom-10 -right-10 h-24 w-24 rounded-full bg-[#17e4cf]/5 blur-2xl transition group-hover:bg-[#17e4cf]/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Nova Invest */}
      <section className="px-5 py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#17e4cf]">
              Pourquoi Nova Invest
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Une expérience pensée autour de vous.
            </h2>

            <p className="mt-5 max-w-lg leading-7 text-slate-400">
              Suivez vos opérations depuis un espace unique et gardez une
              vision claire de votre parcours.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: "✦",
                title: "Simplicité",
                text: "Une interface claire pour gérer facilement vos opérations.",
              },
              {
                icon: "◈",
                title: "Transparence",
                text: "Vos montants, échéances et opérations restent accessibles.",
              },
              {
                icon: "↗",
                title: "Rapidité",
                text: "Des opérations pensées pour être traitées rapidement.",
              },
              {
                icon: "✓",
                title: "Sécurité",
                text: "Votre espace personnel est protégé et vos opérations sont suivies.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/[0.025] p-7"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#17e4cf]/10 text-lg text-[#17e4cf]">
                  {item.icon}
                </div>

                <h3 className="mt-5 text-lg font-bold">{item.title}</h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral */}
      <section className="px-5 py-24 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-[#17e4cf]/15 bg-gradient-to-br from-[#0b252d] via-[#081922] to-[#07111a] p-8 sm:p-12 lg:p-16">
          <div className="absolute right-[-100px] top-[-100px] h-72 w-72 rounded-full bg-[#17e4cf]/10 blur-[80px]" />

          <div className="relative grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#17e4cf]">
                Programme de parrainage
              </p>

              <h2 className="mt-4 text-3xl font-black sm:text-5xl">
                Invitez vos proches.
                <span className="block text-slate-400">
                  Gagnez ensemble.
                </span>
              </h2>

              <p className="mt-5 leading-7 text-slate-400">
                Partagez votre lien personnel. Lorsqu'un filleul réalise son
                premier investissement, vous recevez une récompense.
              </p>

              <Link
                href="/register"
                className="mt-8 inline-flex rounded-2xl bg-[#17e4cf] px-6 py-3.5 font-bold text-[#06141d] transition hover:bg-[#32f0dd]"
              >
                Créer mon compte
              </Link>
            </div>

            <div className="flex h-48 w-48 flex-col items-center justify-center rounded-full border border-[#17e4cf]/20 bg-[#17e4cf]/5 shadow-[0_0_80px_rgba(23,228,207,0.12)]">
              <span className="text-5xl font-black text-[#17e4cf]">
                500
              </span>

              <span className="mt-1 text-sm font-semibold text-slate-300">
                FCFA
              </span>

              <span className="mt-1 text-xs text-slate-500">
                par filleul
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#17e4cf]">
              FAQ
            </p>

            <h2 className="mt-4 text-3xl font-black sm:text-5xl">
              Vos questions, nos réponses.
            </h2>
          </div>

          <div className="mt-12 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq(isOpen ? null : index)
                    }
                    className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition hover:bg-white/[0.03] sm:px-6"
                  >
                    <span className="font-semibold">{faq.question}</span>

                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-400 transition ${
                        isOpen ? "rotate-45 text-[#17e4cf]" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 text-sm leading-7 text-slate-400 sm:px-6">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24 pt-10 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.025] px-6 py-16 sm:px-10">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#17e4cf]">
              Commencez maintenant
            </p>

            <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
              Prêt à faire travailler
              <span className="block text-[#17e4cf]">
                votre argent ?
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-slate-400">
              Créez votre compte et découvrez une expérience d'investissement
              simple et moderne.
            </p>

            <Link
              href="/register"
              className="mt-8 inline-flex rounded-2xl bg-[#17e4cf] px-8 py-4 font-bold text-[#06141d] shadow-[0_0_40px_rgba(23,228,207,0.15)] transition hover:-translate-y-1 hover:bg-[#32f0dd]"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#17e4cf] to-[#0878ff]">
              <span className="font-black text-[#06141d]">N</span>
            </div>

            <span className="font-bold">
              Nova<span className="text-[#17e4cf]"> Invest</span>
            </span>
          </Link>

          <div className="flex flex-wrap gap-6 text-sm text-slate-500">
            <a href="#accueil" className="transition hover:text-white">
              Accueil
            </a>

            <a
              href="#fonctionnement"
              className="transition hover:text-white"
            >
              Comment ça marche
            </a>

            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>

            <Link href="/login" className="transition hover:text-white">
              Connexion
            </Link>

            <Link href="/register" className="transition hover:text-white">
              Inscription
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-white/[0.06] pt-6 text-xs text-slate-600">
          © 2026 Nova Invest. Tous droits réservés.
        </div>
      </footer>
    </main>
  );
}