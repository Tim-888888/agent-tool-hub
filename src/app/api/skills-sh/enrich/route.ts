import { successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { approveDiscoveredTool } from "@/lib/approve-tool";
import { translateToolToChinese, generateCollectionContent, translateInstallGuide } from "@/lib/translate";
import { classifyAndConnectCategories, connectAllPlatforms } from "@/lib/tool-enrichment";
import { parseRepoUrl, fetchReadme } from "@/lib/github-client";
import { extractFeatures, extractInstallGuide } from "@/lib/readme-parser";
import { withRetry } from "@/lib/retry";
import { requireCronRequest } from "@/lib/cron-auth";
import { featureValues, replaceToolRelations, type ToolRelationLists } from "@/lib/tool-relations";

export const dynamic = "force-dynamic";

/** Max tools to process per run. ~8-12s/tool with GitHub + GLM calls, must fit in 300s maxDuration. */
const BATCH_SIZE = 15;

/**
 * GET /api/skills-sh/enrich — triggered by Vercel Cron (daily 5AM UTC)
 * Phase B: Enriches tools missing translations (PENDING or ACTIVE without descriptionZh).
 * GLM calls are rate-limited to concurrency 2 via translate.ts module-level limiter.
 */
export async function GET(request: Request): Promise<Response> {
  const cronError = requireCronRequest(request);
  if (cronError) return cronError;

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
  let enriched = 0;
  let skipped = 0;

  try {
    // Priority 1: PENDING skills (full enrichment + activate)
    const pendingTools = await prisma.tool.findMany({
      where: { type: "SKILL", status: "PENDING" },
      orderBy: { score: "desc" },
      take: BATCH_SIZE,
      select: { id: true, score: true, name: true },
    });

    for (const tool of pendingTools) {
      try {
        const result = await approveDiscoveredTool(tool.id);
        if (result.success) { enriched++; } else { errors.push(`${tool.name}: ${result.error}`); skipped++; }
        processed++;
      } catch (err) {
        errors.push(`${tool.name}: ${err instanceof Error ? err.message : String(err)}`);
        skipped++; processed++;
      }
    }

    // Priority 2: ACTIVE skills missing translations (translation-only enrichment)
    const unstranslatedTools = await prisma.tool.findMany({
      where: {
        type: "SKILL",
        status: { in: ["ACTIVE", "FEATURED"] },
        descriptionZh: null,
      },
      orderBy: { score: "desc" },
      take: Math.max(0, BATCH_SIZE - processed),
      select: {
        id: true,
        name: true,
        description: true,
        repoUrl: true,
        features: { orderBy: { sortOrder: "asc" } },
      },
    });

    for (const tool of unstranslatedTools) {
      try {
        await enrichTranslationsOnly({ ...tool, featuresEn: featureValues(tool.features, "en") });
        enriched++;
        processed++;
      } catch (err) {
        errors.push(`${tool.name}: ${err instanceof Error ? err.message : String(err)}`);
        skipped++; processed++;
      }
    }

    // Priority 3: ACTIVE skills missing featuresEn (README enrichment)
    if (processed < BATCH_SIZE) {
      const limit = Math.max(0, BATCH_SIZE - processed);
      const unenrichedTools = await prisma.tool.findMany({
        where: {
          type: "SKILL",
          status: { in: ["ACTIVE", "FEATURED"] },
          features: { none: { locale: "en" } },
        },
        orderBy: { score: "desc" },
        take: limit,
        select: { id: true, name: true, description: true, repoUrl: true },
      });

      for (const tool of unenrichedTools) {
        try {
          await enrichReadmeContent(tool);
          enriched++;
          processed++;
        } catch (err) {
          errors.push(`${tool.name}: ${err instanceof Error ? err.message : String(err)}`);
          skipped++; processed++;
        }
      }
    }

    console.log(JSON.stringify({
      event: "skills_sh_enrich_complete",
      processed, enriched, skipped, errors: errors.length,
    }));

    return successResponse({ processed, enriched, skipped, errors });
  } catch (error) {
    console.error("skills.sh enrich fatal error:", error);
    return errorResponse("skills.sh enrich failed", 500);
  }
}

/** Enrich an ACTIVE tool with translations + categories (no status change). */
async function enrichTranslationsOnly(tool: {
  id: string; name: string; description: string; repoUrl: string; featuresEn: string[];
}): Promise<void> {
  const parsed = parseRepoUrl(tool.repoUrl);
  let readmeContent: string | null = null;

  if (parsed) {
    const [readmeResult] = await Promise.allSettled([
      withRetry(() => fetchReadme(parsed.owner, parsed.repo)),
    ]);
    readmeContent = readmeResult.status === "fulfilled" ? readmeResult.value : null;
  }

  const features = readmeContent ? extractFeatures(readmeContent) : [];
  const installGuide = readmeContent ? extractInstallGuide(readmeContent) : null;

  const updateData: Record<string, unknown> = {};
  const relationUpdates: ToolRelationLists = {};

  // Features
  if (features.length > 0 && (!tool.featuresEn || tool.featuresEn.length === 0)) {
    relationUpdates.featuresEn = features;
  } else if (!tool.featuresEn || tool.featuresEn.length === 0) {
    const collectionContent = await generateCollectionContent(
      tool.name, tool.description, tool.repoUrl, readmeContent,
    );
    relationUpdates.featuresEn = collectionContent.featuresEn;
    relationUpdates.featuresZh = collectionContent.featuresZh;
    if (!installGuide) {
      updateData.installGuide = {
        en: collectionContent.installGuideEn,
        zh: collectionContent.installGuideZh,
      };
    }
  }

  // Translation
  const finalFeatures = relationUpdates.featuresEn ?? tool.featuresEn ?? [];
  if (!relationUpdates.featuresZh?.length) {
    const translation = await translateToolToChinese(tool.description, finalFeatures);
    if (translation.descriptionZh) updateData.descriptionZh = translation.descriptionZh;
    if (translation.featuresZh.length > 0) relationUpdates.featuresZh = translation.featuresZh;
  }

  // Install guide
  if (installGuide) {
    const guideZh = await translateInstallGuide(installGuide);
    updateData.installGuide = { en: installGuide, zh: guideZh ?? installGuide };
  }

  await prisma.tool.update({ where: { id: tool.id }, data: updateData });
  await replaceToolRelations(prisma, tool.id, relationUpdates);

  // Categories
  await classifyAndConnectCategories(tool.id, tool.name, tool.description, readmeContent);

  if (features.length === 0) {
    await connectAllPlatforms(tool.id);
  }
}

/** Enrich an ACTIVE tool with features + install guide from GitHub README. */
async function enrichReadmeContent(tool: {
  id: string; name: string; description: string; repoUrl: string;
}): Promise<void> {
  const parsed = parseRepoUrl(tool.repoUrl);
  if (!parsed) return;

  const [readmeResult] = await Promise.allSettled([
    withRetry(() => fetchReadme(parsed.owner, parsed.repo)),
  ]);
  const readmeContent = readmeResult.status === "fulfilled" ? readmeResult.value : null;
  if (!readmeContent) return;

  const features = extractFeatures(readmeContent);
  const installGuide = extractInstallGuide(readmeContent);

  const updateData: Record<string, unknown> = {};
  const relationUpdates: ToolRelationLists = {};

  if (features.length > 0) {
    relationUpdates.featuresEn = features;
    const translation = await translateToolToChinese("", features);
    if (translation.featuresZh.length > 0) {
      relationUpdates.featuresZh = translation.featuresZh;
    }
  } else {
    const collectionContent = await generateCollectionContent(
      tool.name, tool.description, tool.repoUrl, readmeContent,
    );
    relationUpdates.featuresEn = collectionContent.featuresEn;
    relationUpdates.featuresZh = collectionContent.featuresZh;
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

  await prisma.tool.update({ where: { id: tool.id }, data: updateData });
  await replaceToolRelations(prisma, tool.id, relationUpdates);

  classifyAndConnectCategories(tool.id, tool.name, tool.description, readmeContent).catch(() => {});
}
