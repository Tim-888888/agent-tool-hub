"use client"

import { useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { useI18n } from "@/lib/i18n-context"
import { TAG_PRESETS, getTagLabel } from "@/lib/tag-presets"

type ValidationState = "idle" | "validating" | "valid" | "invalid"

export default function SubmitForm() {
  const { data: session } = useSession()
  const { locale, t } = useI18n()

  const [repoUrl, setRepoUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [validationState, setValidationState] = useState<ValidationState>("idle")
  const [validationError, setValidationError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState("")

  function isValidGitHubUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return (
        parsed.hostname === "github.com" &&
        parsed.pathname.split("/").filter(Boolean).length >= 2
      )
    } catch {
      return false
    }
  }

  async function handleRepoUrlBlur() {
    if (!repoUrl.trim()) {
      setValidationState("idle")
      setValidationError("")
      return
    }

    if (!isValidGitHubUrl(repoUrl)) {
      setValidationState("invalid")
      setValidationError(t("community.submitValidation"))
      return
    }

    setValidationState("validating")
    setValidationError("")

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, _validateOnly: true }),
      })
      // A 409 (duplicate) means repo exists -- still valid format but duplicate
      // A 400 (invalid repo) means format is ok but cannot verify
      if (res.status === 409) {
        setValidationState("invalid")
        setValidationError(t("community.submitDuplicate"))
      } else if (res.status === 401) {
        setValidationState("invalid")
        setValidationError(t("community.signInToSubmit"))
      } else {
        // Any other response means the URL format is valid enough
        setValidationState("valid")
      }
    } catch {
      // Network error -- still mark as valid format since we checked locally
      setValidationState("valid")
    }
  }

  function toggleTag(slug: string) {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validationState !== "valid" || submitting) return

    setSubmitting(true)
    setSubmitError("")

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          notes: notes || undefined,
          suggestedTags: selectedTags.length > 0 ? selectedTags : undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSubmitted(true)
      } else if (res.status === 409) {
        setValidationError(t("community.submitDuplicate"))
        setValidationState("invalid")
      } else if (res.status === 400) {
        setValidationError(data.error || t("community.submitNotFound"))
        setValidationState("invalid")
      } else {
        setSubmitError(data.error || t("community.reviewError"))
      }
    } catch {
      setSubmitError(t("community.reviewError"))
    } finally {
      setSubmitting(false)
    }
  }

  // Signed-out state: show login prompt
  if (!session?.user) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-8 text-center">
        <p className="text-lg font-medium text-[var(--text-primary)]">
          {t("community.signInToSubmit")}
        </p>
        <button
          onClick={() => signIn("github")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>
    )
  }

  // Success state
  if (submitted) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)]/10">
          <svg
            className="h-6 w-6 text-[var(--color-success)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-medium text-[var(--text-primary)]">
          {t("community.submitConfirmation")}
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-8"
    >
      {/* Repository URL */}
      <div className="mb-6">
        <label
          htmlFor="repoUrl"
          className="mb-2 block text-sm font-semibold text-[var(--text-primary)]"
        >
          {t("community.repoUrl")} <span className="text-[var(--color-danger)]">*</span>
        </label>
        <div className="relative">
          <input
            id="repoUrl"
            type="url"
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value)
              if (validationState !== "idle") {
                setValidationState("idle")
                setValidationError("")
              }
            }}
            onBlur={handleRepoUrlBlur}
            placeholder={t("community.repoUrlPlaceholder")}
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          {validationState === "validating" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
            </div>
          )}
          {validationState === "valid" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="h-5 w-5 text-[var(--color-success)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
        {validationError && (
          <p className="mt-1.5 text-xs text-[var(--color-danger)]" role="alert">
            {validationError}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label
          htmlFor="notes"
          className="mb-2 block text-sm font-semibold text-[var(--text-primary)]"
        >
          {t("community.notes")}
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 300))}
          placeholder={t("community.notesPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
        <p className="mt-1 text-right text-xs text-[var(--text-tertiary)]">
          {notes.length}/300
        </p>
      </div>

      {/* Suggested Tags */}
      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          {t("community.suggestedTags")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {TAG_PRESETS.map((tag) => {
            const isSelected = selectedTags.includes(tag.slug)
            return (
              <button
                key={tag.slug}
                type="button"
                onClick={() => toggleTag(tag.slug)}
                aria-pressed={isSelected}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/30 hover:text-[var(--text-primary)]"
                }`}
              >
                {getTagLabel(tag.slug, locale)}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Submit Error */}
      {submitError && (
        <p className="mb-4 text-sm text-[var(--color-danger)]" role="alert">
          {submitError}
        </p>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={validationState !== "valid" || submitting}
        className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "..."
          : t("community.submitTool")}
      </button>
    </form>
  )
}
