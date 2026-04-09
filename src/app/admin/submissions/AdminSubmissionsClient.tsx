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

interface AdminSubmissionsClientProps {
  initialSubmissions: Submission[]
}

export default function AdminSubmissionsClient({
  initialSubmissions,
}: AdminSubmissionsClientProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const { locale, t } = useI18n()

  async function handleAction(
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">
        {t('admin.submissionsTitle').replace('{count}', String(submissions.length))}
      </h1>

      {submissions.length === 0 ? (
        <p className="mt-6 text-[var(--text-secondary)]">
          {t('admin.noSubmissions')}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {sub.repoUrl}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t('admin.by')} {sub.user?.name ?? "Unknown"} {t('admin.on')}{" "}
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]">
                  {t('common.pending')}
                </span>
              </div>

              {sub.notes && (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  {sub.notes}
                </p>
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
                    {t('admin.rejectConfirm')}
                  </p>
                  <button
                    onClick={() => handleAction(sub.id, "reject")}
                    disabled={loading === sub.id}
                    className="rounded-lg bg-[var(--color-danger)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {t('common.confirmReject')}
                  </button>
                  <button
                    onClick={() => setRejectingId(null)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleAction(sub.id, "approve")}
                    disabled={loading === sub.id}
                    className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {t('common.approve')}
                  </button>
                  <button
                    onClick={() => setRejectingId(sub.id)}
                    disabled={loading === sub.id}
                    className="rounded-lg border border-[var(--color-danger)] px-4 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
                  >
                    {t('common.reject')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
