import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";
import { runDiscovery } from "@/lib/discovery";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/discover — triggered by Vercel Cron (weekly)
 * Authenticates via CRON_SECRET env var (set in Vercel dashboard).
 * Falls back to checking vercel-cron user-agent if no secret is configured.
 */
export async function GET(request: Request): Promise<Response> {
  // Verify caller identity
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return errorResponse("Unauthorized", 401);
    }
  } else {
    // No secret configured: only allow Vercel Cron user-agent
    const userAgent = request.headers.get("user-agent") ?? "";
    if (!userAgent.includes("vercel-cron")) {
      return errorResponse("Unauthorized", 401);
    }
  }

  try {
    const results = await runDiscovery();

    const totalDiscovered = results.reduce((sum, r) => sum + r.discovered, 0);
    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const allErrors = results.flatMap((r) => r.errors);

    console.log(
      JSON.stringify({
        event: "discovery_complete",
        trigger: "cron",
        totalDiscovered,
        totalCreated,
        sources: results.map((r) => ({
          source: r.source,
          discovered: r.discovered,
          created: r.created,
          errors: r.errors.length,
        })),
      }),
    );

    return successResponse({
      results,
      totalDiscovered,
      totalCreated,
      errors: allErrors,
    });
  } catch (error) {
    console.error("Discovery fatal error:", error);
    return errorResponse("Discovery failed", 500);
  }
}

/**
 * POST /api/discover — admin manual trigger
 * Requires authenticated admin session.
 */
export async function POST(request: Request): Promise<Response> {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  // Cooldown: skip if discovery ran in the last hour
  const cooldownHeader = request.headers.get("x-discovery-cooldown");
  if (cooldownHeader !== "skip") {
    const { prisma } = await import("@/lib/db");
    const recentDiscovery = await prisma.tool.findFirst({
      where: {
        status: "PENDING",
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { createdAt: true },
    });
    if (recentDiscovery) {
      return errorResponse(
        "Discovery cooldown: please wait before running again",
        429,
      );
    }
  }

  try {
    const results = await runDiscovery();

    const totalDiscovered = results.reduce((sum, r) => sum + r.discovered, 0);
    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const allErrors = results.flatMap((r) => r.errors);

    console.log(
      JSON.stringify({
        event: "discovery_complete",
        trigger: "manual",
        totalDiscovered,
        totalCreated,
        sources: results.map((r) => ({
          source: r.source,
          discovered: r.discovered,
          created: r.created,
          errors: r.errors.length,
        })),
      }),
    );

    return successResponse({
      results,
      totalDiscovered,
      totalCreated,
      errors: allErrors,
    });
  } catch (error) {
    console.error("Discovery fatal error:", error);
    return errorResponse("Discovery failed", 500);
  }
}
