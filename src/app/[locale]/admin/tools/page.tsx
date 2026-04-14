import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import AdminToolsClient from "./AdminToolsClient";

export default async function AdminToolsPage() {
  await requireAdmin();

  const tools = await prisma.tool.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      status: true,
      stars: true,
      isFeatured: true,
      createdAt: true,
      lastCommitAt: true,
      _count: { select: { reviews: true, favorites: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = tools.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    lastCommitAt: t.lastCommitAt?.toISOString() ?? null,
    reviewCount: t._count.reviews,
    favoriteCount: t._count.favorites,
  }));

  return (
    <>
      
        <AdminToolsClient initialTools={serialized} />
      
    </>
  );
}
