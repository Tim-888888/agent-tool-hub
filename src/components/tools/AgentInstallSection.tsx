'use client';

import type { Tool } from '@/types';
import { useI18n } from '@/lib/i18n-context';

interface AgentInstallSectionProps {
  tool: Tool;
}

export default function AgentInstallSection({ tool }: AgentInstallSectionProps) {
  const { t } = useI18n();

  if (!tool.installGuide) return null;

  const guide = tool.installGuide;

  // Case 1: plain string
  if (typeof guide === 'string') {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('tool.quickInstall')}</h3>
        <pre className="mt-2 overflow-x-auto text-xs text-[var(--text-secondary)]">
          <code>{guide}</code>
        </pre>
      </div>
    );
  }

  // Case 2: { markdown: "..." } wrapper — extract text
  if (guide.markdown && typeof guide.markdown === 'string') {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('tool.quickInstall')}</h3>
        <pre className="mt-2 overflow-x-auto text-xs text-[var(--text-secondary)]">
          <code>{guide.markdown}</code>
        </pre>
      </div>
    );
  }

  // Case 3: structured per-platform install guides — show each as a command block
  const platforms = Object.entries(guide).filter(
    ([, val]) => typeof val === 'object' && val !== null,
  );

  if (platforms.length > 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('tool.quickInstall')}</h3>
        <div className="mt-2 space-y-2">
          {platforms.map(([platform, data]) => {
            const entry = data as Record<string, unknown>;
            const command = (entry.copyText as string) || (entry.command as string) || '';

            return (
              <div key={platform} className="flex items-center gap-2 rounded-lg bg-[var(--bg-primary)] p-2">
                <span className="shrink-0 rounded-lg bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                  {platform}
                </span>
                <code className="flex-1 truncate text-xs text-[var(--text-primary)]">{command}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(command)}
                  className="shrink-0 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {t('common.copy')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
