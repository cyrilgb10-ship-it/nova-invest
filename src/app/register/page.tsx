"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    username: "",
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (ref) {
      setReferralCode(ref);
    }
  }, []);

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          referralCode: referralCode || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue.");
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:bg-white/[0.07]";

  return (
    <main className="min-h-screen bg-[#06141c] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-500 text-xl font-black text-[#06141c] shadow-lg shadow-cyan-500/20">
                N
              </div>

              <span className="text-xl font-bold tracking-tight">
                Nova <span className="text-cyan-300">Invest</span>
              </span>
            </Link>
          </div>

          {/* Formulaire */}
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Créer votre compte
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Rejoignez Nova Invest et commencez à faire travailler votre
                argent.
              </p>
            </div>

            {/* Code de parrainage */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Code de parrainage
              </label>

              <input
                type="text"
                value={referralCode}
                readOnly
                placeholder="Aucun code de parrainage"
                className="h-12 w-full cursor-not-allowed rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] px-4 text-sm font-semibold tracking-wider text-cyan-300 outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-600"
              />

              {referralCode ? (
                <p className="mt-2 text-xs text-cyan-300">
                  Parrainage détecté. Ce code sera automatiquement associé à
                  votre compte.
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Si vous avez reçu un lien de parrainage, le code sera rempli
                  automatiquement.
                </p>
              )}
            </div>

            {/* Erreur */}
            {error && (
              <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Pseudo + Numéro */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Pseudo
                  </label>

                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) =>
                      updateField("username", e.target.value)
                    }
                    placeholder="Votre pseudo"
                    required
                    minLength={3}
                    autoComplete="username"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Numéro
                  </label>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      updateField("phone", e.target.value)
                    }
                    placeholder="+228 90 00 00 00"
                    required
                    autoComplete="tel"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Nom + Prénom */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Nom
                  </label>

                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) =>
                      updateField("lastName", e.target.value)
                    }
                    placeholder="Votre nom"
                    required
                    autoComplete="family-name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Prénom
                  </label>

                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) =>
                      updateField("firstName", e.target.value)
                    }
                    placeholder="Votre prénom"
                    required
                    autoComplete="given-name"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Adresse e-mail */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Adresse e-mail
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    updateField("email", e.target.value)
                  }
                  placeholder="exemple@gmail.com"
                  required
                  autoComplete="email"
                  className={inputClass}
                />

                <p className="mt-2 text-xs text-slate-500">
                  Cette adresse sera utilisée automatiquement pour vos
                  paiements SasPay.
                </p>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Mot de passe
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      updateField("password", e.target.value)
                    }
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`${inputClass} pr-24`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-cyan-300 transition hover:text-cyan-200"
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Minimum 6 caractères.
                </p>
              </div>

              {/* Création du compte */}
              <button
                type="submit"
                disabled={loading}
                className="h-13 w-full rounded-xl bg-cyan-400 px-5 text-sm font-bold text-[#06141c] shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Création du compte..." : "Créer mon compte"}
              </button>
            </form>

            {/* Séparateur */}
            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-600">OU</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Connexion */}
            <p className="text-center text-sm text-slate-400">
              Vous avez déjà un compte ?
            </p>

            <Link
              href="/login"
              className="mt-3 flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-white transition hover:border-cyan-400/30 hover:bg-white/[0.06]"
            >
              Se connecter
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            En créant un compte, vous acceptez les conditions d'utilisation
            de Nova Invest.
          </p>
        </div>
      </div>
    </main>
  );
}
