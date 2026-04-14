import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  parsePagination,
  mapToolResponse,
  TOOL_PRISMA_INCLUDE,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Full-text search using PostgreSQL tsvector with LIKE fallback.
 * Uses to_tsvector for English + simple (Chinese) text matching.
 */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, RATE_LIMITS.search);
  if (limited) return limited;

  try {
    const sp = request.nextUrl.searchParams;
    const q = sp.get("q")?.trim();
    const { page, limit, skip } = parsePagination(sp);

    if (!q) {
      return errorResponse("Query parameter 'q' is required", 400);
    }

    // Try tsvector full-text search
    let toolIds: string[] = [];
    let total = 0;

    try {
      const escapedQuery = q.replace(/'/g, "''");
      const tsQuery = escapedQuery
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => `${word}:*`)
        .join(" & ");

      const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "Tool"
        WHERE status IN ('ACTIVE', 'FEATURED')
        AND (
          to_tsvector('english', coalesce("name", '') || ' ' || coalesce("description", '')) @@ to_tsquery(${tsQuery})
          OR to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", '') || ' ' || coalesce("descriptionZh", '')) @@ to_tsquery('simple', ${escapedQuery})
          OR "name" ILIKE ${"%" + q + "%"}
          OR "description" ILIKE ${"%" + q + "%"}
        )
      `;
      total = Number(countResult[0]?.count ?? 0);

      const rows = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT t.id,
          ts_rank(
            to_tsvector('english', coalesce(t."name", '') || ' ' || coalesce(t."description", '')),
            to_tsquery(${tsQuery})
          ) as rank
        FROM "Tool" t
        WHERE t.status IN ('ACTIVE', 'FEATURED')
        AND (
          to_tsvector('english', coalesce(t."name", '') || ' ' || coalesce(t."description", '')) @@ to_tsquery(${tsQuery})
          OR to_tsvector('simple', coalesce(t."name", '') || ' ' || coalesce(t."description", '') || ' ' || coalesce(t."descriptionZh", '')) @@ to_tsquery('simple', ${escapedQuery})
          OR t."name" ILIKE ${"%" + q + "%"}
          OR t."description" ILIKE ${"%" + q + "%"}
        )
        ORDER BY rank DESC, t.stars DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `;
      toolIds = rows.map((r) => r.id);
    } catch {
      // Fallback to Prisma ORM LIKE search
      const where: Record<string, unknown> = {
        status: { in: ["ACTIVE", "FEATURED"] },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { descriptionZh: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      };

      const [fallbackTools, fallbackTotal] = await Promise.all([
        prisma.tool.findMany({
          where,
          orderBy: { stars: "desc" },
          skip,
          take: limit,
          include: TOOL_PRISMA_INCLUDE,
        }),
        prisma.tool.count({ where }),
      ]);

      return successResponse(fallbackTools.map(mapToolResponse), {
        total: fallbackTotal,
        page,
        limit,
        totalPages: Math.ceil(fallbackTotal / limit),
      });
    }

    // Fetch full tool data with relations, preserving tsvector rank order
    const fullTools = await prisma.tool.findMany({
      where: { id: { in: toolIds } },
      include: TOOL_PRISMA_INCLUDE,
    });

    const idOrder = new Map(toolIds.map((id, i) => [id, i]));
    fullTools.sort((a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999));

    return successResponse(fullTools.map(mapToolResponse), {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Search failed:", error);
    return errorResponse("Search failed", 500);
  }
}
