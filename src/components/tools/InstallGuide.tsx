interface InstallGuideProps {
  guide: string | Record<string, unknown>;
}

export default function InstallGuide({ guide }: InstallGuideProps) {
  if (!guide) return null;

  // Case 1: plain string
  if (typeof guide === 'string') {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <pre className="overflow-x-auto text-sm text-[var(--text-primary)]">
          <code>{guide}</code>
        </pre>
      </div>
    );
  }

  // Case 2: { markdown: "..." } wrapper
  if (guide.markdown && typeof guide.markdown === 'string') {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <pre className="overflow-x-auto text-sm text-[var(--text-primary)]">
          <code>{guide.markdown}</code>
        </pre>
      </div>
    );
  }

  // Case 3: structured per-platform install guide
  // e.g. { "claude-code": { method: "cli", command: "...", copyText: "..." }, "cursor": { ... } }
  const platforms = Object.entries(guide).filter(
    ([, val]) => typeof val === 'object' && val !== null,
  );

  if (platforms.length > 0) {
    return (
      <div className="space-y-3">
        {platforms.map(([platform, data]) => {
          const entry = data as Record<string, unknown>;
          const command = (entry.command as string) || (entry.copyText as string) || '';
          const method = entry.method as string;
          const targetFile = entry.targetFile as string;

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
              {command && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-primary)] p-3">
                  <code className="flex-1 text-sm text-[var(--text-primary)]">{command}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(command)}
                    className="shrink-0 rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: stringify unknown structure
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <pre className="overflow-x-auto text-sm text-[var(--text-primary)]">
        <code>{JSON.stringify(guide, null, 2)}</code>
      </pre>
    </div>
  );
}
