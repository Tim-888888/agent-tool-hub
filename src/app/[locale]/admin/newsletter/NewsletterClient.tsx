'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';

interface Subscriber {
  id: string;
  email: string;
  locale: string;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  recent: Subscriber[];
}

export default function NewsletterClient() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/newsletter')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-secondary)]">{t('common.loading')}</div>;
  }

  if (!stats) {
    return <div className="py-12 text-center text-[var(--text-secondary)]">{t('newsletter.loadError')}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t('newsletter.adminTitle')}</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-secondary)]">{t('newsletter.totalSubscribers')}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="text-2xl font-bold text-green-500">{stats.active}</div>
          <div className="text-sm text-[var(--text-secondary)]">{t('newsletter.active')}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="text-2xl font-bold text-[var(--text-tertiary)]">{stats.inactive}</div>
          <div className="text-sm text-[var(--text-secondary)]">{t('newsletter.inactive')}</div>
        </div>
      </div>

      {/* Recent subscribers */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {t('newsletter.recentSubscribers')}
        </h3>
        {stats.recent.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t('newsletter.noSubscribers')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-2 text-left text-[var(--text-tertiary)]">Email</th>
                <th className="pb-2 text-left text-[var(--text-tertiary)]">Locale</th>
                <th className="pb-2 text-left text-[var(--text-tertiary)]">{t('tool.lastUpdate')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((sub) => (
                <tr key={sub.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 text-[var(--text-primary)]">{sub.email}</td>
                  <td className="py-2 text-[var(--text-secondary)]">{sub.locale}</td>
                  <td className="py-2 text-[var(--text-secondary)]">{new Date(sub.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
