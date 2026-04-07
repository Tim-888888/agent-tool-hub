import { prisma } from "@/lib/db";
import {
  mapToolResponse,
  TOOL_PRISMA_INCLUDE,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        tools: {
          include: {
            tool: {
              include: TOOL_PRISMA_INCLUDE,
            },
          },
        },
      },
    });

    if (!category) {
      return errorResponse("Category not found", 404);
    }

    const { tools, ...rest } = category;

    return successResponse({
      ...rest,
      tools: tools
        .map((tc) => mapToolResponse(tc.tool))
        .filter(Boolean),
    });
  } catch {
    return errorResponse("Failed to fetch category", 500);
  }
}
