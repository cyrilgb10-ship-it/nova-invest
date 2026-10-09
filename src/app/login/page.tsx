"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Identifiants incorrects."
        );
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
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-500 text-xl font-black text-[#06141c] shadow-lg shadow-cyan-500/20">
                N
              </div>

              <span className="text-xl font-bold tracking-tight">
                Nova <span className="text-cyan-300">Invest</span>
              </span>
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">

            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Bon retour
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Connectez-vous à votre espace Nova Invest.
              </p>
            </div>

            {/* Erreur */}
            {error && (
              <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Identifiant */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Numéro ou pseudo
                </label>

                <input
                  type="text"
                  value={identifier}
                  onChange={(event) =>
                    setIdentifier(event.target.value)
                  }
                  placeholder="Votre numéro ou pseudo"
                  required
                  autoComplete="username"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:bg-white/[0.07]"
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Mot de passe
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 pr-24 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:bg-white/[0.07]"
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
              </div>

              {/* Connexion */}
              <button
                type="submit"
                disabled={loading}
                className="h-13 w-full rounded-xl bg-cyan-400 px-5 text-sm font-bold text-[#06141c] shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            {/* Inscription */}
            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="text-center text-sm text-slate-400">
                Vous n'avez pas encore de compte ?
              </p>

              <Link
                href="/register"
                className="mt-3 flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-white transition hover:border-cyan-400/30 hover:bg-white/[0.06]"
              >
                Créer un compte
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            © 2026 Nova Invest. Tous droits réservés.
          </p>
        </div>
      </div>
    </main>
  );
}
