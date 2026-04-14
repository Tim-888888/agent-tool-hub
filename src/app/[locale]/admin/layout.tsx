"use client";

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

  return (
    <>
      <Header />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="w-48 shrink-0">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Admin
          </h2>
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
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </>
  );
}
