import { prisma } from "@/lib/db";
import { successResponse, errorResponse, parsePagination } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-helpers";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().max(500).optional(),
  platform: z.string().max(50).optional(),
  useCase: z.string().max(100).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const tool = await prisma.tool.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tool) {
      return errorResponse("Tool not found", 404);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { toolId: tool.id },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { toolId: tool.id } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse(reviews, {
      total,
      page,
      limit,
      totalPages,
    });
  } catch {
    return errorResponse("Failed to fetch reviews", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limited = checkRateLimit(request, RATE_LIMITS.write);
  if (limited) return limited;

  try {
    const { session, error: authError } = await requireAuth();
    if (authError) return authError;

    const { slug } = await params;

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(
        firstError?.message ?? "Invalid input",
        400,
      );
    }

    const { rating, content, platform, useCase } = parsed.data;

    const tool = await prisma.tool.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tool) {
      return errorResponse("Tool not found", 404);
    }

    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("User ID not found in session", 401);
    }

    const review = await prisma.review.upsert({
      where: {
        userId_toolId: {
          userId,
          toolId: tool.id,
        },
      },
      create: {
        userId,
        toolId: tool.id,
        rating,
        content: content ?? null,
        platform: platform ?? null,
        useCase: useCase ?? null,
      },
      update: {
        rating,
        content: content ?? null,
        platform: platform ?? null,
        useCase: useCase ?? null,
      },
    });

    // Recalculate aggregate ratings
    const stats = await prisma.review.aggregate({
      where: { toolId: tool.id },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.tool.update({
      where: { id: tool.id },
      data: {
        avgRating: Math.round((stats._avg.rating ?? 0) * 10) / 10,
        ratingCount: stats._count,
      },
    });

    return successResponse(review);
  } catch {
    return errorResponse("Failed to submit review", 500);
  }
}
