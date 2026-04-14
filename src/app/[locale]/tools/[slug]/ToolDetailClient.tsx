'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Badge from '@/components/ui/Badge';
import StarRating from '@/components/shared/StarRating';
import CopyButton from '@/components/shared/CopyButton';
import CompatibilityMatrix from '@/components/tools/CompatibilityMatrix';
import InstallGuide from '@/components/tools/InstallGuide';
import AgentInstallSection from '@/components/tools/AgentInstallSection';
import ReviewSection from '@/components/tools/ReviewSection';
import TagVoting from '@/components/tools/TagVoting';
import { formatStars, formatDate, getToolTypeColor } from '@/lib/utils';
import { useI18n, localePath } from '@/lib/i18n-context';
import { trackEvent } from '@/hooks/useAnalytics';
import type { Tool } from '@/types';

interface Props {
  tool: Tool;
}

export default function ToolDetailClient({ tool }: Props) {
  const { locale, t } = useI18n();

  useEffect(() => {
    trackEvent('tool_view', { slug: tool.slug });
  }, [tool.slug]);

  const description = locale === 'zh' && tool.descriptionZh ? tool.descriptionZh : tool.description;
  const features = locale === 'zh' && tool.featuresZh.length > 0 ? tool.featuresZh : tool.featuresEn;
  const typeLabel = t(`tool.type.${tool.type.toLowerCase()}`);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
            <ol className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <li>
                <Link href={localePath(locale, '/')} className="transition-colors hover:text-[var(--text-primary)]">
                  {t('nav.home')}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={localePath(locale, '/tools')} className="transition-colors hover:text-[var(--text-primary)]">
                  {t('nav.tools')}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-[var(--text-primary)]" aria-current="page">{tool.name}</li>
            </ol>
          </div>
        </nav>

        {/* Content */}
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Main Content */}
            <article className="min-w-0 flex-1 lg:w-2/3">
              <div className="mb-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge label={typeLabel} color={getToolTypeColor(tool.type)} />
                  {tool.platforms.map((p) => (
                    <Badge key={p.id} label={p.name} variant="outline" />
                  ))}
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                  {tool.name}
                </h1>
              </div>

              {/* Description - single language */}
              <section className="mb-8">
                <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
                  {description}
                </p>
              </section>

              {/* Features */}
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">
                  {t('tool.features')}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 block h-5 w-5 flex-shrink-0 rounded-full bg-[var(--color-accent)]/10 text-center text-xs leading-5 text-[var(--color-accent)]">
                        ✓
                      </span>
                      <span className="text-[var(--text-primary)]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Install Guide */}
              {tool.installGuide && (
                <section className="mb-8">
                  <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">
                    {t('tool.installGuide')}
                  </h2>
                  <InstallGuide guide={tool.installGuide} locale={locale} />
                </section>
              )}

              {/* Agent Install */}
              <AgentInstallSection tool={tool} />

              {/* Reviews */}
              <section className="mt-8">
                <ReviewSection tool={tool} />
              </section>

              {/* Community Tags */}
              <section className="mt-8">
                <TagVoting toolSlug={tool.slug} toolId={tool.id} />
              </section>
            </article>

            {/* Sidebar */}
            <aside className="lg:w-1/3">
              <div className="space-y-5">
                {/* Stats Card */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-theme">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-[var(--text-primary)]">{formatStars(tool.stars)}</span>
                      <span className="text-sm text-[var(--text-tertiary)]">{t('tool.stars')}</span>
                    </div>
                    <span className="text-sm text-[var(--text-tertiary)]">
                      {formatStars(tool.forks)} {t('tool.forks')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={tool.avgRating} />
                    <span className="text-sm font-medium text-[var(--text-primary)]">{tool.avgRating.toFixed(1)}</span>
                    <span className="text-sm text-[var(--text-tertiary)]">({tool.ratingCount} {t('tool.reviews')})</span>
                  </div>
                </div>

                {/* Details Card */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-theme">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {t('tool.details')}
                  </h3>
                  <dl className="space-y-3">
                    {tool.language && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-[var(--text-secondary)]">{t('tool.language')}</dt>
                        <dd className="text-sm font-medium text-[var(--text-primary)]">{tool.language}</dd>
                      </div>
                    )}
                    {tool.license && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-[var(--text-secondary)]">{t('tool.license')}</dt>
                        <dd className="text-sm font-medium text-[var(--text-primary)]">{tool.license}</dd>
                      </div>
                    )}
                    {tool.author && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-[var(--text-secondary)]">{t('tool.author')}</dt>
                        <dd className="text-sm font-medium text-[var(--text-primary)]">{tool.author}</dd>
                      </div>
                    )}
                    {tool.version && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-[var(--text-secondary)]">{t('tool.version')}</dt>
                        <dd className="text-sm font-medium text-[var(--text-primary)]">{tool.version}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <dt className="text-sm text-[var(--text-secondary)]">{t('tool.lastUpdate')}</dt>
                      <dd className="text-sm font-medium text-[var(--text-primary)]">{formatDate(tool.lastCommitAt ?? tool.updatedAt)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Compatibility */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-theme">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {t('tool.compatibility')}
                  </h3>
                  <CompatibilityMatrix tool={tool} />
                </div>

                {/* Repo Link */}
                <a
                  href={tool.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.98]"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  {t('tool.viewOnGithub')}
                </a>

                {/* Tags */}
                {tool.tags.length > 0 && (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-theme">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      {t('tool.tags')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tool.tags.map((tag) => (
                        <span key={tag} className="rounded-lg bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
