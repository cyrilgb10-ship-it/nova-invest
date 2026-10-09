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
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    try {
      setLoading(true);

      const response = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data: NotificationsResponse = await response.json();

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (error) {
      console.error("NOTIFICATIONS_LOAD_ERROR:", error);
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
    } catch (error) {
      console.error("NOTIFICATION_READ_ERROR:", error);
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
    } catch (error) {
      console.error("NOTIFICATIONS_MARK_ALL_ERROR:", error);
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell */}
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

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 sm:hidden">
          <button
            type="button"
            aria-label="Fermer les notifications"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />
        </div>
      )}

      {/* Panel */}
      {open && (
        <div
          className="
            fixed left-1/2 top-[76px] z-50
            w-[calc(100vw-24px)]
            max-w-[380px]
            -translate-x-1/2
            overflow-hidden
            rounded-3xl
            border border-white/10
            bg-[#071923]
            shadow-2xl shadow-black/50

            sm:absolute
            sm:left-auto
            sm:top-14
            sm:right-0
            sm:w-[360px]
            sm:max-w-none
            sm:translate-x-0
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                Notifications
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} non lue${
                      unreadCount > 1 ? "s" : ""
                    }`
                  : "Tout est à jour"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-400/10 hover:text-cyan-300"
              >
                Tout lire
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[calc(100vh-120px)] overflow-y-auto sm:max-h-[420px]">
            {loading && notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-slate-400">
                  Chargement...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-2xl">
                  🔔
                </div>

                <p className="mt-3 text-sm font-semibold text-white">
                  Aucune notification
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Tes nouvelles notifications apparaîtront ici.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                  }}
                  className={`w-full border-b border-white/[0.06] px-4 py-4 text-left transition last:border-b-0 hover:bg-white/[0.04] ${
                    !notification.read
                      ? "bg-cyan-400/[0.04]"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 gap-3">
                    {/* Icon */}
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        !notification.read
                          ? "bg-cyan-400/10 text-cyan-400"
                          : "bg-white/[0.05] text-slate-400"
                      }`}
                    >
                      {notification.type === "WITHDRAWAL"
                        ? "↗"
                        : notification.type === "INVESTMENT"
                          ? "◈"
                          : notification.type === "REFERRAL"
                            ? "♧"
                            : "•"}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-5 text-white">
                          {notification.title}
                        </p>

                        {!notification.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                        )}
                      </div>

                      <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-[10px] font-medium text-slate-600">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
