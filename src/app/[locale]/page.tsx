import { prisma } from "@/lib/db";
import { withRetry } from "@/lib/retry";
import { mapToolResponse, TOOL_PRISMA_INCLUDE } from "@/lib/api-utils";
import Header from "@/components/layout/Header";
import HeroSection from "@/components/home/HeroSection";
import FeaturedTools from "@/components/home/FeaturedTools";
import NewestTools from "@/components/home/NewestTools";
import CategoryGrid from "@/components/home/CategoryGrid";
import Footer from "@/components/layout/Footer";
import type { Tool, Category } from "@/types";

const PLATFORM_COUNT = 7;

export const revalidate = 3600;

export default async function HomePage() {
  // Fetch all data in parallel with retry — ISR caches the result
  const [featuredRaw, newestRaw, categoriesRaw, totalCount] = await withRetry(() =>
    Promise.all([
      prisma.tool.findMany({
        where: { status: { in: ["ACTIVE", "FEATURED"] } },
        orderBy: { score: "desc" },
        take: 6,
        include: TOOL_PRISMA_INCLUDE,
      }),
      prisma.tool.findMany({
        where: { status: { in: ["ACTIVE", "FEATURED"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: TOOL_PRISMA_INCLUDE,
      }),
      prisma.category.findMany({
        orderBy: { order: "asc" },
        include: { _count: { select: { tools: true } } },
      }),
      prisma.tool.count({ where: { status: { in: ["ACTIVE", "FEATURED"] } } }),
    ]),
  );

  const featuredTools: Tool[] = featuredRaw.map(mapToolResponse);
  const newestTools: Tool[] = newestRaw.map(mapToolResponse);
  const categories: Category[] = categoriesRaw.map(({ _count, ...rest }) => ({
    ...rest,
    descriptionEn: rest.descriptionEn ?? undefined,
    descriptionZh: rest.descriptionZh ?? undefined,
    toolCount: _count.tools,
  }));

  const stats = {
    tools: totalCount,
    platforms: PLATFORM_COUNT,
    categories: categories.length,
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection stats={stats} />
        <FeaturedTools tools={featuredTools} />
        <NewestTools tools={newestTools} />
        <CategoryGrid categories={categories} />
      </main>
      <Footer />
    </>
  );
}
