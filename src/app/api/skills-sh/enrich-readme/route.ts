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
import { requireCronRequest } from "@/lib/cron-auth";
import { replaceToolRelations, type ToolRelationLists } from "@/lib/tool-relations";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 5;
const TOOL_TIMEOUT_MS = 30_000;

/**
 * GET /api/skills-sh/enrich-readme - Cloudflare Workflows/Cron trigger.
 */
export async function GET(request: Request): Promise<Response> {
  const cronError = requireCronRequest(request);
  if (cronError) return cronError;
  return handleEnrichReadme();
}

/**
 * POST /api/skills-sh/enrich-readme - admin manual trigger.
 */
export async function POST(): Promise<Response> {
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

  try {
    const tools = await prisma.tool.findMany({
      where: {
        type: "SKILL",
        status: { in: ["ACTIVE", "FEATURED"] },
        features: { none: { locale: "en" } },
      },
      orderBy: { score: "desc" },
      take: BATCH_SIZE,
      select: { id: true, name: true, description: true, repoUrl: true },
    });

    if (tools.length === 0) {
      return successResponse({ enriched: 0, skipped: 0, errors: [], remaining: 0 });
    }

    for (const tool of tools) {
      try {
        const didEnrich = await withTimeout(enrichReadmeContent(tool), TOOL_TIMEOUT_MS);
        if (didEnrich) enriched++;
        else skipped++;
      } catch (err) {
        errors.push(`${tool.name}: ${err instanceof Error ? err.message : String(err)}`);
        skipped++;
      }
    }

    const remaining = await prisma.tool.count({
      where: {
        type: "SKILL",
        status: { in: ["ACTIVE", "FEATURED"] },
        features: { none: { locale: "en" } },
      },
    });

    console.log(JSON.stringify({
      event: "skills_sh_enrich_readme",
      enriched,
      skipped,
      errors: errors.length,
      remaining,
    }));

    return successResponse({ enriched, skipped, errors, remaining });
  } catch (dbErr) {
    return errorResponse(`DB error: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`, 500);
  }
}

async function enrichReadmeContent(tool: {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
}): Promise<boolean> {
  const parsed = parseRepoUrl(tool.repoUrl);
  if (!parsed) {
    await replaceToolRelations(prisma, tool.id, { featuresEn: ["No GitHub repository"] });
    return false;
  }

  const [readmeResult] = await Promise.allSettled([
    withRetry(() => fetchReadme(parsed.owner, parsed.repo)),
  ]);
  const readmeContent = readmeResult.status === "fulfilled" ? readmeResult.value : null;
  if (!readmeContent) {
    await replaceToolRelations(prisma, tool.id, { featuresEn: ["No README available"] });
    return false;
  }

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
      tool.name,
      tool.description,
      tool.repoUrl,
      readmeContent,
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

  await prisma.tool.update({
    where: { id: tool.id },
    data: updateData,
  });
  await replaceToolRelations(prisma, tool.id, relationUpdates);

  classifyAndConnectCategories(tool.id, tool.name, tool.description, readmeContent).catch(() => {});
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
