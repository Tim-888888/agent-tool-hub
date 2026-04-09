'use client';

import type { Tool } from '@/types';
import { useI18n } from '@/lib/i18n-context';

interface CompatibilityMatrixProps {
  tool: Tool;
}

export default function CompatibilityMatrix({ tool }: CompatibilityMatrixProps) {
  const { t } = useI18n();

  if (tool.platforms.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">{t('tool.noCompatibilityData')}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tool.platforms.map((p) => (
        <span
          key={p.id}
          className="rounded-lg bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
        >
          {p.name}
        </span>
      ))}
    </div>
  );
}
