"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-context";

interface Submission {
  id: string;
  repoUrl: string;
  submitterName: string | null;
  submitterEmail: string | null;
  notes: string | null;
  suggestedTags: string[];
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  user: { name: string | null; image: string | null } | null;
}

interface DiscoveredTool {
  id: string;
  name: string;
  repoUrl: string;
  description: string | null;
  stars: number;
  language: string | null;
  type: string;
  createdAt: string;
}

interface AdminSubmissionsClientProps {
  initialSubmissions: Submission[];
  initialDiscoveredTools: DiscoveredTool[];
}

type Tab = "submissions" | "discovered";

export default function AdminSubmissionsClient({
  initialSubmissions,
  initialDiscoveredTools,
}: AdminSubmissionsClientProps) {
  const { locale, t } = useI18n();
  const zh = locale === "zh";
  const [tab, setTab] = useState<Tab>("submissions");
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [discovered, setDiscovered] = useState(initialDiscoveredTools);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubmissionAction(
    submissionId: string,
    action: "approve" | "reject",
  ) {
    if (action === "reject") {
      const msg = t("admin.rejectConfirm");
      if (!confirm(msg)) return;
    }

    setLoading(submissionId);
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, action }),
      });
      if (!res.ok) throw new Error("Action failed");
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    } catch {
      alert(zh ? "操作失败，请重试" : "Action failed, please try again");
    } finally {
      setLoading(null);
    }
  }

  async function handleDiscoveredAction(
    toolId: string,
    action: "approve" | "reject",
  ) {
    if (action === "reject") {
      const msg = zh ? "确定拒绝此工具？" : "Reject this tool?";
      if (!confirm(msg)) return;
    }

    setLoading(toolId);
    try {
      const res = await fetch("/api/admin/discovered-tools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, action }),
      });
      if (!res.ok) throw new Error("Action failed");
      setDiscovered((prev) => prev.filter((t) => t.id !== toolId));
    } catch {
      alert(zh ? "操作失败，请重试" : "Action failed, please try again");
    } finally {
      setLoading(null);
    }
  }

  async function handleSync() {
    setLoading("sync");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      alert(zh ? "同步完成" : "Sync completed");
    } catch {
      alert(zh ? "同步失败" : "Sync failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleDiscover() {
    setLoading("discover");
    try {
      const res = await fetch("/api/discover", { method: "POST" });
      if (!res.ok) throw new Error("Discover failed");
      alert(zh ? "发现完成，请刷新页面查看" : "Discover completed, refresh to see results");
    } catch {
      alert(zh ? "发现失败" : "Discover failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {zh
            ? `提交审核（${submissions.length} 个待处理）`
            : `Submissions (${submissions.length} pending)`}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={loading === "sync"}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
          >
            {loading === "sync"
              ? zh
                ? "同步中..."
                : "Syncing..."
              : zh
                ? "同步工具"
                : "Sync Tools"}
          </button>
          <button
            onClick={handleDiscover}
            disabled={loading === "discover"}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
          >
            {loading === "discover"
              ? zh
                ? "发现中..."
                : "Discovering..."
              : zh
                ? "发现工具"
                : "Discover Tools"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => setTab("submissions")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "submissions"
              ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {zh
            ? `用户提交（${submissions.length}）`
            : `User Submissions (${submissions.length})`}
        </button>
        <button
          onClick={() => setTab("discovered")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "discovered"
              ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {zh
            ? `自动发现（${discovered.length}）`
            : `Auto-Discovered (${discovered.length})`}
        </button>
      </div>

      {/* Submissions Tab */}
      {tab === "submissions" && (
        <div className="mt-4 space-y-3">
          {submissions.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-tertiary)]">
              {t("admin.noSubmissions")}
            </p>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <a
                      href={sub.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--color-accent)] hover:underline"
                    >
                      {sub.repoUrl}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
                      {sub.user?.name && (
                        <span>
                          {t("admin.by")} {sub.user.name}
                        </span>
                      )}
                      <span>
                        {t("admin.on")}{" "}
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {sub.notes && (
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {sub.notes}
                      </p>
                    )}
                    {sub.suggestedTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {sub.suggestedTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() =>
                        handleSubmissionAction(sub.id, "approve")
                      }
                      disabled={loading === sub.id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {zh ? "通过" : "Approve"}
                    </button>
                    <button
                      onClick={() =>
                        handleSubmissionAction(sub.id, "reject")
                      }
                      disabled={loading === sub.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                      {zh ? "拒绝" : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Discovered Tools Tab */}
      {tab === "discovered" && (
        <div className="mt-4 space-y-3">
          {discovered.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-tertiary)]">
              {zh ? "暂无自动发现的工具" : "No auto-discovered tools."}
            </p>
          ) : (
            discovered.map((tool) => (
              <div
                key={tool.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">
                        {tool.name}
                      </span>
                      <span
                        className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                      >
                        PENDING
                      </span>
                    </div>
                    <a
                      href={tool.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-sm text-[var(--color-accent)] hover:underline"
                    >
                      {tool.repoUrl}
                    </a>
                    {tool.description && (
                      <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                      <span>★ {tool.stars}</span>
                      {tool.language && <span>{tool.language}</span>}
                      <span>{tool.type}</span>
                      <span>
                        {new Date(tool.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() =>
                        handleDiscoveredAction(tool.id, "approve")
                      }
                      disabled={loading === tool.id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {zh ? "通过" : "Approve"}
                    </button>
                    <button
                      onClick={() =>
                        handleDiscoveredAction(tool.id, "reject")
                      }
                      disabled={loading === tool.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                      {zh ? "拒绝" : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
