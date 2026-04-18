import { successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { parseRepoUrl, fetchReadme } from "@/lib/github-client";
import { extractFeatures, extractInstallGuide } from "@/lib/readme-parser";
import {
  generateCollectionContent,
  translateToolToChinese,
  translateInstallGuide,
} from "@/lib/translate";
import { classifyAndConnectCategories } from "@/lib/tool-enrichment";
import { withRetry } from "@/lib/retry";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

/** Max tools per run. ~12s/tool × 15 = ~180s, safe within 300s maxDuration. */
const BATCH_SIZE = 15;

/**
 * GET /api/skills-sh/enrich-readme — Vercel Cron trigger
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
  return handleEnrichReadme();
}

/**
 * POST /api/skills-sh/enrich-readme — admin manual trigger
 */
export async function POST(request: Request): Promise<Response> {
  const { requireAuth, isAdmin } = await import("@/lib/auth-helpers");
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  return handleEnrichReadme();
}

async function handleEnrichReadme(): Promise<Response> {
  const errors: string[] = [];
  let enriched = 0;
  let skipped = 0;

  // Use raw SQL — Prisma camelCase column names must be quoted
  const rawTools = await prisma.$queryRaw<Array<{ id: string; name: string; description: string; repoUrl: string }>>`
    SELECT id, name, description, "repoUrl" FROM "Tool"
    WHERE type = 'SKILL' AND status IN ('ACTIVE', 'FEATURED')
      AND ("featuresEn" IS NULL OR array_length("featuresEn", 1) IS NULL)
    ORDER BY score DESC LIMIT ${BATCH_SIZE}
  `;
  const tools = rawTools.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    repoUrl: t.repoUrl,
  }));

  if (tools.length === 0) {
    return successResponse({ enriched: 0, skipped: 0, errors: [], remaining: 0 });
  }

  for (const tool of tools) {
    try {
      await enrichReadmeContent(tool);
      enriched++;
    } catch (err) {
      errors.push(`${tool.name}: ${err instanceof Error ? err.message : String(err)}`);
      skipped++;
    }
  }

  // Count remaining using raw SQL for consistency
  const remainingResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "Tool"
    WHERE type = 'SKILL' AND status IN ('ACTIVE', 'FEATURED')
      AND ("featuresEn" IS NULL OR array_length("featuresEn", 1) IS NULL)
  `;
  const remaining = Number(remainingResult[0]?.count ?? 0);

  console.log(JSON.stringify({
    event: "skills_sh_enrich_readme",
    enriched,
    skipped,
    errors: errors.length,
    remaining,
  }));

  return successResponse({ enriched, skipped, errors, remaining });
}

/**
 * Enrich a tool with features + install guide from GitHub README.
 * Reuses existing infrastructure: fetchReadme, extractFeatures,
 * extractInstallGuide, generateCollectionContent, translateInstallGuide.
 */
async function enrichReadmeContent(tool: {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
}): Promise<void> {
  const parsed = parseRepoUrl(tool.repoUrl);
  if (!parsed) return; // Not a GitHub URL

  const [readmeResult] = await Promise.allSettled([
    withRetry(() => fetchReadme(parsed.owner, parsed.repo)),
  ]);
  const readmeContent = readmeResult.status === "fulfilled" ? readmeResult.value : null;
  if (!readmeContent) return; // No README found

  const features = extractFeatures(readmeContent);
  const installGuide = extractInstallGuide(readmeContent);

  const updateData: Record<string, unknown> = {};

  if (features.length > 0) {
    // Structured features found in README
    updateData.featuresEn = features;
    const translation = await translateToolToChinese("", features);
    if (translation.featuresZh.length > 0) {
      updateData.featuresZh = translation.featuresZh;
    }
  } else {
    // No structured features — use GLM to generate bilingual content
    const collectionContent = await generateCollectionContent(
      tool.name,
      tool.description,
      tool.repoUrl,
      readmeContent,
    );
    updateData.featuresEn = collectionContent.featuresEn;
    updateData.featuresZh = collectionContent.featuresZh;
    if (!installGuide) {
      updateData.installGuide = {
        en: collectionContent.installGuideEn,
        zh: collectionContent.installGuideZh,
      };
    }
  }

  if (installGuide) {
    const guideZh = await translateInstallGuide(installGuide);
    updateData.installGuide = { en: installGuide, zh: guideZh ?? installGuide };
  }

  await prisma.tool.update({
    where: { id: tool.id },
    data: updateData,
  });

  // Categories — best-effort, don't block batch
  classifyAndConnectCategories(tool.id, tool.name, tool.description, readmeContent).catch(
    () => {},
  );
}
