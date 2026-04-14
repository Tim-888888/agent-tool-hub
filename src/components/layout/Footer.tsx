'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n-context';

export default function Footer() {
  const { locale, t } = useI18n();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)] transition-theme">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Newsletter */}
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t('newsletter.title')}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {t('newsletter.description')}
          </p>
          <form onSubmit={handleSubscribe} className="mt-3 flex items-center justify-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
              placeholder={t('newsletter.placeholder')}
              required
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--color-accent)] dark:bg-[var(--bg-tertiary)]"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {status === 'loading' ? '...' : t('newsletter.subscribe')}
            </button>
          </form>
          {status === 'success' && (
            <p className="mt-2 text-xs text-green-500">{t('newsletter.success')}</p>
          )}
          {status === 'error' && (
            <p className="mt-2 text-xs text-red-500">{t('newsletter.error')}</p>
          )}
        </div>

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
