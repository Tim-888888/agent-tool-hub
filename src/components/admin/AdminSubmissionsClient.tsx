"use client";

import { useState, useCallback } from "react";
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

type ItemStatus = "idle" | "processing" | "approved" | "rejected" | "error";

interface BatchProgress {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
}

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

  // Batch state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({});

  const currentItems = tab === "submissions" ? submissions : discovered;
  const allSelected = currentItems.length > 0 && currentItems.every((item) => selectedIds.has(item.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentItems.map((item) => item.id)));
    }
  }

  // SSE consumer for batch operations
  async function handleBatch(action: "approve" | "reject") {
    if (selectedIds.size === 0) return;

    if (action === "reject") {
      const msg = zh
        ? `确定拒绝 ${selectedIds.size} 个项目？`
        : `Reject ${selectedIds.size} items?`;
      if (!confirm(msg)) return;
    }

    const ids = Array.from(selectedIds);
    setBatchLoading(true);
    setBatchProgress({ current: 0, total: ids.length, succeeded: 0, failed: 0 });

    // Mark all as processing
    const initialStatuses: Record<string, ItemStatus> = {};
    ids.forEach((id) => { initialStatuses[id] = "processing"; });
    setItemStatuses(initialStatuses);

    const endpoint = tab === "submissions"
      ? "/api/admin/submissions/batch"
      : "/api/admin/discovered-tools/batch";

    const bodyKey = tab === "submissions" ? "submissionIds" : "toolIds";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: ids, action }),
      });

      if (!res.ok || !res.body) throw new Error("Batch request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let current = 0;
      let succeeded = 0;
      let failed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.type === "done") {
                setBatchProgress({ current: data.total, total: data.total, succeeded: data.succeeded, failed: data.failed });
              } else if (data.id) {
                current++;
                if (data.status === "approved" || data.status === "rejected") {
                  succeeded++;
                  setItemStatuses((prev) => ({ ...prev, [data.id]: data.status }));
                } else if (data.status === "error") {
                  failed++;
                  setItemStatuses((prev) => ({ ...prev, [data.id]: "error" }));
                }
                setBatchProgress({ current, total: ids.length, succeeded, failed });
              }
            } catch {
              // ignore malformed JSON lines
            }
          }
        }
      }

      // After batch completes, remove approved/rejected items from list
      setTimeout(() => {
        if (tab === "submissions") {
          setSubmissions((prev) => prev.filter((s) => !ids.includes(s.id) || itemStatuses[s.id] === "error"));
        } else {
          setDiscovered((prev) => prev.filter((d) => !ids.includes(d.id) || itemStatuses[d.id] === "error"));
        }
        setSelectedIds(new Set());
        setBatchLoading(false);
        setBatchProgress(null);
        setItemStatuses({});
      }, 1500);
    } catch {
      alert(zh ? "批量操作失败，请重试" : "Batch operation failed, please try again");
      setBatchLoading(false);
      setBatchProgress(null);
      setItemStatuses({});
    }
  }

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
      setDiscovered((prev) => prev.filter((item) => item.id !== toolId));
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

  function getItemStatus(id: string): ItemStatus {
    return itemStatuses[id] ?? "idle";
  }

  const statusStyles: Record<ItemStatus, string> = {
    idle: "",
    processing: "opacity-60 ring-2 ring-yellow-400/50",
    approved: "opacity-40 ring-2 ring-green-400/50",
    rejected: "opacity-40 ring-2 ring-red-400/50",
    error: "ring-2 ring-red-500/70",
  };

  const statusBadge: Record<ItemStatus, string> = {
    idle: "",
    processing: zh ? "处理中..." : "Processing...",
    approved: zh ? "已通过" : "Approved",
    rejected: zh ? "已拒绝" : "Rejected",
    error: zh ? "失败" : "Error",
  };

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
              ? zh ? "同步中..." : "Syncing..."
              : zh ? "同步工具" : "Sync Tools"}
          </button>
          <button
            onClick={handleDiscover}
            disabled={loading === "discover"}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
          >
            {loading === "discover"
              ? zh ? "发现中..." : "Discovering..."
              : zh ? "发现工具" : "Discover Tools"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => { setTab("submissions"); setSelectedIds(new Set()); }}
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
          onClick={() => { setTab("discovered"); setSelectedIds(new Set()); }}
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

      {/* Batch action bar */}
      {currentItems.length > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              disabled={batchLoading}
              className="h-4 w-4 rounded border-[var(--border)] accent-[var(--color-accent)]"
            />
            {zh ? "全选" : "Select all"}
          </label>

          {selectedIds.size > 0 && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {zh ? `已选 ${selectedIds.size} 项` : `${selectedIds.size} selected`}
            </span>
          )}

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => handleBatch("approve")}
              disabled={selectedIds.size === 0 || batchLoading}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {batchLoading
                ? zh ? "处理中..." : "Processing..."
                : zh ? `批量通过${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}` : `Batch Approve${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
            </button>
            <button
              onClick={() => handleBatch("reject")}
              disabled={selectedIds.size === 0 || batchLoading}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {batchLoading
                ? zh ? "处理中..." : "Processing..."
                : zh ? `批量拒绝${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}` : `Batch Reject${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* Batch progress bar */}
      {batchProgress && (
        <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">
              {zh
                ? `处理中 ${batchProgress.current}/${batchProgress.total}...`
                : `Processing ${batchProgress.current}/${batchProgress.total}...`}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {zh ? "成功" : "OK"}: {batchProgress.succeeded}
              {batchProgress.failed > 0 && (
                <span className="ml-2 text-red-500">
                  {zh ? "失败" : "Fail"}: {batchProgress.failed}
                </span>
              )}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Submissions Tab */}
      {tab === "submissions" && (
        <div className="mt-4 space-y-3">
          {submissions.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-tertiary)]">
              {t("admin.noSubmissions")}
            </p>
          ) : (
            submissions.map((sub) => {
              const status = getItemStatus(sub.id);
              return (
                <div
                  key={sub.id}
                  className={`rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4 transition-opacity ${statusStyles[status]}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(sub.id)}
                      onChange={() => toggleSelect(sub.id)}
                      disabled={batchLoading || status === "approved" || status === "rejected"}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border)] accent-[var(--color-accent)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={sub.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--color-accent)] hover:underline"
                        >
                          {sub.repoUrl}
                        </a>
                        {statusBadge[status] && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === "processing" ? "bg-yellow-500/10 text-yellow-600" :
                            status === "approved" ? "bg-green-500/10 text-green-600" :
                            status === "rejected" ? "bg-red-500/10 text-red-600" :
                            "bg-red-500/10 text-red-600"
                          }`}>
                            {statusBadge[status]}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        {sub.user?.name && (
                          <span>{t("admin.by")} {sub.user.name}</span>
                        )}
                        <span>
                          {t("admin.on")} {new Date(sub.createdAt).toLocaleDateString()}
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
                        onClick={() => handleSubmissionAction(sub.id, "approve")}
                        disabled={loading === sub.id || batchLoading}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        {zh ? "通过" : "Approve"}
                      </button>
                      <button
                        onClick={() => handleSubmissionAction(sub.id, "reject")}
                        disabled={loading === sub.id || batchLoading}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        {zh ? "拒绝" : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
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
            discovered.map((tool) => {
              const status = getItemStatus(tool.id);
              return (
                <div
                  key={tool.id}
                  className={`rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4 transition-opacity ${statusStyles[status]}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tool.id)}
                      onChange={() => toggleSelect(tool.id)}
                      disabled={batchLoading || status === "approved" || status === "rejected"}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border)] accent-[var(--color-accent)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">
                          {tool.name}
                        </span>
                        {status === "idle" && (
                          <span className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            PENDING
                          </span>
                        )}
                        {statusBadge[status] && status !== "idle" && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === "processing" ? "bg-yellow-500/10 text-yellow-600" :
                            status === "approved" ? "bg-green-500/10 text-green-600" :
                            status === "rejected" ? "bg-red-500/10 text-red-600" :
                            "bg-red-500/10 text-red-600"
                          }`}>
                            {statusBadge[status]}
                          </span>
                        )}
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
                        <span>{new Date(tool.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleDiscoveredAction(tool.id, "approve")}
                        disabled={loading === tool.id || batchLoading}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        {zh ? "通过" : "Approve"}
                      </button>
                      <button
                        onClick={() => handleDiscoveredAction(tool.id, "reject")}
                        disabled={loading === tool.id || batchLoading}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        {zh ? "拒绝" : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
