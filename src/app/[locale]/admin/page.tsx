import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export default async function AdminDashboardPage() {
  await requireAdmin();

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
    toolsByType,
    recentTools,
    recentUsers,
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
    prisma.tool.groupBy({
      by: ["type"],
      where: { status: { in: ["ACTIVE", "FEATURED"] } },
      _count: true,
    }),
    prisma.tool.findMany({
      where: { status: { in: ["ACTIVE", "FEATURED"] } },
      select: { id: true, name: true, slug: true, stars: true, type: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.user.findMany({
      select: { id: true, name: true, image: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const stats = {
    tools: { total: totalTools, active: activeTools, featured: featuredTools, pending: pendingTools },
    users: { total: totalUsers },
    reviews: { total: totalReviews },
    submissions: { total: totalSubmissions, pending: pendingSubmissions },
    favorites: { total: totalFavorites },
    toolsByType: toolsByType.map((t) => ({ type: t.type, count: t._count })),
    recentTools: recentTools.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    recentUsers: recentUsers.map((u) => ({
      ...u,
      email: u.email ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  };

  return (
    <>
      
        <DashboardClient stats={stats} />
      
    </>
  );
}
