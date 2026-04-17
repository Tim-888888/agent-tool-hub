"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const NAV_ITEMS = [
  { href: "/admin", labelKey: "dashboard", labelZh: "概览", labelEn: "Dashboard" },
  { href: "/admin/submissions", labelKey: "submissions", labelZh: "审核", labelEn: "Submissions" },
  { href: "/admin/tools", labelKey: "tools", labelZh: "工具管理", labelEn: "Tools" },
  { href: "/admin/collections", labelKey: "collections", labelZh: "合集管理", labelEn: "Collections" },
  { href: "/admin/users", labelKey: "users", labelZh: "用户管理", labelEn: "Users" },
  { href: "/admin/newsletter", labelKey: "newsletter", labelZh: "Newsletter", labelEn: "Newsletter" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { locale } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebar = (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const href = `/${locale}${item.href}`;
        const isActive =
          item.href === "/admin"
            ? pathname === `/${locale}/admin`
            : pathname.startsWith(href);
        return (
          <Link
            key={item.href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {locale === "zh" ? item.labelZh : item.labelEn}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Mobile: horizontal scroll tabs */}
        <div className="mb-4 md:hidden">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Admin
          </h2>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {NAV_ITEMS.map((item) => {
              const href = `/${locale}${item.href}`;
              const isActive =
                item.href === "/admin"
                  ? pathname === `/${locale}/admin`
                  : pathname.startsWith(href);
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {locale === "zh" ? item.labelZh : item.labelEn}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden w-48 shrink-0 md:block">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Admin
            </h2>
            {sidebar}
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
