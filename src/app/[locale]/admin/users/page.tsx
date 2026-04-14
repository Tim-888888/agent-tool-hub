import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      _count: {
        select: { reviews: true, submissions: true, favorites: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = users.map((u) => ({
    ...u,
    email: u.email ?? null,
    createdAt: u.createdAt.toISOString(),
    reviewCount: u._count.reviews,
    submissionCount: u._count.submissions,
    favoriteCount: u._count.favorites,
  }));

  return (
    <>
      
        <AdminUsersClient initialUsers={serialized} />
      
    </>
  );
}
