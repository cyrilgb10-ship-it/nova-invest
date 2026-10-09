"use client";

import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        setError("Impossible de charger les notifications.");
        return;
      }

      const data: NotificationsResponse = await response.json();

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.error("NOTIFICATIONS_LOAD_ERROR:", err);
      setError("Une erreur est survenue pendant le chargement.");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        return;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );

      setUnreadCount((current) => Math.max(current - 1, 0));
    } catch (err) {
      console.error("NOTIFICATION_READ_ERROR:", err);
    }
  }

  async function markAllAsRead() {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ all: true }),
      });

      if (!response.ok) {
        return;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("NOTIFICATIONS_MARK_ALL_ERROR:", err);
    }
  }

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(() => {
      loadNotifications();
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // Empêcher le défilement de la page située derrière le panneau.
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef}>
      {/* Bouton de notifications */}
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          const nextState = !open;

          setOpen(nextState);

          if (nextState) {
            loadNotifications();
          }
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 1-5.714 0A2.25 2.25 0 0 1 7.5 14.85V11a4.5 4.5 0 1 1 9 0v3.85a2.25 2.25 0 0 1-1.643 2.232ZM9.75 19.5a2.25 2.25 0 0 0 4.5 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#06131f] bg-cyan-400 px-1 text-[10px] font-black text-[#06131f]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Interface plein écran */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex h-[100dvh] flex-col overflow-hidden bg-[#06131f] text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Centre de notifications"
        >
          {/* Arrière-plan décoratif */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#18d5c4]/10 blur-3xl" />
            <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
          </div>

          {/* En-tête fixe */}
          <header className="relative z-10 shrink-0 border-b border-white/10 bg-[#071923]/95 px-4 py-4 backdrop-blur-xl sm:px-8">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#18d5c4]/10 text-[#18d5c4]">
                  <svg
                    width="25"
                    height="25"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 0 1-5.714 0A2.25 2.25 0 0 1 7.5 14.85V11a4.5 4.5 0 1 1 9 0v3.85a2.25 2.25 0 0 1-1.643 2.232ZM9.75 19.5a2.25 2.25 0 0 0 4.5 0"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold sm:text-2xl">
                    Notifications
                  </h1>

                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                    {unreadCount > 0
                      ? `${unreadCount} notification${
                          unreadCount > 1 ? "s" : ""
                        } non lue${unreadCount > 1 ? "s" : ""}`
                      : "Tu es à jour !"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="rounded-xl border border-[#18d5c4]/20 bg-[#18d5c4]/10 px-3 py-2 text-xs font-semibold text-[#18d5c4] transition hover:bg-[#18d5c4]/20 sm:px-4 sm:text-sm"
                  >
                    Tout lire
                  </button>
                )}

                <button
                  type="button"
                  aria-label="Fermer les notifications"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m18 6-12 12M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          {/* Zone défilable */}
          <div
            className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="mx-auto w-full max-w-5xl px-4 py-5 pb-10 sm:px-8 sm:py-8">
              {/* Introduction */}
              <div className="mb-6">
                <p className="text-sm leading-6 text-slate-400">
                  Retrouve ici toutes les informations concernant tes
                  dépôts, tes investissements, tes retraits et ton
                  parrainage.
                </p>
              </div>

              {/* Chargement */}
              {loading && notifications.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#18d5c4]" />

                  <p className="mt-4 text-sm text-slate-400">
                    Chargement des notifications...
                  </p>
                </div>
              ) : error && notifications.length === 0 ? (
                <div className="rounded-3xl border border-red-400/20 bg-red-400/[0.05] px-6 py-12 text-center">
                  <p className="font-semibold text-white">
                    Chargement impossible
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={loadNotifications}
                    className="mt-5 rounded-xl bg-[#18d5c4] px-5 py-3 text-sm font-bold text-[#041018] transition hover:bg-[#25e4d3]"
                  >
                    Réessayer
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-[#18d5c4]/10 bg-[#18d5c4]/10 text-[#18d5c4]">
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 0 1-5.714 0A2.25 2.25 0 0 1 7.5 14.85V11a4.5 4.5 0 1 1 9 0v3.85a2.25 2.25 0 0 1-1.643 2.232ZM9.75 19.5a2.25 2.25 0 0 0 4.5 0"
                      />
                    </svg>
                  </div>

                  <h2 className="mt-5 text-lg font-bold">
                    Aucune notification
                  </h2>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                    Tes nouvelles notifications apparaîtront ici dès
                    qu'une activité sera enregistrée sur ton compte.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className={`rounded-2xl border p-4 transition sm:p-5 ${
                        !notification.read
                          ? "border-[#18d5c4]/20 bg-[#18d5c4]/[0.05]"
                          : "border-white/[0.08] bg-white/[0.025]"
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        {/* Icône */}
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
                            !notification.read
                              ? "bg-[#18d5c4]/10 text-[#18d5c4]"
                              : "bg-white/[0.05] text-slate-400"
                          }`}
                        >
                          {notification.type === "WITHDRAWAL"
                            ? "↗"
                            : notification.type === "INVESTMENT"
                              ? "◈"
                              : notification.type === "REFERRAL"
                                ? "♧"
                                : "🔔"}
                        </div>

                        {/* Contenu */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h2 className="break-words text-sm font-bold leading-6 text-white sm:text-base">
                              {notification.title}
                            </h2>

                            {!notification.read && (
                              <span
                                className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#18d5c4]"
                                aria-label="Non lue"
                              />
                            )}
                          </div>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">
                            {notification.message}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <time
                              dateTime={notification.createdAt}
                              className="text-xs text-slate-500"
                            >
                              {formatDate(notification.createdAt)}
                            </time>

                            {!notification.read && (
                              <button
                                type="button"
                                onClick={() =>
                                  markAsRead(notification.id)
                                }
                                className="rounded-lg px-3 py-2 text-xs font-semibold text-[#18d5c4] transition hover:bg-[#18d5c4]/10"
                              >
                                Marquer comme lue
                              </button>
                            )}

                            {notification.read && (
                              <span className="text-xs text-slate-600">
                                ✓ Lue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {loading && notifications.length > 0 && (
                <p className="py-5 text-center text-xs text-slate-500">
                  Actualisation des notifications...
                </p>
              )}

              {error && notifications.length > 0 && (
                <p className="py-4 text-center text-xs text-amber-400">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Pied de page fixe */}
          <footer className="relative z-10 shrink-0 border-t border-white/10 bg-[#071923]/95 px-4 py-3 text-center backdrop-blur-xl">
            <p className="text-[11px] text-slate-500">
              Nova Invest · Centre de notifications
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}