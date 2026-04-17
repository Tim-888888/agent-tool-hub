import { successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/skills-sh/activate
 * Admin-only: Bulk-activate all PENDING SKILL tools without GLM translation.
 * Tools become visible on the public page immediately.
 * The daily enrich cron will add translations/categories later.
 */
export async function POST(request: Request): Promise<Response> {
  const { requireAuth, isAdmin } = await import("@/lib/auth-helpers");
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  const result = await prisma.tool.updateMany({
    where: {
      type: "SKILL",
      status: "PENDING",
    },
    data: {
      status: "ACTIVE",
    },
  });

  console.log(
    JSON.stringify({
      event: "skills_sh_bulk_activate",
      activated: result.count,
    }),
  );

  return successResponse({
    activated: result.count,
    message: `Activated ${result.count} PENDING skill tools`,
  });
}
