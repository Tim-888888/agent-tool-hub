"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useI18n, localePath } from "@/lib/i18n-context";
import Link from "next/link";

interface Collection {
  id: string;
  slug: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  icon: string | null;
  toolCount: number;
}

const DEFAULT_ICONS = ["📦", "🧰", "🔧", "⚡", "🎯", "🚀", "💡", "🏆"];

export default function CollectionsPage() {
  const { locale, t } = useI18n();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const res = await fetch("/api/collections");
        const json = await res.json();
        if (json.success) {
          setCollections(json.data);
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchCollections();
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {t("collections.title")}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {t("collections.description")}
            </p>
          </div>
        </section>

        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              </div>
            ) : collections.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-lg text-[var(--text-secondary)]">
                  {t("collections.empty")}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {collections.map((collection, i) => (
                  <Link
                    key={collection.id}
                    href={localePath(locale, `/collections/${collection.slug}`)}
                    className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-6 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="mb-3 text-3xl">
                      {collection.icon || DEFAULT_ICONS[i % DEFAULT_ICONS.length]}
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)]">
                      {locale === "zh" ? collection.titleZh : collection.titleEn}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">
                      {locale === "zh" && collection.descriptionZh
                        ? collection.descriptionZh
                        : collection.descriptionEn}
                    </p>
                    <p className="mt-4 text-xs font-medium text-[var(--text-tertiary)]">
                      {collection.toolCount} {t("collections.tools")}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
