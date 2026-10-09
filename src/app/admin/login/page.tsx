"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/auth/login", {
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
          data.error || "Impossible de se connecter."
        );
      }

      window.location.href = "/admin";
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
    <main className="relative min-h-screen overflow-hidden bg-[#06141c] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />

        <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-cyan-500 text-xl font-black text-[#06141c] shadow-lg shadow-cyan-500/20">
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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-1.5 text-xs font-semibold text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                ACCÈS SÉCURISÉ
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Administration
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Connectez-vous pour accéder à la gestion de Nova Invest.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm leading-6 text-red-300"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Identifiant administrateur
                </label>

                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) =>
                    setIdentifier(event.target.value)
                  }
                  placeholder="Votre pseudo ou numéro"
                  required
                  autoComplete="username"
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:bg-white/[0.07] disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Mot de passe
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Votre mot de passe"
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 pr-24 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:bg-white/[0.07] disabled:opacity-50"
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

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-cyan-400 px-5 text-sm font-bold text-[#06141c] shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Vérification en cours..."
                  : "Accéder à l'administration"}
              </button>
            </form>

            <div className="mt-7 border-t border-white/10 pt-6">
              <Link
                href="/login"
                className="flex items-center justify-center text-sm text-slate-400 transition hover:text-cyan-300"
              >
                Retour à la connexion des membres
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            Espace réservé aux administrateurs autorisés.
          </p>

          <p className="mt-2 text-center text-xs text-slate-700">
            © 2026 Nova Invest. Tous droits réservés.
          </p>
        </div>
      </div>
    </main>
  );
}