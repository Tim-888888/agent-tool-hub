import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Server-side admin check. Call in page server components.
 * Returns session if admin, otherwise redirects to home.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const adminIds = (process.env.ADMIN_GITHUB_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!adminIds.includes(session.user.id)) {
    redirect("/");
  }

  return session;
}
