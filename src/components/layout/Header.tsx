'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/lib/i18n-context';
import LoginButton from '@/components/auth/LoginButton';

function getLocalePath(path: string, locale: string): string {
  return `/${locale}${path}`;
}

// Must match server-side ADMIN_GITHUB_IDS in auth-helpers.ts
const ADMIN_GITHUB_IDS = (typeof window !== 'undefined'
  ? (window as unknown as { __ADMIN_IDS?: string }).__ADMIN_IDS
  : '') ?? '';

export default function Header() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const { data: session } = useSession();

  // Check if current user is admin
  const isAdmin = session?.user?.id
    ? (process.env.NEXT_PUBLIC_ADMIN_GITHUB_IDS ?? '').split(',').includes(session.user.id)
    : false;

  // Strip current locale prefix to get the base path
  const basePath = pathname.replace(/^\/(en|zh)/, '') || '/';

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en';
    // Set cookie so proxy middleware respects user's choice
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    // Full page navigation to ensure locale change takes effect
    window.location.href = `/${newLocale}${basePath}`;
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
          {isAdmin && (
            <Link
              href="/admin/submissions"
              className="rounded-lg bg-[var(--color-accent)]/10 px-3 py-1 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20"
            >
              {t('nav.admin')}
            </Link>
          )}
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
