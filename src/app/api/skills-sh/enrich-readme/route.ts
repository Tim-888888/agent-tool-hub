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

/** Max tools per run. 5 tools × 30s = ~150s, safe within 300s maxDuration. */
const BATCH_SIZE = 5;

/** Max time per tool before skipping (ms). fetchReadme(10s) + GLM(15s) + buffer. */
const TOOL_TIMEOUT_MS = 30_000;

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

  try {
    const rawTools = await prisma.$queryRaw<Array<{ id: string; name: string; description: string; repoUrl: string }>>`
      SELECT id, name, description, "repoUrl" FROM "Tool"
      WHERE type = 'SKILL' AND status IN ('ACTIVE', 'FEATURED')
        AND ("featuresEn" IS NULL OR array_length("featuresEn", 1) IS NULL)
      ORDER BY score DESC LIMIT ${BATCH_SIZE}
    `;

    if (rawTools.length === 0) {
      return successResponse({ enriched: 0, skipped: 0, errors: [], remaining: 0 });
    }

    for (const tool of rawTools) {
      try {
        const didEnrich = await withTimeout(enrichReadmeContent(tool), TOOL_TIMEOUT_MS);
        if (didEnrich) { enriched++; } else { skipped++; }
      } catch (err) {
        errors.push(`${tool.name}: ${err instanceof Error ? err.message : String(err)}`);
        skipped++;
      }
    }

    const remainingResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Tool"
      WHERE type = 'SKILL' AND status IN ('ACTIVE', 'FEATURED')
        AND ("featuresEn" IS NULL OR array_length("featuresEn", 1) IS NULL)
    `;
    const remaining = Number(remainingResult[0]?.count ?? 0);

    console.log(JSON.stringify({
      event: "skills_sh_enrich_readme",
      enriched, skipped, errors: errors.length, remaining,
    }));

    return successResponse({ enriched, skipped, errors, remaining });
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
}): Promise<boolean> {
  const parsed = parseRepoUrl(tool.repoUrl);
  if (!parsed) {
    // Not a GitHub URL — mark as processed so it won't be retried
    await prisma.tool.update({
      where: { id: tool.id },
      data: { featuresEn: ["No GitHub repository"] },
    });
    return false;
  }

  const [readmeResult] = await Promise.allSettled([
    withRetry(() => fetchReadme(parsed.owner, parsed.repo)),
  ]);
  const readmeContent = readmeResult.status === "fulfilled" ? readmeResult.value : null;
  if (!readmeContent) {
    // No README found — mark as processed so it won't be retried
    await prisma.tool.update({
      where: { id: tool.id },
      data: { featuresEn: ["No README available"] },
    });
    return false;
  }

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
  return true;
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
