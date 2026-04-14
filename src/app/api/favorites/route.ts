import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/favorites — List current user's favorites
 */
export async function GET(request: Request) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const userId = session.user.id;

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      tool: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          descriptionZh: true,
          type: true,
          stars: true,
          avgRating: true,
          tags: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse(favorites.map((f) => f.tool));
}

/**
 * POST /api/favorites — Toggle favorite for a tool
 * Body: { toolId: string }
 * Returns: { action: "added" | "removed" }
 */
export async function POST(request: Request) {
  const limited = checkRateLimit(request, RATE_LIMITS.write);
  if (limited) return limited;

  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const userId = session.user.id;

  let body: { toolId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const { toolId } = body;
  if (!toolId || typeof toolId !== "string") {
    return errorResponse("toolId is required", 400);
  }

  const tool = await prisma.tool.findUnique({ where: { id: toolId } });
  if (!tool) {
    return errorResponse("Tool not found", 404);
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_toolId: { userId, toolId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return successResponse({ action: "removed", toolId });
  }

  await prisma.favorite.create({
    data: { userId, toolId },
  });

  return successResponse({ action: "added", toolId });
}
