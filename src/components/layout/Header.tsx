'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/lib/i18n-context';
import LoginButton from '@/components/auth/LoginButton';
import NotificationBell from '@/components/layout/NotificationBell';

function getLocalePath(path: string, locale: string): string {
  return `/${locale}${path}`;
}

export default function Header() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const isAdmin = session?.user?.isAdmin ?? false;

  // Strip current locale prefix to get the base path
  const basePath = pathname.replace(/^\/(en|zh)/, '') || '/';

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en';
    // Set cookie so proxy middleware respects user's choice
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    // Use client-side navigation to preserve React state and NextAuth session
    router.push(`/${newLocale}${basePath}`);
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
            href={getLocalePath('/contributors', locale)}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {t('nav.contributors')}
          </Link>
          <Link
            href={getLocalePath('/collections', locale)}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {t('nav.collections')}
          </Link>
          <Link
            href={getLocalePath('/about', locale)}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {t('nav.about')}
          </Link>
          {session && (
            <Link
              href={getLocalePath('/favorites', locale)}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {t('nav.favorites')}
            </Link>
          )}
          {isAdmin && (
            <Link
              href={getLocalePath('/admin/submissions', locale)}
              className="rounded-lg bg-[var(--color-accent)]/10 px-3 py-1 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20"
            >
              {t('nav.admin')}
            </Link>
          )}
          <NotificationBell />
          <LoginButton />
          <button
            onClick={toggleLocale}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label={locale === 'en' ? t('common.switchToChinese') : t('common.switchToEnglish')}
          >
            {locale === 'en' ? '\u4e2d\u6587' : 'EN'}
          </button>
        </nav>
      </div>
    </header>
  );
}
