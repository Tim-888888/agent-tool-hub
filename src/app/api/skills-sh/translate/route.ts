import { successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { translateToolToChinese } from "@/lib/translate";

export const dynamic = "force-dynamic";

/** Max tools per run. 1 GLM call/tool × ~3s × concurrency 2 = ~45s for 30 tools. */
const BATCH_SIZE = 30;

/**
 * POST /api/skills-sh/translate
 * Admin-only: Fast batch translation of ACTIVE tools missing descriptionZh.
 * Skips GitHub enrichment and category classification — translation only.
 */
export async function POST(request: Request): Promise<Response> {
  const { requireAuth, isAdmin } = await import("@/lib/auth-helpers");
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  return handleTranslate();
}

async function handleTranslate(): Promise<Response> {
  const errors: string[] = [];
  let translated = 0;
  let skipped = 0;

  const tools = await prisma.tool.findMany({
    where: {
      type: "SKILL",
      status: { in: ["ACTIVE", "FEATURED"] },
      descriptionZh: null,
    },
    orderBy: { score: "desc" },
    take: BATCH_SIZE,
    select: { id: true, name: true, description: true },
  });

  if (tools.length === 0) {
    return successResponse({ translated: 0, skipped: 0, errors: [], remaining: 0 });
  }

  for (const tool of tools) {
    try {
      const translation = await translateToolToChinese(tool.description || tool.name, []);

      await prisma.tool.update({
        where: { id: tool.id },
        data: {
          descriptionZh: translation.descriptionZh || null,
          featuresZh: translation.featuresZh.length > 0 ? translation.featuresZh : undefined,
        },
      });
      translated++;
    } catch (err) {
      errors.push(`${tool.name}: ${err instanceof Error ? err.message : String(err)}`);
      skipped++;
    }
  }

  // Count remaining
  const remaining = await prisma.tool.count({
    where: {
      type: "SKILL",
      status: { in: ["ACTIVE", "FEATURED"] },
      descriptionZh: null,
    },
  });

  return successResponse({ translated, skipped, errors, remaining });
}
