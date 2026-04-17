"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-context";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isPro: boolean;
  createdAt: string;
  reviewCount: number;
  submissionCount: number;
  favoriteCount: number;
}

interface AdminUsersClientProps {
  initialUsers: AdminUser[];
}

export default function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const { locale } = useI18n();
  const zh = locale === "zh";
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState(initialUsers);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.name?.toLowerCase().includes(q) ?? false) ||
      (u.email?.toLowerCase().includes(q) ?? false)
    );
  });

  async function togglePro(userId: string, currentIsPro: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/pro`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPro: !currentIsPro }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isPro: !currentIsPro } : u))
        );
      }
    } catch {}
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {zh ? "用户管理" : "Users Management"}
      </h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {zh ? `共 ${users.length} 个用户` : `${users.length} users total`}
      </p>

      {/* Search */}
      <div className="mt-4">
        <input
          type="text"
          placeholder={zh ? "搜索用户名或邮箱..." : "Search by name or email..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {/* Users Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-tertiary)]">
              <th className="pb-3 pr-4 font-medium">{zh ? "用户" : "User"}</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">{zh ? "评价" : "Reviews"}</th>
              <th className="pb-3 pr-4 font-medium">{zh ? "提交" : "Submits"}</th>
              <th className="pb-3 pr-4 font-medium">{zh ? "收藏" : "Favorites"}</th>
              <th className="pb-3 pr-4 font-medium">Pro</th>
              <th className="pb-3 font-medium">{zh ? "注册日期" : "Joined"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((user) => (
              <tr key={user.id}>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {user.image ? (
                      <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-xs text-[var(--text-tertiary)]">
                        {(user.name ?? "U")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-[var(--text-primary)]">
                      {user.name ?? "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{user.email ?? "—"}</td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{user.reviewCount}</td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{user.submissionCount}</td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{user.favoriteCount}</td>
                <td className="py-3 pr-4">
                  <button
                    onClick={() => togglePro(user.id, user.isPro)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      user.isPro
                        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20"
                        : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {user.isPro ? "Pro" : zh ? "设为 Pro" : "Set Pro"}
                  </button>
                </td>
                <td className="py-3 text-[var(--text-tertiary)]">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-[var(--text-tertiary)]">
            {zh ? "没有匹配的用户" : "No users match your search"}
          </p>
        )}
      </div>
    </div>
  );
}
