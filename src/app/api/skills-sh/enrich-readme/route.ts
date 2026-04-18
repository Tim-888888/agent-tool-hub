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

/** Max time per tool before skipping (ms). Prevents single tool from blocking batch. */
const TOOL_TIMEOUT_MS = 15_000;

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

  // DEBUG: First just test the raw SQL query
  try {
    const debugCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Tool"
      WHERE type = 'SKILL' AND status IN ('ACTIVE', 'FEATURED')
        AND ("featuresEn" IS NULL OR array_length("featuresEn", 1) IS NULL)
    `;
    const total = Number(debugCount[0]?.count ?? 0);

    if (total === 0) {
      return successResponse({ enriched: 0, skipped: 0, errors: [], remaining: 0, debug: 'no tools to enrich' });
    }

    // Only process 1 tool as test
    const rawTools = await prisma.$queryRaw<Array<{ id: string; name: string; description: string; repoUrl: string }>>`
      SELECT id, name, description, "repoUrl" FROM "Tool"
      WHERE type = 'SKILL' AND status IN ('ACTIVE', 'FEATURED')
        AND ("featuresEn" IS NULL OR array_length("featuresEn", 1) IS NULL)
      ORDER BY score DESC LIMIT 1
    `;

    if (rawTools.length === 0) {
      return successResponse({ enriched: 0, skipped: 0, errors: [], remaining: total, debug: 'query returned 0 but count says otherwise' });
    }

    const tool = rawTools[0];
    try {
      await withTimeout(enrichReadmeContent(tool), TOOL_TIMEOUT_MS);
      enriched++;
    } catch (err) {
      errors.push(`${tool.name}: ${err instanceof Error ? err.message : String(err)}`);
      skipped++;
    }

    return successResponse({ enriched, skipped, errors, remaining: total - enriched, debug: `total=${total}, processed=1` });
  } catch (dbErr) {
    return errorResponse(`DB error: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`, 500);
  }
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

/** Wrap a promise with a timeout. Rejects with TimeoutError if exceeded. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}
