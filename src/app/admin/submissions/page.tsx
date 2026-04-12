import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import AdminSubmissionsClient from "./AdminSubmissionsClient"

export default async function AdminSubmissionsPage() {
  // Server-side auth check
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/")
  }

  const adminIds = (process.env.ADMIN_GITHUB_IDS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
  if (!adminIds.includes(session.user.id)) {
    redirect("/")
  }

  // Fetch user submissions (PENDING)
  const submissions = await prisma.submission.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  })

  // Fetch auto-discovered tools (PENDING status)
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
  })

  // Serialize dates for client component
  const serializedSubmissions = submissions.map((sub) => ({
    ...sub,
    createdAt: sub.createdAt.toISOString(),
    reviewedAt: sub.reviewedAt?.toISOString() ?? null,
  }))

  const serializedDiscovered = discoveredTools.map((tool) => ({
    ...tool,
    createdAt: tool.createdAt.toISOString(),
  }))

  return (
    <AdminSubmissionsClient
      initialSubmissions={serializedSubmissions}
      initialDiscoveredTools={serializedDiscovered}
    />
  )
}
