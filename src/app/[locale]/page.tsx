"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import HeroSection from "@/components/home/HeroSection";
import FeaturedTools from "@/components/home/FeaturedTools";
import NewestTools from "@/components/home/NewestTools";
import CategoryGrid from "@/components/home/CategoryGrid";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/lib/i18n-context";
import type { Tool, Category } from "@/types";

const PLATFORM_COUNT = 7;

export default function HomePage() {
  const { t } = useI18n();
  const [featuredTools, setFeaturedTools] = useState<Tool[]>([]);
  const [newestTools, setNewestTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<{ tools: number; platforms: number; categories: number }>({
    tools: 0,
    platforms: PLATFORM_COUNT,
    categories: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [featuredRes, newestRes, categoriesRes] = await Promise.all([
          fetch("/api/tools?limit=6&sort=stars"),
          fetch("/api/tools/newest"),
          fetch("/api/categories"),
        ]);

        const featuredJson = await featuredRes.json();
        const newestJson = await newestRes.json();
        const categoriesJson = await categoriesRes.json();

        if (featuredJson.success) {
          setFeaturedTools(featuredJson.data);
          setStats((prev) => ({
            ...prev,
            tools: featuredJson.meta?.total ?? featuredJson.data.length,
          }));
        }
        if (newestJson.success) {
          setNewestTools(newestJson.data);
        }
        if (categoriesJson.success) {
          const cats = categoriesJson.data;
          setCategories(cats);
          setStats((prev) => ({ ...prev, categories: cats.length }));
        }
      } catch (error) {
        // Silently handle fetch errors — pages show empty state
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const toolCounts: Record<string, number> = {};
  for (const tool of featuredTools) {
    for (const cat of tool.categories) {
      toolCounts[cat.slug] = (toolCounts[cat.slug] ?? 0) + 1;
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection stats={stats} />
        {!loading && (
          <>
            <FeaturedTools tools={featuredTools} />
            <NewestTools tools={newestTools} />
            <CategoryGrid categories={categories} toolCounts={toolCounts} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
