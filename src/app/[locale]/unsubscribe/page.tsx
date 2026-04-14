'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useI18n } from '@/lib/i18n-context';

function UnsubscribeContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    fetch('/api/newsletter/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((json) => {
        setStatus(json.success ? 'success' : 'error');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          {status === 'loading' && <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>}
          {status === 'success' && <p className="text-[var(--text-primary)]">{t('newsletter.unsubscribed')}</p>}
          {status === 'error' && <p className="text-[var(--text-secondary)]">{t('newsletter.unsubscribeError')}</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
