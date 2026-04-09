'use client';

import Link from 'next/link';
import { useI18n, localePath } from '@/lib/i18n-context';
import type { Category } from '@/types';

interface CategoryGridProps {
  categories: Category[];
  toolCounts: Record<string, number>;
}

export default function CategoryGrid({ categories, toolCounts }: CategoryGridProps) {
  const { t, locale } = useI18n();

  if (categories.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('home.categories')}</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={localePath(locale, `/categories/${cat.slug}`)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-md)]"
            >
              <h3 className="font-semibold text-[var(--text-primary)]">
                {locale === 'zh' ? cat.nameZh : cat.nameEn}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {toolCounts[cat.slug] ?? 0} {t('home.tools')}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
