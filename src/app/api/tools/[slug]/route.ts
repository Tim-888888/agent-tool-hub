import { prisma } from "@/lib/db";
import {
  mapToolResponse,
  TOOL_PRISMA_INCLUDE,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";

export const revalidate = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const tool = await prisma.tool.findUnique({
      where: { slug },
      include: TOOL_PRISMA_INCLUDE,
    });

    if (!tool) {
      return errorResponse("Tool not found", 404);
    }

    return successResponse(mapToolResponse(tool));
  } catch {
    return errorResponse("Failed to fetch tool", 500);
  }
}
