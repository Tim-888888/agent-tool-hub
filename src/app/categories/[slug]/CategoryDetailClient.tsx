'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ToolCard from '@/components/tools/ToolCard';
import { useI18n } from '@/lib/i18n-context';
import type { Category, Tool } from '@/types';

interface CategoryDetailClientProps {
  category: Category;
  tools: Tool[];
}

export default function CategoryDetailClient({ category, tools }: CategoryDetailClientProps) {
  const { locale, t } = useI18n();

  const name = locale === 'zh' ? category.nameZh : category.nameEn;
  const description = locale === 'zh' && category.descriptionZh
    ? category.descriptionZh
    : category.descriptionEn;

  const toolsFoundText = t('category.toolsFound')
    .replace('{count}', String(tools.length))
    .replace('{plural}', tools.length !== 1 ? 's' : '');

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Breadcrumb & Header */}
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <li>
                  <Link href="/" className="transition-colors hover:text-[var(--text-primary)]">
                    {t('nav.home')}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-[var(--text-primary)]" aria-current="page">
                  {name}
                </li>
              </ol>
            </nav>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-2xl">
                {category.icon === 'Database' && '🗄️'}
                {category.icon === 'Wrench' && '🔧'}
                {category.icon === 'Plug' && '🔌'}
                {category.icon === 'FolderOpen' && '📁'}
                {category.icon === 'Search' && '🔍'}
                {category.icon === 'Mail' && '✉️'}
                {category.icon === 'BarChart3' && '📊'}
                {category.icon === 'Shield' && '🛡️'}
                {category.icon === 'Image' && '🖼️'}
                {category.icon === 'Zap' && '⚡'}
                {category.icon === 'Cloud' && '☁️'}
                {category.icon === 'Brain' && '🧠'}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                  {name}
                </h1>
              </div>
            </div>
            {description && (
              <p className="mt-3 max-w-2xl text-lg text-[var(--text-secondary)]">
                {description}
              </p>
            )}
            <p className="mt-2 text-sm text-[var(--text-tertiary)]">
              {toolsFoundText}
            </p>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {tools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 text-5xl">📦</div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {t('category.noTools')}
                </h2>
                <p className="mt-2 text-[var(--text-secondary)]">
                  {t('category.noToolsDesc')}
                </p>
                <Link
                  href="/tools"
                  className="mt-6 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  {t('category.browseAll')}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
