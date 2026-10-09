"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: string;
  referralCode: string;
  createdAt: string;
};

const initialPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [form, setForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [referralError, setReferralError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Impossible de charger le profil.");
        }

        const user = data.user as Profile;

        setProfile(user);

        setForm({
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email ?? "",
        });
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

    loadProfile();
  }, []);

  const referralLink =
    typeof window !== "undefined" && profile?.referralCode
      ? `${window.location.origin}/register?ref=${encodeURIComponent(
          profile.referralCode
        )}`
      : "";

  async function handleCopyReferralLink() {
    if (!referralLink) {
      setReferralError("Le lien de parrainage est indisponible.");
      return;
    }

    setCopying(true);
    setCopied(false);
    setReferralError("");

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const textArea = document.createElement("textarea");

        textArea.value = referralLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.setAttribute("readonly", "");

        document.body.appendChild(textArea);
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("COPY_FAILED");
        }
      }

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch {
      setReferralError(
        "Impossible de copier automatiquement le lien. Sélectionnez-le et copiez-le manuellement."
      );
    } finally {
      setCopying(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "La modification a échoué.");
      }

      setProfile((previous) =>
        previous
          ? { ...previous, ...data.user }
          : data.user
      );

      setForm({
        username: data.user.username,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        phone: data.user.phone,
        email: data.user.email ?? "",
      });

      setMessage(data.message || "Profil mis à jour avec succès.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage("");
    setPasswordError("");

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de modifier le mot de passe."
        );
      }

      setPasswordMessage(data.message);
      setPasswordForm(initialPasswordForm);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-[#071923] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#18d5c4]/60 focus:ring-2 focus:ring-[#18d5c4]/10";

  const labelClass = "block text-sm font-medium text-slate-300";

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06131f] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#18d5c4]" />
          <p className="text-sm text-slate-400">
            Chargement du profil...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06131f] px-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">
            🔒
          </div>

          <h1 className="mt-5 text-xl font-bold">
            Profil indisponible
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {error || "Connectez-vous pour accéder à votre compte."}
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-2xl bg-[#18d5c4] px-5 py-3 font-semibold text-[#041018] transition hover:bg-[#25e4d3]"
          >
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06131f] px-4 pb-32 pt-6 text-white sm:px-6 sm:pt-8">
      {/* Effets lumineux */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#18d5c4]/10 blur-3xl" />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        {/* En-tête */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-[#18d5c4] transition hover:text-[#25e4d3]"
            >
              ← Retour à l'accueil
            </Link>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Mon <span className="text-[#18d5c4]">compte</span>
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Gérez vos informations personnelles et votre sécurité.
            </p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#18d5c4]/20 bg-gradient-to-br from-[#18d5c4]/15 to-blue-500/10 text-lg font-bold text-[#18d5c4] sm:h-16 sm:w-16">
            {profile.firstName.charAt(0).toUpperCase()}
            {profile.lastName.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Résumé du compte */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d2835] via-[#09202d] to-[#071721] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18d5c4]/10 text-2xl font-bold text-[#18d5c4]">
              {profile.firstName.charAt(0).toUpperCase()}
              {profile.lastName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-400">
                Bienvenue sur Nova Invest
              </p>

              <h2 className="mt-1 break-words text-2xl font-bold">
                {profile.firstName} {profile.lastName}
              </h2>

              <p className="mt-1 break-all text-sm text-slate-400">
                @{profile.username}
              </p>
            </div>

            <span className="w-fit rounded-full border border-[#18d5c4]/20 bg-[#18d5c4]/10 px-4 py-2 text-xs font-semibold text-[#18d5c4]">
              {profile.role === "ADMIN" ? "Administrateur" : "Membre"}
            </span>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-xs text-slate-500">Membre depuis</p>
            <p className="mt-1 text-sm font-medium text-slate-200">
              {new Date(profile.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </section>

        {/* Parrainage */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-[#18d5c4]/20 bg-gradient-to-br from-[#0d2835] via-[#09202d] to-[#071721] p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#18d5c4]/10 text-2xl">
              🎁
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#18d5c4]">
                Programme de parrainage
              </p>

              <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                Invitez vos proches
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Partagez votre lien personnel. Lorsqu'un filleul effectue
                son premier investissement et que les conditions du
                programme sont remplies, le bonus de parrainage prévu
                peut être attribué.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#06131f]/70 p-4 sm:p-5">
            <p className="text-sm font-medium text-slate-300">
              Votre code de parrainage
            </p>

            <div className="mt-2 flex items-center gap-3">
              <div className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-lg font-bold tracking-wide text-[#18d5c4]">
                {profile.referralCode || "Code indisponible"}
              </div>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-300">
              Votre lien de parrainage
            </p>

            <div className="mt-2 break-all rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300">
              {referralLink || "Lien indisponible"}
            </div>

            <button
              type="button"
              onClick={handleCopyReferralLink}
              disabled={copying || !referralLink}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18d5c4] px-5 py-3.5 font-semibold text-[#041018] transition hover:bg-[#25e4d3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copying ? (
                "Copie en cours..."
              ) : copied ? (
                <>
                  <span aria-hidden="true">✓</span>
                  Lien copié !
                </>
              ) : (
                <>
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <rect x="8" y="8" width="12" height="12" rx="2" />
                    <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
                  </svg>
                  Copier le lien de parrainage
                </>
              )}
            </button>

            {copied && (
              <p
                role="status"
                className="mt-3 text-center text-sm text-emerald-300"
              >
                Votre lien a été copié. Vous pouvez maintenant le partager.
              </p>
            )}

            {referralError && (
              <p
                role="alert"
                className="mt-3 text-sm leading-5 text-red-300"
              >
                {referralError}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
            <span className="text-xl" aria-hidden="true">
              💰
            </span>

            <p className="text-sm leading-6 text-slate-300">
              <span className="font-semibold text-amber-300">
                Bonus prévu : 500 FCFA.
              </span>{" "}
              Le bonus est attribué au parrain lors du premier investissement
              du filleul, conformément aux règles du programme.
            </p>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Informations personnelles */}
          <section className={cardClass}>
            <div className="mb-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#18d5c4]/10 text-xl text-[#18d5c4]">
                👤
              </div>

              <h2 className="text-xl font-bold">
                Informations personnelles
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Maintenez vos coordonnées à jour.
              </p>
            </div>

            {message && (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
              >
                {message}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Prénom
                  <input
                    className={inputClass}
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    autoComplete="given-name"
                    maxLength={60}
                    required
                  />
                </label>

                <label className={labelClass}>
                  Nom
                  <input
                    className={inputClass}
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    autoComplete="family-name"
                    maxLength={60}
                    required
                  />
                </label>
              </div>

              <label className={labelClass}>
                Nom d'utilisateur
                <input
                  className={inputClass}
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                  required
                />
              </label>

              <label className={labelClass}>
                Numéro de téléphone
                <input
                  className={inputClass}
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  autoComplete="tel"
                  maxLength={20}
                  required
                />
              </label>

              <label className={labelClass}>
                Adresse e-mail
                <input
                  className={inputClass}
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                />

                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  Cette adresse sera utilisée pour vos dépôts SasPay.
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-[#18d5c4] px-5 py-3.5 font-semibold text-[#041018] transition hover:bg-[#25e4d3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </button>
            </form>
          </section>

          {/* Sécurité */}
          <section className={cardClass}>
            <div className="mb-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-xl text-blue-300">
                🔐
              </div>

              <h2 className="text-xl font-bold">Sécurité du compte</h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Modifiez votre mot de passe en toute sécurité.
              </p>
            </div>

            {passwordMessage && (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
              >
                {passwordMessage}
              </div>
            )}

            {passwordError && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
              >
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <label className={labelClass}>
                Mot de passe actuel
                <input
                  className={inputClass}
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                  autoComplete="current-password"
                  required
                />
              </label>

              <label className={labelClass}>
                Nouveau mot de passe
                <input
                  className={inputClass}
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />

                <span className="mt-2 block text-xs text-slate-500">
                  8 caractères minimum.
                </span>
              </label>

              <label className={labelClass}>
                Confirmer le nouveau mot de passe
                <input
                  className={inputClass}
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full rounded-2xl border border-[#18d5c4]/30 bg-[#18d5c4]/10 px-5 py-3.5 font-semibold text-[#18d5c4] transition hover:bg-[#18d5c4]/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPassword
                  ? "Modification..."
                  : "Modifier mon mot de passe"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#071923]/70 p-4">
              <p className="text-sm font-semibold text-slate-200">
                Protection de votre compte
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Ne partagez jamais votre mot de passe. Choisissez un mot de
                passe unique que vous n'utilisez pas sur d'autres sites.
              </p>
            </div>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          Nova Invest · Votre compte personnel
        </p>
      </div>

      {/* Navigation fixe */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
        <div className="mx-auto flex max-w-xl items-center justify-around rounded-3xl border border-white/10 bg-[#071923]/95 px-2 py-2 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <Link
            href="/dashboard"
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
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
            <span className="text-[10px] font-medium">Accueil</span>
          </Link>

          <Link
            href="/products"
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
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
            <span className="text-[10px] font-medium">Produits</span>
          </Link>

          <Link
            href="/investments"
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
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
            <span className="text-[10px] font-medium">Investissements</span>
          </Link>

          <Link
            href="/history"
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-slate-500 transition hover:text-white"
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
            <span className="text-[10px] font-medium">Historique</span>
          </Link>

          <Link
            href="/profile"
            aria-current="page"
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[#18d5c4]"
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
            <span className="text-[10px] font-medium">Mon compte</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}