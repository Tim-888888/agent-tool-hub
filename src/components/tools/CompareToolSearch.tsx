'use client';

import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n-context';

interface CompareToolSearchProps {
  onSelect: (slug: string) => void;
  excludeSlugs: string[];
}

export default function CompareToolSearch({ onSelect, excludeSlugs }: CompareToolSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ slug: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tools/search?q=${encodeURIComponent(query.trim())}&limit=8`);
        const json = await res.json();
        if (json.success) {
          setResults(
            (json.data as { slug: string; name: string }[]).filter(
              (r) => !excludeSlugs.includes(r.slug)
            )
          );
          setOpen(true);
        }
      } catch {
        // Silently handle
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, excludeSlugs]);

  function handleSelect(slug: string) {
    onSelect(slug);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('compare.searchPlaceholder')}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--color-accent)] dark:bg-[var(--bg-tertiary)]"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg dark:bg-[var(--bg-secondary)]">
          {results.map((r) => (
            <button
              key={r.slug}
              onClick={() => handleSelect(r.slug)}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-tertiary)]"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
