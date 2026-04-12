"use client"

import { useState } from "react"
import { useI18n } from "@/lib/i18n-context"
import { getTagLabel } from "@/lib/tag-presets"

interface Submission {
  id: string
  repoUrl: string
  submitterName: string | null
  notes: string | null
  suggestedTags: string[]
  status: string
  createdAt: string
  reviewedAt: string | null
  user: { name: string | null; image: string | null } | null
}

interface DiscoveredTool {
  id: string
  name: string
  repoUrl: string
  description: string
  stars: number
  language: string | null
  type: string
  createdAt: string
}

interface AdminSubmissionsClientProps {
  initialSubmissions: Submission[]
  initialDiscoveredTools: DiscoveredTool[]
}

type Tab = "submissions" | "discovered"

export default function AdminSubmissionsClient({
  initialSubmissions,
  initialDiscoveredTools,
}: AdminSubmissionsClientProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [discoveredTools, setDiscoveredTools] = useState(initialDiscoveredTools)
  const [activeTab, setActiveTab] = useState<Tab>(
    initialDiscoveredTools.length > 0 ? "discovered" : "submissions",
  )
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<"sync" | "discover" | null>(null)
  const [actionResult, setActionResult] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const { locale, t } = useI18n()

  async function handleSubmissionAction(
    submissionId: string,
    action: "approve" | "reject",
  ) {
    setLoading(submissionId)
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, action }),
      })
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId))
      }
    } finally {
      setLoading(null)
      setRejectingId(null)
    }
  }

  async function handleDiscoveredAction(
    toolId: string,
    action: "approve" | "reject",
  ) {
    setLoading(toolId)
    try {
      const res = await fetch("/api/admin/discovered-tools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, action }),
      })
      if (res.ok) {
        setDiscoveredTools((prev) => prev.filter((t) => t.id !== toolId))
      }
    } finally {
      setLoading(null)
      setRejectingId(null)
    }
  }

  async function handleTriggerAction(action: "sync" | "discover") {
    setActionLoading(action)
    setActionResult(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90000)
      const res = await fetch(`/api/${action}`, {
        method: "POST",
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const json = await res.json()
      if (res.ok && json.success) {
        if (action === "discover" && json.data?.totalCreated > 0) {
          // Refresh discovered tools list
          window.location.reload()
        }
        setActionResult({
          type: "success",
          message:
            action === "sync"
              ? `Synced ${json.data?.synced ?? 0} tools (${json.data?.failed ?? 0} failed)`
              : `Discovered ${json.data?.totalDiscovered ?? 0} repos, created ${json.data?.totalCreated ?? 0} new tools`,
        })
      } else {
        setActionResult({
          type: "error",
          message: json.error ?? "Action failed",
        })
      }
    } catch {
      setActionResult({ type: "error", message: "Network error" })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">
        {t("admin.submissionsTitle").replace(
          "{count}",
          String(submissions.length + discoveredTools.length),
        )}
      </h1>

      {/* Manual trigger actions */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => handleTriggerAction("sync")}
          disabled={actionLoading !== null}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {actionLoading === "sync" ? "..." : locale === "zh" ? "立即同步数据" : "Sync Now"}
        </button>
        <button
          onClick={() => handleTriggerAction("discover")}
          disabled={actionLoading !== null}
          className="rounded-lg border border-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 disabled:opacity-50"
        >
          {actionLoading === "discover" ? "..." : locale === "zh" ? "发现新工具" : "Discover New Tools"}
        </button>
        {actionResult && (
          <span
            className={`text-sm font-medium ${
              actionResult.type === "success"
                ? "text-green-600 dark:text-green-400"
                : "text-[var(--color-danger)]"
            }`}
          >
            {actionResult.message}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "submissions"
              ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {t("admin.userSubmissions").replace("{count}", String(submissions.length))}
        </button>
        <button
          onClick={() => setActiveTab("discovered")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "discovered"
              ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {t("admin.discoveredTools").replace("{count}", String(discoveredTools.length))}
        </button>
      </div>

      {/* User Submissions Tab */}
      {activeTab === "submissions" && (
        <div className="mt-6 space-y-4">
          {submissions.length === 0 ? (
            <p className="text-[var(--text-secondary)]">{t("admin.noSubmissions")}</p>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{sub.repoUrl}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t("admin.by")} {sub.user?.name ?? "Unknown"} {t("admin.on")}{" "}
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]">
                    {t("common.pending")}
                  </span>
                </div>

                {sub.notes && (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{sub.notes}</p>
                )}

                {sub.suggestedTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sub.suggestedTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                      >
                        {getTagLabel(tag, locale)}
                      </span>
                    ))}
                  </div>
                )}

                {rejectingId === sub.id ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-[var(--bg-secondary)] p-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t("admin.rejectConfirm")}
                    </p>
                    <button
                      onClick={() => handleSubmissionAction(sub.id, "reject")}
                      disabled={loading === sub.id}
                      className="rounded-lg bg-[var(--color-danger)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {t("common.confirmReject")}
                    </button>
                    <button
                      onClick={() => setRejectingId(null)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleSubmissionAction(sub.id, "approve")}
                      disabled={loading === sub.id}
                      className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {t("common.approve")}
                    </button>
                    <button
                      onClick={() => setRejectingId(sub.id)}
                      disabled={loading === sub.id}
                      className="rounded-lg border border-[var(--color-danger)] px-4 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
                    >
                      {t("common.reject")}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Auto-Discovered Tools Tab */}
      {activeTab === "discovered" && (
        <div className="mt-6 space-y-4">
          {discoveredTools.length === 0 ? (
            <p className="text-[var(--text-secondary)]">
              {locale === "zh" ? "暂无自动发现的工具" : "No auto-discovered tools pending review"}
            </p>
          ) : (
            discoveredTools.map((tool) => (
              <div
                key={tool.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{tool.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{tool.repoUrl}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tool.stars > 0 && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        ★ {tool.stars.toLocaleString()}
                      </span>
                    )}
                    <span className="rounded-full border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-info)]">
                      {locale === "zh" ? "自动发现" : "Auto-discovered"}
                    </span>
                  </div>
                </div>

                {tool.description && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{tool.description}</p>
                )}

                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                  <span className="rounded-lg bg-[var(--bg-tertiary)] px-2 py-0.5">
                    {tool.type}
                  </span>
                  {tool.language && (
                    <span className="rounded-lg bg-[var(--bg-tertiary)] px-2 py-0.5">
                      {tool.language}
                    </span>
                  )}
                  <span>
                    {new Date(tool.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {rejectingId === tool.id ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-[var(--bg-secondary)] p-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t("admin.rejectConfirm")}
                    </p>
                    <button
                      onClick={() => handleDiscoveredAction(tool.id, "reject")}
                      disabled={loading === tool.id}
                      className="rounded-lg bg-[var(--color-danger)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {t("common.confirmReject")}
                    </button>
                    <button
                      onClick={() => setRejectingId(null)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleDiscoveredAction(tool.id, "approve")}
                      disabled={loading === tool.id}
                      className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {t("common.approve")}
                    </button>
                    <button
                      onClick={() => setRejectingId(tool.id)}
                      disabled={loading === tool.id}
                      className="rounded-lg border border-[var(--color-danger)] px-4 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
                    >
                      {t("common.reject")}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
