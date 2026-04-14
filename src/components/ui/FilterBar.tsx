'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ToolFilters, Category } from '@/types';
import { cn } from '@/lib/utils';
import { PLATFORMS as ALL_PLATFORMS } from '@/lib/mock-data';
import { useI18n } from '@/lib/i18n-context';
import SearchInput from '@/components/ui/SearchInput';
import MultiSelect from '@/components/ui/MultiSelect';
import { useDebounce } from '@/hooks/useDebounce';

interface FilterBarProps {
  currentFilters: ToolFilters;
  onFilterChange: (filters: ToolFilters) => void;
}

const TYPE_VALUES = ['', 'mcp', 'skill', 'rule'] as const;
const SEARCH_DEBOUNCE_MS = 300;

interface FilterOptions {
  licenses: string[];
  languages: string[];
}

export default function FilterBar({
  currentFilters,
  onFilterChange,
}: FilterBarProps) {
  const { locale, t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ licenses: [], languages: [] });
  const [searchText, setSearchText] = useState(currentFilters.query ?? '');
  const debouncedSearch = useDebounce(searchText, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [catRes, filterRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/tools/filters'),
        ]);
        const catJson = await catRes.json();
        if (catJson.success) setCategories(catJson.data);
        const filterJson = await filterRes.json();
        if (filterJson.success) setFilterOptions(filterJson.data);
      } catch {
        // Silently handle — dropdowns remain empty
      }
    }
    fetchOptions();
  }, []);

  // Sync external query changes (e.g., URL param) back to local input
  useEffect(() => {
    if ((currentFilters.query ?? '') !== searchText) {
      setSearchText(currentFilters.query ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters.query]);

  // Debounce: push search text to parent after user stops typing
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if ((currentFilters.query ?? '') !== trimmed) {
      onFilterChange({ ...currentFilters, query: trimmed || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const selectedLicenses = currentFilters.license ? currentFilters.license.split(',').filter(Boolean) : [];
  const selectedLanguages = currentFilters.language ? currentFilters.language.split(',').filter(Boolean) : [];

  const typeLabels: Record<string, string> = {
    '': t('filter.allTypes'),
    mcp: t('tool.type.mcp_server'),
    skill: t('tool.type.skill'),
    rule: t('tool.type.rule'),
  };

  const maintenanceOptions = [
    { value: '', label: t('filter.allMaintenance') },
    { value: 'active', label: t('filter.active') },
    { value: 'inactive', label: t('filter.inactive') },
    { value: 'archived', label: t('filter.archived') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        value={searchText}
        onChange={setSearchText}
        placeholder={t('tools.searchPlaceholder')}
        className="min-w-[200px]"
      />
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

      <MultiSelect
        options={filterOptions.licenses}
        selected={selectedLicenses}
        onChange={(vals) => onFilterChange({ ...currentFilters, license: vals.length > 0 ? vals.join(',') : undefined })}
        placeholder={t('filter.allLicenses')}
      />

      <MultiSelect
        options={filterOptions.languages}
        selected={selectedLanguages}
        onChange={(vals) => onFilterChange({ ...currentFilters, language: vals.length > 0 ? vals.join(',') : undefined })}
        placeholder={t('filter.allLanguages')}
      />

      <select
        value={currentFilters.maintenance ?? ''}
        onChange={(e) =>
          onFilterChange({ ...currentFilters, maintenance: (e.target.value || undefined) as ToolFilters['maintenance'] })
        }
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] dark:bg-[var(--bg-tertiary)]"
      >
        {maintenanceOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
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
