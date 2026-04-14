import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * Search suggestions for autocomplete.
 * Returns top 5 matching tool names.
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return successResponse([]);
    }

    const tools = await prisma.tool.findMany({
      where: {
        status: { in: ["ACTIVE", "FEATURED"] },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        name: true,
        slug: true,
        type: true,
      },
      orderBy: { stars: "desc" },
      take: 5,
    });

    return successResponse(tools);
  } catch (error) {
    console.error("Suggestions failed:", error);
    return errorResponse("Suggestions failed", 500);
  }
}
