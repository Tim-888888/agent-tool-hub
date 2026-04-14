"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { localePath } from "@/lib/i18n-context";

interface AdminTool {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  stars: number;
  isFeatured: boolean;
  createdAt: string;
  lastCommitAt: string | null;
  reviewCount: number;
  favoriteCount: number;
}

interface AdminToolsClientProps {
  initialTools: AdminTool[];
}

export default function AdminToolsClient({ initialTools }: AdminToolsClientProps) {
  const { locale } = useI18n();
  const zh = locale === "zh";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = initialTools.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-600 border-green-500/30",
    FEATURED: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    PENDING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    ARCHIVED: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {zh ? "工具管理" : "Tools Management"}
      </h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {zh ? `共 ${initialTools.length} 个工具` : `${initialTools.length} tools total`}
      </p>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder={zh ? "搜索工具..." : "Search tools..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="ALL">{zh ? "全部状态" : "All Status"}</option>
          <option value="ACTIVE">Active</option>
          <option value="FEATURED">Featured</option>
          <option value="PENDING">Pending</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Tools Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-tertiary)]">
              <th className="pb-3 pr-4 font-medium">{zh ? "名称" : "Name"}</th>
              <th className="pb-3 pr-4 font-medium">Type</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Stars</th>
              <th className="pb-3 pr-4 font-medium">{zh ? "评价" : "Reviews"}</th>
              <th className="pb-3 pr-4 font-medium">{zh ? "收藏" : "Favs"}</th>
              <th className="pb-3 font-medium">{zh ? "添加日期" : "Added"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((tool) => (
              <tr key={tool.id} className="group">
                <td className="py-3 pr-4">
                  <Link
                    href={localePath(locale, `/tools/${tool.slug}`)}
                    className="font-medium text-[var(--color-accent)] hover:underline"
                  >
                    {tool.name}
                  </Link>
                  {tool.isFeatured && (
                    <span className="ml-2 text-xs text-amber-500">★</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{tool.type}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[tool.status] ?? ""}`}>
                    {tool.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{tool.stars}</td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{tool.reviewCount}</td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">{tool.favoriteCount}</td>
                <td className="py-3 text-[var(--text-tertiary)]">
                  {new Date(tool.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-[var(--text-tertiary)]">
            {zh ? "没有匹配的工具" : "No tools match your filter"}
          </p>
        )}
      </div>
    </div>
  );
}
