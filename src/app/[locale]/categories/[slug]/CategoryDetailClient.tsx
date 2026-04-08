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
  const categoryName = locale === 'zh' ? category.nameZh : category.nameEn;

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[var(--text-secondary)]">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-[var(--text-primary)]">
                    {t('nav.home')}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-[var(--text-primary)]" aria-current="page">{categoryName}</li>
              </ol>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {categoryName}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {locale === 'zh' ? category.descriptionZh : (category.descriptionEn ?? '')}
            </p>
          </div>
        </section>
        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {tools.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)]">
                {locale === 'zh' ? '\u6b64\u5206\u7c7b\u6682\u65e0\u5de5\u5177' : 'No tools in this category yet'}
              </p>
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
