'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Box, Menu, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import LoginButton from '@/components/auth/LoginButton';
import NotificationBell from '@/components/layout/NotificationBell';

const navItems = [
  { path: '/tools', key: 'nav.tools' },
  { path: '/rankings', key: 'nav.rankings' },
  { path: '/collections', key: 'nav.collections' },
  { path: '/contributors', key: 'nav.contributors' },
  { path: '/about', key: 'nav.about' },
] as const;

function getLocalePath(path: string, locale: string): string {
  return `/${locale}${path}`;
}

export default function Header() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = session?.user?.isAdmin ?? false;
  const basePath = pathname.replace(/^\/(en|zh)/, '') || '/';

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en';
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.push(`/${newLocale}${basePath}`);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link
          href={getLocalePath('/', locale)}
          className="inline-flex items-center gap-3 text-xl font-bold text-slate-950"
          onClick={() => setMobileOpen(false)}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]">
            <Box className="h-5 w-5" strokeWidth={2.2} />
          </span>
          AgentToolHub
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={getLocalePath(item.path, locale)}
              className="text-sm font-bold text-slate-700 transition hover:text-slate-950"
            >
              {t(item.key)}
            </Link>
          ))}
          {session && (
            <Link
              href={getLocalePath('/favorites', locale)}
              className="text-sm font-bold text-slate-700 transition hover:text-slate-950"
            >
              {t('nav.favorites')}
            </Link>
          )}
          {isAdmin && (
            <Link
              href={getLocalePath('/admin/submissions', locale)}
              className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
            >
              {t('nav.admin')}
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <NotificationBell />
          <LoginButton />
          <button
            onClick={toggleLocale}
            className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            aria-label={locale === 'en' ? t('common.switchToChinese') : t('common.switchToEnglish')}
          >
            {locale === 'en' ? '\u4e2d\u6587' : 'EN'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={getLocalePath(item.path, locale)}
                className="rounded-lg px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setMobileOpen(false)}
              >
                {t(item.key)}
              </Link>
            ))}
            {session && (
              <Link
                href={getLocalePath('/favorites', locale)}
                className="rounded-lg px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setMobileOpen(false)}
              >
                {t('nav.favorites')}
              </Link>
            )}
            {isAdmin && (
              <Link
                href={getLocalePath('/admin/submissions', locale)}
                className="rounded-lg px-3 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
                onClick={() => setMobileOpen(false)}
              >
                {t('nav.admin')}
              </Link>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
              <NotificationBell />
              <LoginButton />
              <button
                onClick={toggleLocale}
                className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                aria-label={
                  locale === 'en' ? t('common.switchToChinese') : t('common.switchToEnglish')
                }
              >
                {locale === 'en' ? '\u4e2d\u6587' : 'EN'}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
