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

  const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS ?? "")
    .split(",")
    .filter(Boolean)
  if (!ADMIN_GITHUB_IDS.includes(session.user.id)) {
    redirect("/")
  }

  // Server-side data fetch
  const submissions = await prisma.submission.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  })

  // Serialize dates for client component
  const serialized = submissions.map((sub) => ({
    ...sub,
    createdAt: sub.createdAt.toISOString(),
    reviewedAt: sub.reviewedAt?.toISOString() ?? null,
  }))

  return <AdminSubmissionsClient initialSubmissions={serialized} />
}
