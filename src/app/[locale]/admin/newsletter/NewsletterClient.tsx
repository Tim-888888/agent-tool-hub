'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';

interface Subscriber {
  id: string;
  email: string;
  locale: string;
  createdAt: string;
}

interface DigestSend {
  id: string;
  userId: string;
  sentAt: string;
  toolCount: number;
  status: string;
  error: string | null;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  proSubscriberCount: number;
  recent: Subscriber[];
  recentDigestSends: DigestSend[];
}

export default function NewsletterClient() {
  const { locale, t } = useI18n();
  const zh = locale === "zh";
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  function loadStats() {
    fetch('/api/admin/newsletter')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadStats(); }, []);

  async function sendDigest() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/digest', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        const { sent, failed, toolCount } = json.data;
        setSendResult(zh
          ? `发送完成：${sent} 成功，${failed} 失败，共 ${toolCount} 个工具`
          : `Sent: ${sent} success, ${failed} failed, ${toolCount} tools`
        );
        loadStats();
      } else {
        setSendResult(zh ? '发送失败' : 'Failed to send');
      }
    } catch {
      setSendResult(zh ? '发送失败' : 'Failed to send');
    }
    setSending(false);
  }

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

      {/* Pro Digest Section */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {zh ? 'Pro 周报' : 'Pro Weekly Digest'}
        </h3>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="rounded-xl bg-[var(--bg-tertiary)] px-4 py-2">
            <span className="text-lg font-bold text-[var(--color-accent)]">{stats.proSubscriberCount}</span>
            <span className="ml-2 text-sm text-[var(--text-secondary)]">
              {zh ? 'Pro 订阅者' : 'Pro subscribers'}
            </span>
          </div>

          <button
            onClick={sendDigest}
            disabled={sending}
            className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {sending
              ? (zh ? '发送中...' : 'Sending...')
              : (zh ? '发送测试周报' : 'Send Test Digest')}
          </button>

          <a
            href="/api/digest?preview=true"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            {zh ? '预览周报' : 'Preview Digest'}
          </a>
        </div>

        {sendResult && (
          <p className={`mb-4 text-sm ${sendResult.includes('Failed') || sendResult.includes('失败') ? 'text-red-500' : 'text-green-500'}`}>
            {sendResult}
          </p>
        )}

        {/* Recent digest sends */}
        {stats.recentDigestSends && stats.recentDigestSends.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
              {zh ? '最近发送记录' : 'Recent Sends'}
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-2 text-left text-[var(--text-tertiary)]">{zh ? '时间' : 'Time'}</th>
                  <th className="pb-2 text-left text-[var(--text-tertiary)]">{zh ? '工具数' : 'Tools'}</th>
                  <th className="pb-2 text-left text-[var(--text-tertiary)]">{zh ? '状态' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDigestSends.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 text-[var(--text-secondary)]">{new Date(s.sentAt).toLocaleString()}</td>
                    <td className="py-2 text-[var(--text-secondary)]">{s.toolCount}</td>
                    <td className="py-2">
                      <span className={s.status === 'sent' ? 'text-green-500' : 'text-red-500'}>
                        {s.status === 'sent' ? (zh ? '已发送' : 'Sent') : (zh ? '失败' : 'Failed')}
                      </span>
                      {s.error && <span className="ml-2 text-xs text-[var(--text-tertiary)]">{s.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
