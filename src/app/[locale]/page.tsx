import { prisma } from "@/lib/db";
import { withRetry } from "@/lib/retry";
import { mapToolResponse, TOOL_PRISMA_INCLUDE } from "@/lib/api-utils";
import { CATEGORIES as MOCK_CATEGORIES, TOOLS as MOCK_TOOLS } from "@/lib/mock-data";
import Header from "@/components/layout/Header";
import HomeLanding from "@/components/home/HomeLanding";
import type { Category, Tool } from "@/types";

const PLATFORM_COUNT = 7;

export const dynamic = "force-dynamic";

interface HomeData {
  featuredTools: Tool[];
  newestTools: Tool[];
  categories: Category[];
  totalCount: number;
}

function getDevelopmentHomeData(): HomeData {
  const activeTools = MOCK_TOOLS;
  const featuredTools = activeTools.filter((tool) => tool.isFeatured).slice(0, 6);
  const newestTools = activeTools
    .toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);
  const categories = MOCK_CATEGORIES.map((category) => ({
    ...category,
    toolCount: activeTools.filter((tool) =>
      tool.categories.some((toolCategory) => toolCategory.slug === category.slug),
    ).length,
  }));

  return {
    featuredTools,
    newestTools,
    categories,
    totalCount: activeTools.length,
  };
}

async function getHomeData(): Promise<HomeData> {
  try {
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

    return {
      featuredTools,
      newestTools,
      categories,
      totalCount,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Using mock homepage data because the database is unavailable.", error);
      return getDevelopmentHomeData();
    }

    throw error;
  }
}

export default async function HomePage() {
  const { featuredTools, newestTools, categories, totalCount } = await getHomeData();

  const stats = {
    tools: totalCount,
    platforms: PLATFORM_COUNT,
    categories: categories.length,
  };

  return (
    <>
      <Header />
      <HomeLanding
        stats={stats}
        featuredTools={featuredTools}
        newestTools={newestTools}
        categories={categories}
      />
    </>
  );
}
