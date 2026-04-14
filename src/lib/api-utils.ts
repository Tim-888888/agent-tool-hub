import type { ToolType } from "@/types";

// --- Pagination ---

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(searchParams: URLSearchParams): PaginationResult {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// --- Filter / Where Clause ---

const TYPE_MAP: Record<string, ToolType> = {
  mcp: "MCP_SERVER",
  skill: "SKILL",
  rule: "RULE",
};

type PrismaWhere = Record<string, unknown>;

export function buildWhereClause(searchParams: URLSearchParams): PrismaWhere {
  const conditions: PrismaWhere[] = [
    { status: { in: ["ACTIVE", "FEATURED"] } },
  ];

  const q = searchParams.get("q");
  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { descriptionZh: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ],
    });
  }

  const type = searchParams.get("type");
  if (type) {
    const mapped = TYPE_MAP[type.toLowerCase()];
    if (mapped) {
      conditions.push({ type: mapped });
    }
  }

  const platform = searchParams.get("platform");
  if (platform) {
    conditions.push({
      platforms: { some: { platform: { slug: platform } } },
    });
  }

  const category = searchParams.get("category");
  if (category) {
    conditions.push({
      categories: { some: { category: { slug: category } } },
    });
  }

  const license = searchParams.get("license");
  if (license) {
    const licenses = license.split(",").filter(Boolean);
    if (licenses.length === 1) {
      conditions.push({ license: licenses[0] });
    } else if (licenses.length > 1) {
      conditions.push({ license: { in: licenses } });
    }
  }

  const language = searchParams.get("language");
  if (language) {
    const languages = language.split(",").filter(Boolean);
    if (languages.length === 1) {
      conditions.push({ language: languages[0] });
    } else if (languages.length > 1) {
      conditions.push({ language: { in: languages } });
    }
  }

  const maintenance = searchParams.get("maintenance");
  if (maintenance) {
    const now = new Date();
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const YEAR = 365 * 24 * 60 * 60 * 1000;
    if (maintenance === "active") {
      conditions.push({
        lastCommitAt: { gte: new Date(now.getTime() - NINETY_DAYS) },
      });
    } else if (maintenance === "inactive") {
      conditions.push({
        lastCommitAt: {
          gte: new Date(now.getTime() - YEAR),
          lt: new Date(now.getTime() - NINETY_DAYS),
        },
      });
    } else if (maintenance === "archived") {
      conditions.push({
        OR: [
          { lastCommitAt: { lt: new Date(now.getTime() - YEAR) } },
          { lastCommitAt: null },
        ],
      });
    }
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { AND: conditions };
}

// --- Sort / Order By ---

type PrismaOrderBy = Record<string, unknown>;

export function buildOrderBy(sortParam: string | null): PrismaOrderBy {
  switch (sortParam) {
    case "recent":
      return { lastCommitAt: "desc" };
    case "rating":
      return { avgRating: "desc" };
    case "name":
      return { name: "asc" };
    case "score":
      return { score: "desc" as const };
    default:
      return { score: "desc" as const };
  }
}

// --- Prisma Include Constant ---

export const TOOL_PRISMA_INCLUDE = {
  categories: { include: { category: true } },
  platforms: { include: { platform: true } },
  tagVotes: {
    select: { tagSlug: true },
  },
} as const;

// --- Response Mapping ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapToolResponse(tool: any): any {
  if (!tool) return null;

  const { categories, platforms, score, syncedAt, npmDownloads, tagVotes, ...rest } = tool;

  // Compute top 3 tags by vote count
  const tagCountMap: Record<string, number> = {};
  if (Array.isArray(tagVotes)) {
    for (const vote of tagVotes) {
      tagCountMap[vote.tagSlug] = (tagCountMap[vote.tagSlug] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagCountMap)
    .map(([tagSlug, count]) => ({ tagSlug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    ...rest,
    categories: Array.isArray(categories)
      ? categories.map((tc: { category: unknown }) => tc.category).filter(Boolean)
      : [],
    platforms: Array.isArray(platforms)
      ? platforms.map((tp: { platform: unknown }) => tp.platform).filter(Boolean)
      : [],
    topTags: topTags.length > 0 ? topTags : undefined,
  };
}

// --- Response Helpers ---

export function successResponse(data: unknown, meta?: Record<string, unknown>): Response {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return Response.json(body, { status: 200 });
}

export function errorResponse(message: string, status: number): Response {
  return Response.json({ success: false, error: message }, { status });
}
