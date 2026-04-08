'use client';

import { useI18n } from '@/lib/i18n-context';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)] transition-theme">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-[var(--text-secondary)]">
          {t('footer.description')}
        </p>
        <p className="mt-2 text-center text-xs text-[var(--text-tertiary)]">
          {t('footer.builtWith')}
        </p>
      </div>
    </footer>
  );
}
