import { successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { approveDiscoveredTool } from "@/lib/approve-tool";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

/** Minimum score to auto-approve a tool. Below this, stays PENDING for manual review. */
const AUTO_APPROVE_MIN_SCORE = 20;

/** Max tools to process per run (GLM concurrency=2, ~3s/tool → ~150s for 50). */
const BATCH_SIZE = 50;

interface EnrichResult {
  processed: number;
  approved: number;
  skipped: number;
  errors: string[];
}

/**
 * GET /api/skills-sh/enrich — triggered by Vercel Cron (daily 5AM UTC)
 * Phase B: Enriches PENDING skills with translation, classification, and activates them.
 * GLM calls are rate-limited to concurrency 2 via translate.ts module-level limiter.
 */
export async function GET(request: Request): Promise<Response> {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return errorResponse("Unauthorized", 401);
    }
  } else {
    const userAgent = request.headers.get("user-agent") ?? "";
    if (!userAgent.includes("vercel-cron")) {
      return errorResponse("Unauthorized", 401);
    }
  }

  return handleEnrich();
}

/**
 * POST /api/skills-sh/enrich — admin manual trigger
 */
export async function POST(request: Request): Promise<Response> {
  const { requireAuth, isAdmin } = await import("@/lib/auth-helpers");
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  return handleEnrich();
}

async function handleEnrich(): Promise<Response> {
  const errors: string[] = [];
  let processed = 0;
  let approved = 0;
  let skipped = 0;

  try {
    // Fetch PENDING skills, prioritized by score descending
    const pendingTools = await prisma.tool.findMany({
      where: {
        type: "SKILL",
        status: "PENDING",
      },
      orderBy: { score: "desc" },
      take: BATCH_SIZE,
      select: { id: true, score: true },
    });

    if (pendingTools.length === 0) {
      return successResponse({
        processed: 0,
        approved: 0,
        skipped: 0,
        errors: [],
        message: "No PENDING skills to enrich",
      });
    }

    for (const tool of pendingTools) {
      try {
        const result = await approveDiscoveredTool(tool.id);

        if (result.success) {
          approved++;
        } else {
          errors.push(`Tool ${tool.id}: ${result.error}`);
          skipped++;
        }
        processed++;
      } catch (err) {
        errors.push(
          `Tool ${tool.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        skipped++;
        processed++;
      }
    }

    console.log(
      JSON.stringify({
        event: "skills_sh_enrich_complete",
        processed,
        approved,
        skipped,
        errors: errors.length,
      }),
    );

    return successResponse({ processed, approved, skipped, errors });
  } catch (error) {
    console.error("skills.sh enrich fatal error:", error);
    return errorResponse("skills.sh enrich failed", 500);
  }
}
