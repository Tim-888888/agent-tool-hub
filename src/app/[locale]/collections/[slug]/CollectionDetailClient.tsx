"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useI18n, localePath } from "@/lib/i18n-context";
import Link from "next/link";
import { formatStars } from "@/lib/utils";

interface CollectionTool {
  id: string;
  slug: string;
  name: string;
  description: string;
  descriptionZh: string | null;
  stars: number;
  forks: number;
  language: string | null;
  type: string;
  avgRating: number;
  repoUrl: string;
  noteEn: string | null;
  noteZh: string | null;
}

interface CollectionData {
  id: string;
  slug: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  icon: string | null;
  tools: CollectionTool[];
}

function getTypeColor(type: string): string {
  switch (type) {
    case "MCP_SERVER": return "#3b82f6";
    case "SKILL": return "#8b5cf6";
    case "RULE": return "#f59e0b";
    default: return "#6e6e73";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "MCP_SERVER": return "MCP";
    case "SKILL": return "Skill";
    case "RULE": return "Rule";
    default: return type;
  }
}

export default function CollectionDetailClient() {
  const params = useParams();
  const slug = params.slug as string;
  const { locale, t } = useI18n();
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCollection() {
      try {
        const res = await fetch(`/api/collections/${slug}`);
        const json = await res.json();
        if (json.success) {
          setCollection(json.data);
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchCollection();
  }, [slug]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </main>
        <Footer />
      </>
    );
  }

  if (!collection) {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center py-20">
          <p className="text-lg text-[var(--text-secondary)]">
            {t("collections.notFound")}
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const title = locale === "zh" ? collection.titleZh : collection.titleEn;
  const description = locale === "zh" && collection.descriptionZh ? collection.descriptionZh : collection.descriptionEn;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-4 text-sm text-[var(--text-tertiary)]">
              <Link
                href={localePath(locale, "/collections")}
                className="hover:text-[var(--color-accent)]"
              >
                {t("collections.title")}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-[var(--text-secondary)]">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              {collection.icon && <span className="text-3xl">{collection.icon}</span>}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                  {title}
                </h1>
                {description && (
                  <p className="mt-2 text-lg text-[var(--text-secondary)]">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--text-tertiary)]">
              {collection.tools.length} {t("collections.tools")}
            </p>
          </div>
        </div>

        {/* Tools List */}
        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {collection.tools.length === 0 ? (
              <p className="py-12 text-center text-[var(--text-secondary)]">
                {t("collections.noTools")}
              </p>
            ) : (
              <div className="space-y-3">
                {collection.tools.map((tool) => {
                  const note = locale === "zh" && tool.noteZh ? tool.noteZh : tool.noteEn;
                  return (
                    <a
                      key={tool.id}
                      href={localePath(locale, `/tools/${tool.slug}`)}
                      className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-md)] sm:p-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)]">
                            {tool.name}
                          </h3>
                          <span
                            className="rounded-md px-1.5 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${getTypeColor(tool.type)}15`,
                              color: getTypeColor(tool.type),
                            }}
                          >
                            {getTypeLabel(tool.type)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-[var(--text-secondary)]">
                          {locale === "zh" && tool.descriptionZh
                            ? tool.descriptionZh
                            : tool.description}
                        </p>
                        {note && (
                          <p className="mt-1 text-xs text-[var(--color-accent)]">
                            {note}
                          </p>
                        )}
                      </div>
                      <div className="hidden flex-shrink-0 items-center gap-4 sm:flex">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            ★ {formatStars(tool.stars)}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
