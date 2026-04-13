import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import AdminSubmissionsClient from "@/app/admin/submissions/AdminSubmissionsClient"

export default async function AdminSubmissionsPage() {
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

  const submissions = await prisma.submission.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  })

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
    <>
      <Header />
      <main className="flex-1">
        <AdminSubmissionsClient
          initialSubmissions={serializedSubmissions}
          initialDiscoveredTools={serializedDiscovered}
        />
      </main>
      <Footer />
    </>
  )
}
