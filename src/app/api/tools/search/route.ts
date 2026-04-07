import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  parsePagination,
  buildWhereClause,
  buildOrderBy,
  mapToolResponse,
  TOOL_PRISMA_INCLUDE,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(sp);
    const where = buildWhereClause(sp);
    const orderBy = buildOrderBy(sp.get("sort"));

    const [tools, total] = await Promise.all([
      prisma.tool.findMany({
        where,
        orderBy,
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
  } catch {
    return errorResponse("Failed to search tools", 500);
  }
}
