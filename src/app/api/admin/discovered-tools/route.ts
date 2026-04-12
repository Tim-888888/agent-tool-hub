import { z } from "zod";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";
import {
  parseRepoUrl,
  fetchRepoData,
  fetchReadme,
} from "@/lib/github-client";
import { fetchWeeklyDownloads } from "@/lib/npm-client";
import { extractFeatures, extractInstallGuide } from "@/lib/readme-parser";
import { computeScore } from "@/lib/scoring";
import { withRetry } from "@/lib/retry";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  toolId: z.string(),
  action: z.enum(["approve", "reject"]),
});

/**
 * PATCH /api/admin/discovered-tools
 * Admin-only: approve or reject an auto-discovered tool.
 * Approve: enrich with GitHub data and set status to ACTIVE.
 * Reject: set status to ARCHIVED.
 */
export async function PATCH(request: Request): Promise<Response> {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  let validated: z.infer<typeof actionSchema>;
  try {
    const body = await request.json();
    validated = actionSchema.parse(body);
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const { toolId, action } = validated;

  const tool = await prisma.tool.findUnique({ where: { id: toolId } });
  if (!tool || tool.status !== "PENDING") {
    return errorResponse("Tool not found or not in PENDING status", 404);
  }

  if (action === "reject") {
    await prisma.tool.update({
      where: { id: toolId },
      data: { status: "ARCHIVED" },
    });
    return successResponse({ status: "ARCHIVED" });
  }

  // Approve: enrich with fresh GitHub data
  const parsed = parseRepoUrl(tool.repoUrl);
  if (parsed) {
    const { owner, repo } = parsed;

    const [repoResult, readmeResult, downloadsResult] =
      await Promise.allSettled([
        withRetry(() => fetchRepoData(owner, repo)),
        withRetry(() => fetchReadme(owner, repo)),
        tool.npmPackage
          ? withRetry(() => fetchWeeklyDownloads(tool.npmPackage!))
          : Promise.resolve(null as number | null),
      ]);

    const repoData =
      repoResult.status === "fulfilled" ? repoResult.value : null;
    const readmeContent =
      readmeResult.status === "fulfilled" ? readmeResult.value : null;
    const npmDownloads =
      downloadsResult.status === "fulfilled"
        ? (downloadsResult.value as number | null)
        : null;

    const features = readmeContent ? extractFeatures(readmeContent) : [];
    const installGuide = readmeContent
      ? extractInstallGuide(readmeContent)
      : null;

    const score = repoData
      ? computeScore({
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          lastCommitAt: new Date(repoData.pushed_at),
          npmDownloads,
        })
      : tool.score;

    const updateData: Record<string, unknown> = {
      status: "ACTIVE",
      score,
    };

    if (repoData) {
      updateData.stars = repoData.stargazers_count;
      updateData.forks = repoData.forks_count;
      updateData.openIssues = repoData.open_issues_count;
      updateData.lastCommitAt = new Date(repoData.pushed_at);
      updateData.language = repoData.language;
      updateData.license = repoData.license?.key ?? null;
      if (repoData.description) updateData.description = repoData.description;
    }

    // Only set features/installGuide if existing values are empty
    if (features.length > 0 && (!tool.featuresEn || tool.featuresEn.length === 0)) {
      updateData.featuresEn = features;
    }
    if (installGuide && !tool.installGuide) {
      updateData.installGuide = { markdown: installGuide };
    }
    if (npmDownloads !== null) {
      updateData.npmDownloads = npmDownloads;
    }

    await prisma.tool.update({
      where: { id: toolId },
      data: updateData,
    });
  } else {
    // No GitHub enrichment possible, just activate
    await prisma.tool.update({
      where: { id: toolId },
      data: { status: "ACTIVE" },
    });
  }

  return successResponse({ status: "ACTIVE" });
}
