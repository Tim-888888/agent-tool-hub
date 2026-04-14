"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useI18n, localePath } from "@/lib/i18n-context";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  tool: { id: string; slug: string; name: string } | null;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const { locale } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;

    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data.notifications);
          setUnreadCount(json.data.unreadCount);
        }
      } catch {
        // Silently handle
      }
    }

    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  if (!session) return null;

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return locale === "zh" ? "刚刚" : "just now";
    if (minutes < 60) return locale === "zh" ? `${minutes} 分钟前` : `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return locale === "zh" ? `${hours} 小时前` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return locale === "zh" ? `${days} 天前` : `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        aria-label={locale === "zh" ? "通知" : "Notifications"}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {locale === "zh" ? "通知" : "Notifications"}
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
                {locale === "zh" ? "暂无通知" : "No notifications"}
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`cursor-pointer border-b border-[var(--border)] px-4 py-3 transition-colors last:border-0 ${
                    n.read ? "bg-transparent" : "bg-[var(--color-accent)]/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-[var(--color-accent)]"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        {n.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                        <span>{timeAgo(n.createdAt)}</span>
                        {n.tool && (
                          <a
                            href={localePath(locale, `/tools/${n.tool.slug}`)}
                            className="text-[var(--color-accent)] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {n.tool.name}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
