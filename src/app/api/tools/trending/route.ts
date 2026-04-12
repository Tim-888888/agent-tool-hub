import { prisma } from "@/lib/db";
import {
  mapToolResponse,
  TOOL_PRISMA_INCLUDE,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";
import { withRetry } from "@/lib/retry";

export const revalidate = 60;

export async function GET() {
  try {
    const tools = await withRetry(() => prisma.tool.findMany({
      where: { status: { in: ["ACTIVE", "FEATURED"] } },
      orderBy: { lastCommitAt: "desc" },
      take: 6,
      include: TOOL_PRISMA_INCLUDE,
    }));

    return successResponse(tools.map(mapToolResponse));
  } catch {
    return errorResponse("Failed to fetch trending tools", 500);
  }
}
