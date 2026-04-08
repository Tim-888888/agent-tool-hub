'use client';

import { useI18n } from '@/lib/i18n-context';

interface HeroSectionProps {
  stats: { tools: number; platforms: number; categories: number };
}

export default function HeroSection({ stats }: HeroSectionProps) {
  const { t } = useI18n();

  return (
    <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
          {t('hero.title')}
        </h1>
        <p className="mt-4 text-lg text-[var(--text-secondary)]">{t('hero.subtitle')}</p>
        <div className="mt-8 flex gap-8">
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.tools}</div>
            <div className="text-sm text-[var(--text-secondary)]">Tools</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.platforms}</div>
            <div className="text-sm text-[var(--text-secondary)]">Platforms</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.categories}</div>
            <div className="text-sm text-[var(--text-secondary)]">Categories</div>
          </div>
        </div>
      </div>
    </section>
  );
}
