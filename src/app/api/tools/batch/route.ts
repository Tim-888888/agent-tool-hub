import { prisma } from "@/lib/db";
import { successResponse, errorResponse, TOOL_PRISMA_INCLUDE, mapToolResponse } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slugsParam = searchParams.get("slugs");
    if (!slugsParam) {
      return errorResponse("Missing slugs parameter", 400);
    }

    const slugs = slugsParam.split(",").filter(Boolean).slice(0, 4);
    if (slugs.length === 0) {
      return errorResponse("No valid slugs provided", 400);
    }

    const tools = await prisma.tool.findMany({
      where: {
        slug: { in: slugs },
        status: { in: ["ACTIVE", "FEATURED"] },
      },
      include: TOOL_PRISMA_INCLUDE,
    });

    // Preserve the order from the slugs param
    const ordered = slugs
      .map((slug) => tools.find((t) => t.slug === slug))
      .filter(Boolean)
      .map(mapToolResponse);

    return successResponse(ordered);
  } catch {
    return errorResponse("Failed to fetch tools", 500);
  }
}
