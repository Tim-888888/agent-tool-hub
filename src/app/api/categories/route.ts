import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { withRetry } from "@/lib/retry";

export const revalidate = 3600;

export async function GET() {
  try {
    const categories = await withRetry(() => prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { tools: true } },
      },
    }));

    const mapped = categories.map(({ _count, ...rest }) => ({
      ...rest,
      toolCount: _count.tools,
    }));

    return successResponse(mapped);
  } catch {
    return errorResponse("Failed to fetch categories", 500);
  }
}
