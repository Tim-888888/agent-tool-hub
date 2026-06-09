import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { parseRepoUrl, fetchRepoData, fetchReadme } from "@/lib/github-client";
import { fetchWeeklyDownloads } from "@/lib/npm-client";
import { extractFeatures, extractInstallGuide } from "@/lib/readme-parser";
import { withRetry } from "@/lib/retry";
import { computeScore } from "@/lib/scoring";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { translateToolToChinese } from "@/lib/translate";
import { requireCronRequest } from "@/lib/cron-auth";
import { featureValues, replaceToolRelations, type ToolRelationLists } from "@/lib/tool-relations";

export const dynamic = "force-dynamic";

interface SyncResult {
  tool: string;
  status: "success" | "failed";
  error?: string;
}

function safelyRevalidateRootLayout() {
  try {
    revalidatePath("/", "layout");
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      throw error;
    }
  }
}

function legacyStringList(source: unknown, key: "featuresEn" | "featuresZh"): string[] {
  if (!source || typeof source !== "object") {
    return [];
  }

  const value = (source as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function hasLegacyFeatureArrays(source: unknown): boolean {
  return Boolean(source && typeof source === "object" && "featuresEn" in source);
}

export async function GET(request: Request) {
  const startTime = Date.now();

  const cronError = requireCronRequest(request);
  if (cronError) return cronError;

  try {
    // Per D-01: only sync existing tools (ACTIVE or FEATURED)
    const tools = await prisma.tool.findMany({
      where: { status: { in: ["ACTIVE", "FEATURED"] } },
      select: {
        id: true,
        name: true,
        repoUrl: true,
        npmPackage: true,
      },
    });

    // Per D-14: log per-tool results
    const results: SyncResult[] = [];

    for (const tool of tools) {
      try {
        // Parse GitHub owner/repo from repoUrl
        const parsed = parseRepoUrl(tool.repoUrl);
        if (!parsed) {
          results.push({
            tool: tool.name,
            status: "failed",
            error: `Invalid repo URL: ${tool.repoUrl}`,
          });
          continue;
        }

        const { owner, repo } = parsed;

        // Fetch GitHub repo data, README, and npm downloads in parallel
        const [repoResult, readmeResult, downloadsResult] =
          await Promise.allSettled([
            withRetry(() => fetchRepoData(owner, repo)),
            withRetry(() => fetchReadme(owner, repo)),
            tool.npmPackage
              ? withRetry(() => fetchWeeklyDownloads(tool.npmPackage!))
              : Promise.resolve(null as number | null),
          ]);

        // Extract values, defaulting to null on failure
        const repoData =
          repoResult.status === "fulfilled" ? repoResult.value : null;
        const readmeContent =
          readmeResult.status === "fulfilled" ? readmeResult.value : null;
        const npmDownloads =
          downloadsResult.status === "fulfilled"
            ? (downloadsResult.value as number | null)
            : null;

        if (!repoData) {
          // If we can't get repo data at all, count as failed
          const repoError =
            repoResult.status === "rejected"
              ? String(repoResult.reason)
              : "No repo data";
          results.push({
            tool: tool.name,
            status: "failed",
            error: repoError,
          });
          continue;
        }

        // Parse README content
        const features = readmeContent ? extractFeatures(readmeContent) : [];
        const installGuide = readmeContent
          ? extractInstallGuide(readmeContent)
          : null;

        // Compute score per D-05
        const score = computeScore({
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          lastCommitAt: new Date(repoData.pushed_at),
          npmDownloads,
        });

        // Update tool record — only fields that sync actually fetches.
        // Do NOT overwrite hand-crafted structured data (installGuide, featuresZh).
        const existing = await prisma.tool.findUnique({
          where: { id: tool.id },
          select: {
            installGuide: true,
            version: true,
            status: true,
            lastCommitAt: true,
            features: { orderBy: { sortOrder: "asc" } },
          },
        });
        const featureRowsEn = featureValues(existing?.features, "en");
        const featureRowsZh = featureValues(existing?.features, "zh");
        const existingFeaturesEn = featureRowsEn.length > 0
          ? featureRowsEn
          : legacyStringList(existing, "featuresEn");
        const existingFeaturesZh = featureRowsZh.length > 0
          ? featureRowsZh
          : legacyStringList(existing, "featuresZh");
        const relationUpdates: ToolRelationLists = {};

        // Build update payload: only sync-enriched fields
        const updateData: Record<string, unknown> = {
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          openIssues: repoData.open_issues_count,
          lastCommitAt: new Date(repoData.pushed_at),
          language: repoData.language,
          license: repoData.license?.key ?? null,
          npmDownloads: npmDownloads ?? undefined,
          score,
          syncedAt: new Date(),
        };

        // Only update description if GitHub has one
        if (repoData.description) {
          updateData.description = repoData.description;
        }

        // Only update featuresEn if sync extracted new ones AND existing is empty
        if (features.length > 0 && existing && existingFeaturesEn.length === 0) {
          if (hasLegacyFeatureArrays(existing)) {
            updateData.featuresEn = features;
          } else {
            relationUpdates.featuresEn = features;
          }
        }

        // Only set installGuide from README if existing is null/empty
        // (protect hand-crafted structured install guides)
        if (installGuide && existing && !existing.installGuide) {
          updateData.installGuide = { markdown: installGuide };
        }

        await prisma.tool.update({
          where: { id: tool.id },
          data: updateData,
        });
        await replaceToolRelations(prisma, tool.id, relationUpdates);

        // Notify subscribers on new commits (fire-and-forget)
        const oldCommitAt = existing?.lastCommitAt;
        const newCommitAt = new Date(repoData.pushed_at);

        if (oldCommitAt && newCommitAt > oldCommitAt) {
          prisma.toolSubscription.findMany({
            where: { toolId: tool.id },
            select: { userId: true },
          }).then((subs) => {
            if (subs.length === 0) return;
            Promise.all(subs.map((s) => prisma.notification.create({
              data: {
                userId: s.userId,
                toolId: tool.id,
                type: "version_update",
                title: `${tool.name} updated`,
                message: `${tool.name} has new commits since last sync`,
              },
            }))).catch(() => {});
          }).catch(() => {});
        }

        // Translate to Chinese if descriptionZh is missing (fire-and-forget)
        if (existingFeaturesZh.length === 0) {
          const currentDesc = (updateData.description as string) || "";
          const currentFeatures = relationUpdates.featuresEn ?? existingFeaturesEn;
          if (currentDesc || currentFeatures.length > 0) {
            translateToolToChinese(currentDesc, currentFeatures)
              .then(async (translation) => {
                if (translation.descriptionZh || translation.featuresZh.length > 0) {
                  if (translation.descriptionZh) {
                    await prisma.tool.update({
                      where: { id: tool.id },
                      data: { descriptionZh: translation.descriptionZh },
                    });
                  }
                  if (translation.featuresZh.length > 0) {
                    await replaceToolRelations(prisma, tool.id, { featuresZh: translation.featuresZh });
                  }
                }
              })
              .catch(() => {}); // Non-critical
          }
        }

        results.push({ tool: tool.name, status: "success" });
      } catch (error) {
        // Per D-12: individual tool failures don't block others
        results.push({
          tool: tool.name,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const synced = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const durationMs = Date.now() - startTime;

    // Per D-14: structured logging
    console.log(
      JSON.stringify({
        event: "sync_complete",
        synced,
        failed,
        durationMs,
        results,
      }),
    );

    // Trigger on-demand revalidation so ISR pages pick up fresh data immediately
    safelyRevalidateRootLayout();

    return successResponse({ results, synced, failed, durationMs });
  } catch (error) {
    console.error("Sync fatal error:", error);
    return errorResponse("Sync failed", 500);
  }
}

/**
 * POST /api/sync — admin manual trigger
 * Requires authenticated admin session.
 */
export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  // Reuse GET handler logic via internal redirect
  const startTime = Date.now();

  try {
    const tools = await prisma.tool.findMany({
      where: { status: { in: ["ACTIVE", "FEATURED"] } },
      select: { id: true, name: true, repoUrl: true, npmPackage: true },
    });

    const results: SyncResult[] = [];

    for (const tool of tools) {
      try {
        const parsed = parseRepoUrl(tool.repoUrl);
        if (!parsed) {
          results.push({ tool: tool.name, status: "failed", error: `Invalid repo URL: ${tool.repoUrl}` });
          continue;
        }

        const { owner, repo } = parsed;

        const [repoResult, readmeResult, downloadsResult] = await Promise.allSettled([
          withRetry(() => fetchRepoData(owner, repo)),
          withRetry(() => fetchReadme(owner, repo)),
          tool.npmPackage
            ? withRetry(() => fetchWeeklyDownloads(tool.npmPackage!))
            : Promise.resolve(null as number | null),
        ]);

        const repoData = repoResult.status === "fulfilled" ? repoResult.value : null;
        const readmeContent = readmeResult.status === "fulfilled" ? readmeResult.value : null;
        const npmDownloads =
          downloadsResult.status === "fulfilled" ? (downloadsResult.value as number | null) : null;

        if (!repoData) {
          const repoError = repoResult.status === "rejected" ? String(repoResult.reason) : "No repo data";
          results.push({ tool: tool.name, status: "failed", error: repoError });
          continue;
        }

        const features = readmeContent ? extractFeatures(readmeContent) : [];
        const installGuide = readmeContent ? extractInstallGuide(readmeContent) : null;

        const score = computeScore({
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          lastCommitAt: new Date(repoData.pushed_at),
          npmDownloads,
        });

        const existing = await prisma.tool.findUnique({
          where: { id: tool.id },
          select: {
            installGuide: true,
            features: { orderBy: { sortOrder: "asc" } },
          },
        });
        const featureRowsEn = featureValues(existing?.features, "en");
        const featureRowsZh = featureValues(existing?.features, "zh");
        const existingFeaturesEn = featureRowsEn.length > 0
          ? featureRowsEn
          : legacyStringList(existing, "featuresEn");
        const existingFeaturesZh = featureRowsZh.length > 0
          ? featureRowsZh
          : legacyStringList(existing, "featuresZh");
        const relationUpdates: ToolRelationLists = {};

        const updateData: Record<string, unknown> = {
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          openIssues: repoData.open_issues_count,
          lastCommitAt: new Date(repoData.pushed_at),
          language: repoData.language,
          license: repoData.license?.key ?? null,
          npmDownloads: npmDownloads ?? undefined,
          score,
          syncedAt: new Date(),
        };

        if (repoData.description) updateData.description = repoData.description;
        if (features.length > 0 && existing && existingFeaturesEn.length === 0) {
          if (hasLegacyFeatureArrays(existing)) {
            updateData.featuresEn = features;
          } else {
            relationUpdates.featuresEn = features;
          }
        }
        if (installGuide && existing && !existing.installGuide) {
          updateData.installGuide = { markdown: installGuide };
        }

        await prisma.tool.update({ where: { id: tool.id }, data: updateData });
        await replaceToolRelations(prisma, tool.id, relationUpdates);

        // Translate to Chinese if descriptionZh is missing (fire-and-forget)
        if (existingFeaturesZh.length === 0) {
          const currentDesc = (updateData.description as string) || "";
          const currentFeatures = relationUpdates.featuresEn ?? existingFeaturesEn;
          if (currentDesc || currentFeatures.length > 0) {
            translateToolToChinese(currentDesc, currentFeatures)
              .then(async (translation) => {
                if (translation.descriptionZh || translation.featuresZh.length > 0) {
                  if (translation.descriptionZh) {
                    await prisma.tool.update({
                      where: { id: tool.id },
                      data: { descriptionZh: translation.descriptionZh },
                    });
                  }
                  if (translation.featuresZh.length > 0) {
                    await replaceToolRelations(prisma, tool.id, { featuresZh: translation.featuresZh });
                  }
                }
              })
              .catch(() => {});
          }
        }

        results.push({ tool: tool.name, status: "success" });
      } catch (error) {
        results.push({
          tool: tool.name,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const synced = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const durationMs = Date.now() - startTime;

    console.log(JSON.stringify({ event: "sync_complete", trigger: "manual", synced, failed, durationMs }));

    safelyRevalidateRootLayout();

    return successResponse({ results, synced, failed, durationMs });
  } catch (error) {
    console.error("Sync fatal error:", error);
    return errorResponse("Sync failed", 500);
  }
}
