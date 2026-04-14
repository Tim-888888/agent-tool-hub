'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { localePath } from '@/lib/i18n-context';
import type { Tool } from '@/types';
import ToolCard from '@/components/tools/ToolCard';

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const { locale, t } = useI18n();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      setLoading(false);
      return;
    }

    fetch('/api/favorites')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data) {
          setTools(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, status]);

  if (status === 'loading' || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-[var(--bg-tertiary)]" />
          <div className="h-4 w-64 rounded bg-[var(--bg-tertiary)]" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <Heart size={48} className="mx-auto mb-4 text-[var(--text-tertiary)]" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {t('favorites.signInToFavorites')}
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {t('favorites.description')}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {t('favorites.title')}
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          {t('favorites.description')}
        </p>
      </div>

      {tools.length === 0 ? (
        <div className="py-16 text-center">
          <Heart size={40} className="mx-auto mb-4 text-[var(--text-tertiary)]" />
          <p className="text-lg text-[var(--text-secondary)]">
            {t('favorites.empty')}
          </p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            {t('favorites.emptyDesc')}
          </p>
          <Link
            href={localePath(locale, '/tools')}
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90"
          >
            {t('favorites.browseTools')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
