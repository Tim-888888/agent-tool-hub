"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { localePath } from "@/lib/i18n-context";

interface DashboardStats {
  tools: { total: number; active: number; featured: number; pending: number };
  users: { total: number };
  reviews: { total: number };
  submissions: { total: number; pending: number };
  favorites: { total: number };
  toolsByType: { type: string; count: number }[];
  recentTools: { id: string; name: string; slug: string; stars: number; type: string; createdAt: string }[];
  recentUsers: { id: string; name: string | null; image: string | null; email: string | null; createdAt: string }[];
}

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 ${accent ? "ring-2 ring-[var(--color-accent)]/20" : ""}`}>
      <p className="text-sm text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[var(--text-primary)]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--text-tertiary)]">{sub}</p>}
    </div>
  );
}

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  const { locale } = useI18n();

  const zh = locale === "zh";

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {zh ? "管理概览" : "Admin Dashboard"}
      </h1>

      {/* Stats Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={zh ? "总工具数" : "Total Tools"}
          value={stats.tools.total}
          sub={`${stats.tools.active} ${zh ? "活跃" : "active"}, ${stats.tools.featured} ${zh ? "精选" : "featured"}, ${stats.tools.pending} ${zh ? "待审核" : "pending"}`}
        />
        <StatCard
          label={zh ? "用户" : "Users"}
          value={stats.users.total}
          accent
        />
        <StatCard
          label={zh ? "评价" : "Reviews"}
          value={stats.reviews.total}
        />
        <StatCard
          label={zh ? "收藏" : "Favorites"}
          value={stats.favorites.total}
        />
      </div>

      {/* Pending items alert */}
      {stats.submissions.pending > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-4">
          <p className="text-sm font-medium text-[var(--color-warning)]">
            {zh
              ? `${stats.submissions.pending} 个提交待审核`
              : `${stats.submissions.pending} submissions pending review`}
          </p>
          <Link
            href={localePath(locale, "/admin/submissions")}
            className="mt-1 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            {zh ? "前往审核 →" : "Review now →"}
          </Link>
        </div>
      )}

      {/* Tools by type */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {zh ? "工具分布" : "Tools by Type"}
        </h2>
        <div className="mt-3 flex gap-4">
          {stats.toolsByType.map((t) => (
            <div
              key={t.type}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3"
            >
              <p className="text-xs text-[var(--text-tertiary)]">{t.type}</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{t.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tools */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {zh ? "最近添加的工具" : "Recent Tools"}
        </h2>
        <div className="mt-3 space-y-2">
          {stats.recentTools.map((tool) => (
            <div
              key={tool.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3"
            >
              <div>
                <Link
                  href={localePath(locale, `/tools/${tool.slug}`)}
                  className="font-medium text-[var(--color-accent)] hover:underline"
                >
                  {tool.name}
                </Link>
                <span className="ml-2 text-xs text-[var(--text-tertiary)]">{tool.type}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                <span>★ {tool.stars}</span>
                <span>{new Date(tool.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Users */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {zh ? "最近注册的用户" : "Recent Users"}
        </h2>
        <div className="mt-3 space-y-2">
          {stats.recentUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {user.image ? (
                  <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-xs text-[var(--text-tertiary)]">
                    {(user.name ?? "U")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {user.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">{user.email}</p>
                </div>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
