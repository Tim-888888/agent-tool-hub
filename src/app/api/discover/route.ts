import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";
import { runDiscovery } from "@/lib/discovery";
import { requireCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/discover - triggered by Cloudflare Workflows/Cron.
 */
export async function GET(request: Request): Promise<Response> {
  const cronError = requireCronRequest(request);
  if (cronError) return cronError;

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
 * POST /api/discover - admin manual trigger.
 */
export async function POST(request: Request): Promise<Response> {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

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
