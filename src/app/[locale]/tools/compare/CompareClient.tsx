'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CompareToolSearch from '@/components/tools/CompareToolSearch';
import { useI18n, localePath } from '@/lib/i18n-context';
import { formatDate } from '@/lib/utils';
import { trackEvent } from '@/hooks/useAnalytics';
import type { Tool } from '@/types';

const MAX_COMPARE = 4;

export default function CompareClient() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSlugs = (searchParams.get('tools') ?? '').split(',').filter(Boolean).slice(0, MAX_COMPARE);
  const [slugs, setSlugs] = useState<string[]>(initialSlugs);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slugs.length === 0) {
      setTools([]);
      return;
    }
    setLoading(true);
    fetch(`/api/tools/batch?slugs=${slugs.join(',')}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTools(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slugs]);

  function updateUrl(newSlugs: string[]) {
    const params = new URLSearchParams();
    if (newSlugs.length > 0) params.set('tools', newSlugs.join(','));
    router.replace(`${localePath(locale, '/tools/compare')}?${params.toString()}`);
  }

  function addTool(slug: string) {
    if (slugs.length >= MAX_COMPARE || slugs.includes(slug)) return;
    const next = [...slugs, slug];
    setSlugs(next);
    updateUrl(next);
    trackEvent('compare_add', { slug });
  }

  function removeTool(slug: string) {
    const next = slugs.filter((s) => s !== slug);
    setSlugs(next);
    updateUrl(next);
  }

  const rows: { label: string; render: (tool: Tool) => React.ReactNode }[] = [
    { label: t('tool.type.' + 'mcp_server').split(' ')[0], render: (tool) => t(`tool.type.${tool.type.toLowerCase()}`) },
    { label: t('tool.stars'), render: (tool) => String(tool.stars) },
    { label: t('tool.forks'), render: (tool) => String(tool.forks) },
    { label: t('tool.reviews'), render: (tool) => `${tool.avgRating.toFixed(1)} (${tool.ratingCount})` },
    { label: t('tool.license'), render: (tool) => tool.license ?? '—' },
    { label: t('tool.language'), render: (tool) => tool.language ?? '—' },
    { label: t('tool.lastUpdate'), render: (tool) => formatDate(tool.lastCommitAt ?? tool.updatedAt) },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {t('compare.title')}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {t('compare.description')}
            </p>
          </div>
        </section>

        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Add tool */}
            {slugs.length < MAX_COMPARE && (
              <div className="mb-6 max-w-sm">
                <CompareToolSearch onSelect={addTool} excludeSlugs={slugs} />
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-[var(--text-secondary)]">{t('common.loading')}</div>
            ) : tools.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-secondary)]">
                {t('compare.empty')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-[var(--bg-primary)] p-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)] dark:bg-[var(--bg-secondary)]">
                        &nbsp;
                      </th>
                      {tools.map((tool) => (
                        <th key={tool.id} className="min-w-[200px] p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <a
                              href={localePath(locale, `/tools/${tool.slug}`)}
                              className="font-semibold text-[var(--text-primary)] hover:text-[var(--color-accent)]"
                            >
                              {tool.name}
                            </a>
                            <button
                              onClick={() => removeTool(tool.slug)}
                              className="rounded-md p-0.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                              aria-label={t('compare.remove')}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label} className="border-t border-[var(--border)]">
                        <td className="sticky left-0 bg-[var(--bg-primary)] p-3 text-xs font-medium text-[var(--text-secondary)] dark:bg-[var(--bg-secondary)]">
                          {row.label}
                        </td>
                        {tools.map((tool) => (
                          <td key={tool.id} className="p-3 text-center text-sm text-[var(--text-primary)]">
                            {row.render(tool)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Platforms */}
                    <tr className="border-t border-[var(--border)]">
                      <td className="sticky left-0 bg-[var(--bg-primary)] p-3 text-xs font-medium text-[var(--text-secondary)] dark:bg-[var(--bg-secondary)]">
                        {t('compare.platforms')}
                      </td>
                      {tools.map((tool) => (
                        <td key={tool.id} className="p-3 text-center text-sm text-[var(--text-primary)]">
                          {tool.platforms.map((p) => p.name).join(', ') || '—'}
                        </td>
                      ))}
                    </tr>
                    {/* Categories */}
                    <tr className="border-t border-[var(--border)]">
                      <td className="sticky left-0 bg-[var(--bg-primary)] p-3 text-xs font-medium text-[var(--text-secondary)] dark:bg-[var(--bg-secondary)]">
                        {t('compare.categories')}
                      </td>
                      {tools.map((tool) => (
                        <td key={tool.id} className="p-3 text-center text-sm text-[var(--text-primary)]">
                          {tool.categories.map((c) => locale === 'zh' ? c.nameZh : c.nameEn).join(', ') || '—'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
