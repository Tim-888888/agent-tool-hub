'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tool } from '@/types';
import { useI18n, localePath } from '@/lib/i18n-context';
import { getTagLabel } from '@/lib/tag-presets';
import { trackEvent } from '@/hooks/useAnalytics';

interface ToolCardProps {
  tool: Tool;
}

export default function ToolCard({ tool }: ToolCardProps) {
  const { locale, t } = useI18n();
  const [added, setAdded] = useState(false);

  function handleCompare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const existing = sessionStorage.getItem('compare_slugs') ?? '';
    const slugs = existing ? existing.split(',') : [];
    if (slugs.length >= 4 || slugs.includes(tool.slug)) return;
    slugs.push(tool.slug);
    sessionStorage.setItem('compare_slugs', slugs.join(','));
    setAdded(true);
    trackEvent('compare_add', { slug: tool.slug });
  }

  return (
    <Link
      href={localePath(locale, `/tools/${tool.slug}`)}
      onClick={() => trackEvent('tool_click', { slug: tool.slug })}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)]">
          {tool.name}
        </h3>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">
        {locale === 'zh' && tool.descriptionZh ? tool.descriptionZh : tool.description}
      </p>
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
        <span>{tool.stars} {t('tool.stars')}</span>
        <span>{t('tool.type.' + tool.type.toLowerCase())}</span>
        <button
          onClick={handleCompare}
          disabled={added}
          className="ml-auto rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
          title={t('compare.add')}
        >
          {added ? '✓' : '+'}
        </button>
      </div>
    </Link>
  );
}
