'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useI18n } from '@/lib/i18n-context';

export default function SubmitPage() {
  const { locale, t } = useI18n();

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {t('submit.title')}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {t('submit.description')}
            </p>
          </div>
        </section>
        <section className="py-12">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-8">
              <p className="text-center text-[var(--text-secondary)]">
                {locale === 'zh'
                  ? '\u63d0\u4ea4\u529f\u80fd\u5373\u5c06\u63a8\u51fa\u3002\u8bf7\u901a\u8fc7 GitHub \u63d0\u4ea4 Issue \u6216 PR \u6765\u5206\u4eab\u5de5\u5177\u3002'
                  : 'Submission coming soon. Please share your tool via a GitHub Issue or PR.'}
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
