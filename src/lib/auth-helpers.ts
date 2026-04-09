import { auth } from "@/auth"
import { errorResponse } from "@/lib/api-utils"

const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS ?? "").split(",").filter(Boolean)

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    return { session: null, error: errorResponse("Authentication required", 401) }
  }
  return { session, error: null }
}

export function isAdmin(userId: string): boolean {
  return ADMIN_GITHUB_IDS.includes(userId)
}
