"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/lib/i18n-context";

interface Contributor {
  userId: string;
  name: string | null;
  image: string | null;
  approvedCount: number;
  lastSubmissionAt: string;
}

function getMedalClasses(rank: number): string {
  if (rank === 1) return "bg-amber-400 text-amber-900";
  if (rank === 2) return "bg-gray-300 text-gray-700";
  if (rank === 3) return "bg-amber-600 text-amber-100";
  return "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";
}

function getMedalIcon(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function timeAgo(dateStr: string, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return locale === "zh" ? "今天" : "today";
  if (days === 1) return locale === "zh" ? "昨天" : "yesterday";
  if (days < 30) return locale === "zh" ? `${days} 天前` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return locale === "zh" ? `${months} 个月前` : `${months}mo ago`;
}

export default function ContributorsPage() {
  const { locale, t } = useI18n();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContributors() {
      try {
        const res = await fetch("/api/contributors");
        const json = await res.json();
        if (json.success) {
          setContributors(json.data);
        }
      } catch {
        // Silently handle fetch errors
      } finally {
        setLoading(false);
      }
    }
    fetchContributors();
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {t("contributors.title")}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {t("contributors.description")}
            </p>
          </div>
        </section>

        {/* Contributors List */}
        <section className="py-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              </div>
            ) : contributors.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-lg text-[var(--text-secondary)]">
                  {t("contributors.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contributors.map((contributor, index) => {
                  const rank = index + 1;
                  return (
                    <div
                      key={contributor.userId}
                      className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-md)] sm:p-5"
                    >
                      {/* Rank Badge */}
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${getMedalClasses(rank)}`}
                      >
                        {getMedalIcon(rank) || rank}
                      </div>

                      {/* Avatar */}
                      {contributor.image ? (
                        <img
                          src={contributor.image}
                          alt={contributor.name || ""}
                          className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-lg font-semibold text-[var(--color-accent)]">
                          {(contributor.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">
                          {contributor.name || t("contributors.anonymous")}
                        </h3>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          {t("contributors.lastActive")}{" "}
                          {timeAgo(contributor.lastSubmissionAt, locale)}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold text-[var(--color-accent)]">
                          {contributor.approvedCount}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          {t("contributors.approved")}
                        </div>
                      </div>
                    </div>
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
