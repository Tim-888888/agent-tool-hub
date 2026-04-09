'use client'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import SubmitForm from '@/components/tools/SubmitForm'
import { useI18n } from '@/lib/i18n-context'

export default function SubmitPage() {
  const { t } = useI18n()

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {t('community.submitTitle')}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {t('community.submitDescription')}
            </p>
          </div>
        </section>
        <section className="py-12">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <SubmitForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
