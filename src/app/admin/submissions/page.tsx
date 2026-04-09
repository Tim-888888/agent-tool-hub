import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AdminSubmissionsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/")
  }

  const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS ?? "").split(",").filter(Boolean)
  if (!ADMIN_GITHUB_IDS.includes(session.user.id)) {
    redirect("/")
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">Submissions</h1>
      <p className="mt-3 text-[var(--text-secondary)]">Admin submission review will be available here.</p>
    </div>
  )
}
