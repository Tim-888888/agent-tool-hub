import { type NextRequest } from "next/server";
import { ToolStatus, type Prisma } from "@/generated/prisma/client";
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
 * This intentionally avoids PostgreSQL-specific full-text operators. For the first D1 cut we
 * query normalized tag rows plus LIKE-style text matches; FTS5 can be layered on
 * later without changing this API shape.
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

    const where: Prisma.ToolWhereInput = {
      status: { in: [ToolStatus.ACTIVE, ToolStatus.FEATURED] },
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
        { descriptionZh: { contains: q } },
        { tags: { some: { value: { contains: q } } } },
      ],
    };

    const [tools, total] = await Promise.all([
      prisma.tool.findMany({
        where,
        orderBy: [{ score: "desc" }, { stars: "desc" }],
        skip,
        take: limit,
        include: TOOL_PRISMA_INCLUDE,
      }),
      prisma.tool.count({ where }),
    ]);

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
