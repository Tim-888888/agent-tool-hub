import { successResponse, errorResponse } from "@/lib/api-utils";
import { runSkillsShDiscovery } from "@/lib/skills-sh-scraper";
import { requireCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/skills-sh — triggered by Vercel Cron (daily 4AM UTC)
 * Phase A: Collects skills from skills.sh and creates PENDING tools.
 * No GLM calls — translation is done in Phase B (/api/skills-sh/enrich).
 */
export async function GET(request: Request): Promise<Response> {
  const cronError = requireCronRequest(request);
  if (cronError) return cronError;

  try {
    const result = await runSkillsShDiscovery();

    console.log(
      JSON.stringify({
        event: "skills_sh_scrape_complete",
        trigger: "cron",
        discovered: result.discovered,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors.length,
      }),
    );

    return successResponse(result);
  } catch (error) {
    console.error("skills.sh scrape fatal error:", error);
    return errorResponse("skills.sh scrape failed", 500);
  }
}

/**
 * POST /api/skills-sh — admin manual trigger
 * Requires authenticated admin session.
 */
export async function POST(request: Request): Promise<Response> {
  const { requireAuth, isAdmin } = await import("@/lib/auth-helpers");
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const result = await runSkillsShDiscovery();

    console.log(
      JSON.stringify({
        event: "skills_sh_scrape_complete",
        trigger: "manual",
        discovered: result.discovered,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors.length,
      }),
    );

    return successResponse(result);
  } catch (error) {
    console.error("skills.sh scrape fatal error:", error);
    return errorResponse("skills.sh scrape failed", 500);
  }
}
