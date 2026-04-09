'use client';

import { useState, useEffect } from 'react';
import type { ToolFilters, Category } from '@/types';
import { cn } from '@/lib/utils';
import { PLATFORMS as ALL_PLATFORMS } from '@/lib/mock-data';
import { useI18n } from '@/lib/i18n-context';

interface FilterBarProps {
  currentFilters: ToolFilters;
  onFilterChange: (filters: ToolFilters) => void;
}

const TYPE_VALUES = ['', 'mcp', 'skill', 'rule'] as const;

export default function FilterBar({
  currentFilters,
  onFilterChange,
}: FilterBarProps) {
  const { locale, t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success) {
          setCategories(json.data);
        }
      } catch {
        // Silently handle — dropdown remains empty
      }
    }
    fetchCategories();
  }, []);

  const typeLabels: Record<string, string> = {
    '': t('filter.allTypes'),
    mcp: t('tool.type.mcp_server'),
    skill: t('tool.type.skill'),
    rule: t('tool.type.rule'),
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 rounded-xl bg-[var(--bg-secondary)] p-1 dark:bg-[var(--bg-tertiary)]">
        {TYPE_VALUES.map((value) => (
          <button
            key={value}
            onClick={() =>
              onFilterChange({
                ...currentFilters,
                type: (value || undefined) as ToolFilters['type'],
              })
            }
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
              (currentFilters.type ?? '') === (value || '')
                ? 'bg-white text-[var(--text-primary)] shadow-sm dark:bg-[var(--bg-secondary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {typeLabels[value]}
          </button>
        ))}
      </div>

      <select
        value={currentFilters.platform ?? ''}
        onChange={(e) =>
          onFilterChange({ ...currentFilters, platform: e.target.value || undefined })
        }
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] dark:bg-[var(--bg-tertiary)]"
      >
        <option value="">{t('filter.allPlatforms')}</option>
        {ALL_PLATFORMS.map((p) => (
          <option key={p.slug} value={p.slug}>{p.name}</option>
        ))}
      </select>

      <select
        value={currentFilters.category ?? ''}
        onChange={(e) =>
          onFilterChange({ ...currentFilters, category: e.target.value || undefined })
        }
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] dark:bg-[var(--bg-tertiary)]"
      >
        <option value="">{t('filter.allCategories')}</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {locale === 'zh' ? c.nameZh : c.nameEn}
          </option>
        ))}
      </select>

      <select
        value={currentFilters.sort ?? 'stars'}
        onChange={(e) =>
          onFilterChange({ ...currentFilters, sort: e.target.value as ToolFilters['sort'] })
        }
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] dark:bg-[var(--bg-tertiary)]"
      >
        <option value="stars">{t('filter.mostStars')}</option>
        <option value="recent">{t('filter.recentlyUpdated')}</option>
        <option value="rating">{t('filter.highestRated')}</option>
        <option value="name">{t('filter.nameAZ')}</option>
      </select>
    </div>
  );
}
