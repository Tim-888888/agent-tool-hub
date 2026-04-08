import { getDictionary } from '@/i18n/dictionaries';
import type { AppLocale } from '@/i18n/dictionaries';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale as AppLocale);

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {dict.about.title}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {dict.about.description}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
