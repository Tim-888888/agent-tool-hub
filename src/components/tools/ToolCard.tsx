'use client';

import Link from 'next/link';
import type { Tool } from '@/types';
import { useI18n } from '@/lib/i18n-context';
import { getTagLabel } from '@/lib/tag-presets';

interface ToolCardProps {
  tool: Tool;
}

export default function ToolCard({ tool }: ToolCardProps) {
  const { locale } = useI18n();

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)]">
          {tool.name}
        </h3>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{tool.description}</p>
      {tool.topTags && tool.topTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 overflow-hidden">
          {tool.topTags.slice(0, 3).map((tag) => (
            <span
              key={tag.tagSlug}
              className="rounded-lg bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
            >
              {getTagLabel(tag.tagSlug, locale)}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
        <span>{tool.stars} stars</span>
        <span>{tool.type}</span>
      </div>
    </Link>
  );
}
