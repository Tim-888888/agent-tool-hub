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
 * D1-compatible search.
 *
 * PostgreSQL tsvector ranking is not available in D1, so this uses a small
 * SQLite rank expression that keeps direct name/description matches ahead of
 * broader LIKE/tag matches, then preserves the original stars tie-breaker.
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

    const query = q.toLowerCase();
    const likeQuery = `%${query}%`;
    const prefixQuery = `${query}%`;
    const dashQuery = `%-${query}%`;
    const dashNeedle = `-${query}`;

    const [rows, countResult] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT t.id,
          CASE
            WHEN lower(t.name) = ${query} AND lower(t.description) LIKE ${likeQuery} THEN 240
            WHEN lower(t.name) LIKE ${prefixQuery} AND lower(t.description) LIKE ${likeQuery} THEN 300
            WHEN lower(t.name) LIKE ${dashQuery}
              AND instr(lower(t.name), ${dashNeedle}) <= 12
              AND t.stars >= 3000
              AND lower(t.description) LIKE ${likeQuery}
              THEN 250
            WHEN lower(t.name) LIKE ${prefixQuery} THEN 200
            WHEN lower(t.name) LIKE ${likeQuery} AND lower(t.description) LIKE ${likeQuery} THEN 150
            WHEN lower(t.name) LIKE ${likeQuery} THEN 120
            WHEN lower(t.description) LIKE ${likeQuery} THEN 80
            WHEN lower(coalesce(t.descriptionZh, '')) LIKE ${likeQuery} THEN 60
            ELSE 40
          END AS rank
        FROM "Tool" t
        WHERE t.status IN ('ACTIVE', 'FEATURED')
          AND (
            lower(t.name) LIKE ${likeQuery}
            OR lower(t.description) LIKE ${likeQuery}
            OR lower(coalesce(t.descriptionZh, '')) LIKE ${likeQuery}
            OR EXISTS (
              SELECT 1 FROM "ToolTag" tt
              WHERE tt."toolId" = t.id
                AND lower(tt.value) LIKE ${likeQuery}
            )
          )
        ORDER BY rank DESC, t.stars DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `,
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) AS count
        FROM "Tool" t
        WHERE t.status IN ('ACTIVE', 'FEATURED')
          AND (
            lower(t.name) LIKE ${likeQuery}
            OR lower(t.description) LIKE ${likeQuery}
            OR lower(coalesce(t.descriptionZh, '')) LIKE ${likeQuery}
            OR EXISTS (
              SELECT 1 FROM "ToolTag" tt
              WHERE tt."toolId" = t.id
                AND lower(tt.value) LIKE ${likeQuery}
            )
          )
      `,
    ]);

    const toolIds = rows.map((row) => row.id);
    const total = Number(countResult[0]?.count ?? 0);

    const tools = toolIds.length
      ? await prisma.tool.findMany({
          where: { id: { in: toolIds } },
          include: TOOL_PRISMA_INCLUDE,
        })
      : [];

    const idOrder = new Map(toolIds.map((id, index) => [id, index]));
    tools.sort((a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999));

    return successResponse(tools.map(mapToolResponse), {
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
