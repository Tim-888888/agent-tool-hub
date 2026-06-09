import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import AdminSubmissionsClient from "@/components/admin/AdminSubmissionsClient";
import { relationValues } from "@/lib/tool-relations";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  await requireAdmin();

  const submissions = await prisma.submission.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { name: true, image: true } },
      suggestedTags: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const discoveredTools = await prisma.tool.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      name: true,
      repoUrl: true,
      description: true,
      stars: true,
      language: true,
      type: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedSubmissions = submissions.map((sub) => ({
    ...sub,
    suggestedTags: relationValues(sub.suggestedTags),
    createdAt: sub.createdAt.toISOString(),
    reviewedAt: sub.reviewedAt?.toISOString() ?? null,
  }));

  const serializedDiscovered = discoveredTools.map((tool) => ({
    ...tool,
    createdAt: tool.createdAt.toISOString(),
  }));

  return (
    <>
      
        <AdminSubmissionsClient
          initialSubmissions={serializedSubmissions}
          initialDiscoveredTools={serializedDiscovered}
        />
      
    </>
  );
}
