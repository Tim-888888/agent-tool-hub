'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/lib/i18n-context';

export default function Footer() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const [proNewsletter, setProNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const isPro = session?.user?.isPro ?? false;

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch('/api/pro/newsletter')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProNewsletter(json.data.proNewsletter);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  const toggleNewsletter = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pro/newsletter', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setProNewsletter(json.data.proNewsletter);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
    setLoading(false);
  };

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)] transition-theme">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Pro Newsletter */}
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t('newsletter.proTitle')}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {t('newsletter.proDescription')}
          </p>

          {!session?.user?.id ? (
            <p className="mt-3 text-xs text-[var(--text-tertiary)]">
              {t('newsletter.proSignIn')}
            </p>
          ) : !isPro ? (
            <p className="mt-3 text-xs text-[var(--text-tertiary)]">
              {t('newsletter.proNotPro')}
            </p>
          ) : (
            <div className="mt-3">
              <button
                onClick={toggleNewsletter}
                disabled={loading}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 ${
                  proNewsletter
                    ? 'border border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]'
                }`}
              >
                {loading
                  ? '...'
                  : proNewsletter
                    ? t('newsletter.proUnsubscribe')
                    : t('newsletter.proSubscribe')}
              </button>
              {status === 'success' && (
                <p className="mt-2 text-xs text-green-500">
                  {proNewsletter ? t('newsletter.proSubscribed') : t('newsletter.proUnsubscribed')}
                </p>
              )}
              {status === 'error' && (
                <p className="mt-2 text-xs text-red-500">{t('newsletter.error')}</p>
              )}
            </div>
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
