"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ToolCard from "@/components/tools/ToolCard";
import FilterBar from "@/components/ui/FilterBar";
import { useI18n } from "@/lib/i18n-context";
import type { Tool, ToolFilters } from "@/types";

interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ToolsClient() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [filters, setFilters] = useState<ToolFilters>({ sort: "stars", query: urlQuery || undefined });
  const [tools, setTools] = useState<Tool[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (urlQuery) {
      setFilters((prev) => ({ ...prev, query: urlQuery }));
    }
  }, [urlQuery]);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.query) params.set("q", filters.query);
      if (filters.type) params.set("type", filters.type);
      if (filters.platform) params.set("platform", filters.platform);
      if (filters.category) params.set("category", filters.category);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.page) params.set("page", String(filters.page));
      params.set("limit", "20");

      const res = await fetch(`/api/tools?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTools(json.data);
        setMeta(json.meta);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const totalCount = meta?.total ?? tools.length;

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {t('nav.tools')}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {filters.query
                ? t('tools.searchResult').replace('{count}', String(totalCount)).replace('{query}', filters.query)
                : t('tools.browseTitle').replace('{count}', String(totalCount))
              }
            </p>
          </div>
        </section>

        <section className="border-b border-[var(--border)] transition-theme">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
            <FilterBar currentFilters={filters} onFilterChange={setFilters} />
          </div>
        </section>

        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {loading ? null : tools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 text-5xl">🔍</div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {t('tools.noTools')}
                </h2>
                <p className="mt-2 text-[var(--text-secondary)]">
                  {t('tools.noToolsDesc')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
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
