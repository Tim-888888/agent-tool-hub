'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';

function getLocalePath(path: string, locale: string): string {
  return locale === 'en' ? path : `/zh${path}`;
}

export default function Header() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const toggleLocale = () => {
    if (locale === 'en') {
      router.push(`/zh${pathname}`);
    } else {
      router.push(pathname.replace(/^\/zh/, '') || '/');
    }
  };

  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg-primary)] transition-theme">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={getLocalePath('/', locale)}
          className="text-xl font-bold text-[var(--text-primary)]"
        >
          AgentToolHub
        </Link>
        <nav className="flex items-center gap-6" aria-label="Main navigation">
          <Link
            href={getLocalePath('/tools', locale)}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {t('nav.tools')}
          </Link>
          <Link
            href={getLocalePath('/rankings', locale)}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {t('nav.rankings')}
          </Link>
          <Link
            href={getLocalePath('/about', locale)}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {t('nav.about')}
          </Link>
          <button
            onClick={toggleLocale}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label={`Switch to ${locale === 'en' ? 'Chinese' : 'English'}`}
          >
            {locale === 'en' ? '\u4e2d\u6587' : 'EN'}
          </button>
        </nav>
      </div>
    </header>
  );
}
