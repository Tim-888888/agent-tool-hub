import { prisma } from "@/lib/db";
import {
  mapToolResponse,
  TOOL_PRISMA_INCLUDE,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";

export async function GET() {
  try {
    const tools = await prisma.tool.findMany({
      where: { status: { in: ["ACTIVE", "FEATURED"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: TOOL_PRISMA_INCLUDE,
    });

    return successResponse(tools.map(mapToolResponse));
  } catch {
    return errorResponse("Failed to fetch newest tools", 500);
  }
}
