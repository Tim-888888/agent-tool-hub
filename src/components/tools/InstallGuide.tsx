"use client"

import { useState, useCallback, useMemo } from "react"

interface InstallGuideProps {
  guide: string | Record<string, unknown>
  locale?: string
}

/** Parse markdown into structured segments for React rendering */
interface CodeBlock {
  type: "code"
  lang: string
  code: string
}
interface TextBlock {
  type: "text"
  content: string
}
type Segment = CodeBlock | TextBlock

function parseMarkdownSegments(md: string): Segment[] {
  const segments: Segment[] = []
  // Split on code fences
  const parts = md.split(/(```[\s\S]*?```)/g)

  for (const part of parts) {
    const codeMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/)
    if (codeMatch) {
      segments.push({ type: "code", lang: codeMatch[1] || "text", code: codeMatch[2].trimEnd() })
    } else if (part.trim()) {
      segments.push({ type: "text", content: part })
    }
  }
  return segments
}

/** Render inline markdown (no code blocks) to HTML */
function renderInline(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-[var(--color-accent)]/40 pl-3 my-2 text-[var(--text-tertiary)]">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--color-accent)] hover:underline">$1</a>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-xs font-mono text-[var(--text-primary)]">$1</code>')
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />")
}

function CodeBlockWithCopy({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="my-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5">
        <span className="text-xs font-medium text-[var(--text-tertiary)]">{lang}</span>
        <button
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm leading-relaxed">
        <code className="text-[var(--text-primary)]">{code}</code>
      </pre>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const segments = useMemo(() => parseMarkdownSegments(content), [content])

  return (
    <div className="text-sm leading-relaxed text-[var(--text-secondary)]">
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlockWithCopy key={i} lang={seg.lang} code={seg.code} />
        ) : (
          <div
            key={i}
            className="[
              [&_a]:text-[var(--color-accent)] [&_a:hover]:underline
              [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)] [&_h2]:mt-4 [&_h2]:mb-2
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[var(--text-primary)] [&_h3]:mt-3 [&_h3]:mb-1
              [&_li]:ml-4 [&_li]:list-disc
              [&_strong]:text-[var(--text-primary)]
            ]"
            dangerouslySetInnerHTML={{ __html: renderInline(seg.content) }}
          />
        )
      )}
    </div>
  )
}

const containerClass = "rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5"

export default function InstallGuide({ guide, locale }: InstallGuideProps) {
  if (!guide) return null

  // Case 1: plain string
  if (typeof guide === "string") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <pre className="overflow-x-auto text-sm text-[var(--text-primary)]">
          <code>{guide}</code>
        </pre>
      </div>
    )
  }

  // Case 2: { en: "...", zh: "..." } — locale-aware bilingual content
  if ((guide.en || guide.zh) && (typeof guide.en === "string" || typeof guide.zh === "string")) {
    const content =
      locale === "zh" && guide.zh
        ? (guide.zh as string)
        : (guide.en as string) || (guide.zh as string) || ""
    if (!content) return null
    return (
      <div className={containerClass}>
        <MarkdownContent content={content} />
      </div>
    )
  }

  // Case 3: { markdown: "..." } — legacy single-language markdown
  if (guide.markdown && typeof guide.markdown === "string") {
    return (
      <div className={containerClass}>
        <MarkdownContent content={guide.markdown as string} />
      </div>
    )
  }

  // Case 4: structured per-platform install guide
  const platforms = Object.entries(guide).filter(
    ([, val]) => typeof val === "object" && val !== null,
  )

  if (platforms.length > 0) {
    return (
      <div className="space-y-3">
        {platforms.map(([platform, data]) => {
          const entry = data as Record<string, unknown>
          const command = (entry.command as string) || (entry.copyText as string) || ""
          const method = entry.method as string
          const targetFile = entry.targetFile as string

          return (
            <div
              key={platform}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {platform}
                </span>
                <div className="flex items-center gap-2">
                  {method && (
                    <span className="rounded-lg bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                      {method}
                    </span>
                  )}
                  {targetFile && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {targetFile}
                    </span>
                  )}
                </div>
              </div>
              {command && <CodeBlockWithCopy lang={method || "bash"} code={command} />}
            </div>
          )
        })}
      </div>
    )
  }

  // Fallback
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <pre className="overflow-x-auto text-sm text-[var(--text-primary)]">
        <code>{JSON.stringify(guide, null, 2)}</code>
      </pre>
    </div>
  )
}
