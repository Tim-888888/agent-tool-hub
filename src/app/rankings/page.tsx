"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { formatStars } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";
import type { Tool } from "@/types";

type TabValue = "overall" | "weekly" | "newest";

interface TabItem {
  value: TabValue;
  labelKey: string;
}

const TABS: TabItem[] = [
  { value: "overall", labelKey: "ranking.overall" },
  { value: "weekly", labelKey: "ranking.weekly" },
  { value: "newest", labelKey: "ranking.newest" },
];

function getMedalClasses(rank: number): string {
  if (rank === 1) return "bg-amber-400 text-amber-900";
  if (rank === 2) return "bg-gray-300 text-gray-700";
  if (rank === 3) return "bg-amber-600 text-amber-100";
  return "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";
}

export default function RankingsPage() {
  const { locale, t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabValue>("overall");
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTools() {
      try {
        const res = await fetch("/api/tools?limit=100");
        const json = await res.json();
        if (json.success) {
          setAllTools(json.data);
        }
      } catch {
        // Silently handle fetch errors
      } finally {
        setLoading(false);
      }
    }
    fetchTools();
  }, []);

  const rankedTools = useMemo<Tool[]>(() => {
    const sorted = [...allTools];
    switch (activeTab) {
      case "overall":
        sorted.sort((a, b) => b.stars - a.stars);
        break;
      case "weekly":
        sorted.sort(
          (a, b) =>
            new Date(b.lastCommitAt || b.updatedAt).getTime() -
            new Date(a.lastCommitAt || a.updatedAt).getTime()
        );
        break;
      case "newest":
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    return sorted;
  }, [activeTab, allTools]);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {t('ranking.title')}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {t('ranking.description')}
            </p>
          </div>
        </section>

        {/* Tabs */}
        <section className="border-b border-[var(--border)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <nav
              className="flex gap-1"
              role="tablist"
              aria-label="Ranking tabs"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={activeTab === tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {t(tab.labelKey)}
                  {activeTab === tab.value && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--color-accent)]" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </section>

        {/* Rankings List */}
        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {loading ? null : (
              <div className="space-y-3">
                {rankedTools.map((tool, index) => {
                  const rank = index + 1;
                  return (
                    <a
                      key={tool.id}
                      href={`/tools/${tool.slug}`}
                      className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-md)] sm:p-5"
                    >
                      {/* Rank Badge */}
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${getMedalClasses(rank)}`}
                      >
                        {rank}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)]">
                            {tool.name}
                          </h3>
                          <span
                            className="rounded-md px-1.5 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${getToolTypeColor(tool.type)}15`,
                              color: getToolTypeColor(tool.type),
                            }}
                          >
                            {tool.type === "MCP_SERVER"
                              ? "MCP"
                              : tool.type === "SKILL"
                                ? "Skill"
                                : "Rule"}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-[var(--text-secondary)]">
                          {locale === 'zh' && tool.descriptionZh ? tool.descriptionZh : tool.description}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="hidden flex-shrink-0 items-center gap-4 sm:flex">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            ★ {formatStars(tool.stars)}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {t('ranking.stars')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {tool.avgRating.toFixed(1)}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {t('ranking.rating')}
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

function getToolTypeColor(type: string): string {
  switch (type) {
    case "MCP_SERVER":
      return "#3b82f6";
    case "SKILL":
      return "#8b5cf6";
    case "RULE":
      return "#f59e0b";
    default:
      return "#6e6e73";
  }
}
