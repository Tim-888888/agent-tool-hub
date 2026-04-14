import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (!isAdmin(session.user.id)) {
    return errorResponse("Forbidden", 403);
  }

  const [
    totalTools,
    activeTools,
    featuredTools,
    pendingTools,
    totalUsers,
    totalReviews,
    totalSubmissions,
    pendingSubmissions,
    totalFavorites,
    recentTools,
  ] = await Promise.all([
    prisma.tool.count(),
    prisma.tool.count({ where: { status: { in: ["ACTIVE", "FEATURED"] } } }),
    prisma.tool.count({ where: { status: "FEATURED" } }),
    prisma.tool.count({ where: { status: "PENDING" } }),
    prisma.user.count(),
    prisma.review.count(),
    prisma.submission.count(),
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.favorite.count(),
    prisma.tool.findMany({
      where: { status: { in: ["ACTIVE", "FEATURED"] } },
      select: { id: true, name: true, stars: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const recentUsers = await prisma.user.findMany({
    select: { id: true, name: true, image: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Tools by type
  const toolsByType = await prisma.tool.groupBy({
    by: ["type"],
    where: { status: { in: ["ACTIVE", "FEATURED"] } },
    _count: true,
  });

  return successResponse({
    tools: { total: totalTools, active: activeTools, featured: featuredTools, pending: pendingTools },
    users: { total: totalUsers },
    reviews: { total: totalReviews },
    submissions: { total: totalSubmissions, pending: pendingSubmissions },
    favorites: { total: totalFavorites },
    toolsByType: toolsByType.map((t) => ({ type: t.type, count: t._count })),
    recentTools: recentTools.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    recentUsers: recentUsers.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
  });
}
