import { prisma } from "@/lib/db";
import {
  parseRepoUrl,
  fetchRepoData,
  fetchReadme,
} from "@/lib/github-client";
import { fetchWeeklyDownloads } from "@/lib/npm-client";
import { extractFeatures, extractInstallGuide } from "@/lib/readme-parser";
import { computeScore } from "@/lib/scoring";
import { generateCollectionContent } from "@/lib/translate";
import { connectAllPlatforms, classifyAndConnectCategories, enrichTranslations } from "@/lib/tool-enrichment";
import { withRetry } from "@/lib/retry";

export interface ApproveResult {
  success: boolean;
  toolId?: string;
  error?: string;
}

/**
 * Approve a user submission: fetch GitHub data, translate, create Tool record.
 */
export async function approveSubmission(submissionId: string): Promise<ApproveResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || submission.status !== "PENDING") {
    return { success: false, error: "Submission not found or already processed" };
  }

  const parsed = parseRepoUrl(submission.repoUrl);
  if (!parsed) {
    return { success: false, error: "Invalid repo URL" };
  }

  const { owner, repo } = parsed;

  const [repoResult, readmeResult] = await Promise.allSettled([
    fetchRepoData(owner, repo),
    fetchReadme(owner, repo),
  ]);

  const repoData = repoResult.status === "fulfilled" ? repoResult.value : null;
  if (!repoData) {
    return { success: false, error: "Cannot fetch repo data from GitHub" };
  }

  const readmeContent = readmeResult.status === "fulfilled" ? readmeResult.value : null;
  const features = readmeContent ? extractFeatures(readmeContent) : [];
  const installGuide = readmeContent ? extractInstallGuide(readmeContent) : null;

  const score = computeScore({
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    lastCommitAt: new Date(repoData.pushed_at),
    npmDownloads: null,
  });

  // Generate unique slug
  let slug = repo;
  const existingSlug = await prisma.tool.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = `${owner}-${repo}`;
    const existingOwnerSlug = await prisma.tool.findUnique({ where: { slug } });
    if (existingOwnerSlug) {
      slug = `${owner}-${repo}-${Date.now()}`;
    }
  }

  // Features and translation
  let finalFeaturesEn = features;
  let finalFeaturesZh: string[] = [];
  let finalInstallGuide: string | Record<string, string> | null = installGuide;

  if (features.length === 0) {
    const collectionContent = await generateCollectionContent(
      repo,
      repoData.description ?? "",
      submission.repoUrl,
      readmeContent,
    );
    finalFeaturesEn = collectionContent.featuresEn;
    finalFeaturesZh = collectionContent.featuresZh;
    if (!installGuide) {
      finalInstallGuide = { en: collectionContent.installGuideEn, zh: collectionContent.installGuideZh };
    }
  }

  const guideStr = typeof finalInstallGuide === "string" ? finalInstallGuide : null;
  const { descriptionZh, featuresZh, installGuide: translatedGuide } = await enrichTranslations(
    repoData.description ?? "",
    finalFeaturesEn,
    finalFeaturesZh,
    guideStr,
  );
  const structuredInstallGuide = translatedGuide ?? finalInstallGuide;

  const tool = await prisma.tool.create({
    data: {
      slug,
      name: repo,
      description: repoData.description ?? "",
      repoUrl: submission.repoUrl,
      type: "MCP_SERVER",
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      language: repoData.language,
      license: repoData.license?.key ?? null,
      lastCommitAt: new Date(repoData.pushed_at),
      featuresEn: finalFeaturesEn,
      descriptionZh,
      featuresZh,
      installGuide: structuredInstallGuide
        ? typeof structuredInstallGuide === "string"
          ? { markdown: structuredInstallGuide }
          : structuredInstallGuide
        : undefined,
      status: "ACTIVE",
      score,
    },
  });

  if (features.length === 0) {
    await connectAllPlatforms(tool.id);
  }

  await classifyAndConnectCategories(tool.id, repo, repoData.description ?? "", readmeContent);

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      toolId: tool.id,
    },
  });

  return { success: true, toolId: tool.id };
}

/**
 * Reject a user submission.
 */
export async function rejectSubmission(submissionId: string): Promise<ApproveResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || submission.status !== "PENDING") {
    return { success: false, error: "Submission not found or already processed" };
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "REJECTED", reviewedAt: new Date() },
  });

  return { success: true };
}

/**
 * Approve an auto-discovered tool: enrich with GitHub data, translate, set ACTIVE.
 */
export async function approveDiscoveredTool(toolId: string): Promise<ApproveResult> {
  const tool = await prisma.tool.findUnique({ where: { id: toolId } });
  if (!tool || tool.status !== "PENDING") {
    return { success: false, error: "Tool not found or not PENDING" };
  }

  const parsed = parseRepoUrl(tool.repoUrl);
  if (!parsed) {
    // No GitHub enrichment possible, just activate
    await prisma.tool.update({
      where: { id: toolId },
      data: { status: "ACTIVE" },
    });
    return { success: true };
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
  const npmDownloads = downloadsResult.status === "fulfilled"
    ? (downloadsResult.value as number | null)
    : null;

  const features = readmeContent ? extractFeatures(readmeContent) : [];
  const installGuide = readmeContent ? extractInstallGuide(readmeContent) : null;

  const score = repoData
    ? computeScore({
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        lastCommitAt: new Date(repoData.pushed_at),
        npmDownloads,
      })
    : tool.score;

  const updateData: Record<string, unknown> = { status: "ACTIVE", score };

  if (repoData) {
    updateData.stars = repoData.stargazers_count;
    updateData.forks = repoData.forks_count;
    updateData.openIssues = repoData.open_issues_count;
    updateData.lastCommitAt = new Date(repoData.pushed_at);
    updateData.language = repoData.language;
    updateData.license = repoData.license?.key ?? null;
    if (repoData.description) updateData.description = repoData.description;
  }

  if (features.length > 0 && (!tool.featuresEn || tool.featuresEn.length === 0)) {
    updateData.featuresEn = features;
  } else if (!tool.featuresEn || tool.featuresEn.length === 0) {
    const collectionContent = await generateCollectionContent(
      tool.name,
      (updateData.description as string) ?? tool.description,
      tool.repoUrl,
      readmeContent,
    );
    updateData.featuresEn = collectionContent.featuresEn;
    updateData.featuresZh = collectionContent.featuresZh;
    if (!tool.installGuide && !installGuide) {
      updateData.installGuide = {
        en: collectionContent.installGuideEn,
        zh: collectionContent.installGuideZh,
      };
    }
  }

  if (installGuide && !tool.installGuide) {
    const { translateInstallGuide } = await import("@/lib/translate");
    const guideZh = await translateInstallGuide(installGuide);
    updateData.installGuide = { en: installGuide, zh: guideZh ?? installGuide };
  }

  if (npmDownloads !== null) {
    updateData.npmDownloads = npmDownloads;
  }

  // Translation
  const finalDescription = (updateData.description as string) ?? tool.description;
  const finalFeatures = ((updateData.featuresEn as string[]) ?? tool.featuresEn) as string[];

  const { translateToolToChinese } = await import("@/lib/translate");

  if (!(updateData.featuresZh as string[])?.length) {
    const translation = await translateToolToChinese(finalDescription, finalFeatures);
    if (translation.descriptionZh) updateData.descriptionZh = translation.descriptionZh;
    if (translation.featuresZh.length > 0) updateData.featuresZh = translation.featuresZh;
  } else if (!updateData.descriptionZh) {
    const translation = await translateToolToChinese(finalDescription, []);
    if (translation.descriptionZh) updateData.descriptionZh = translation.descriptionZh;
  }

  await prisma.tool.update({
    where: { id: toolId },
    data: updateData,
  });

  if (features.length === 0) {
    await connectAllPlatforms(toolId);
  }

  await classifyAndConnectCategories(
    toolId,
    tool.name,
    (updateData.description as string) ?? tool.description,
    readmeContent,
  );

  return { success: true, toolId };
}

/**
 * Reject an auto-discovered tool.
 */
export async function rejectDiscoveredTool(toolId: string): Promise<ApproveResult> {
  const tool = await prisma.tool.findUnique({ where: { id: toolId } });
  if (!tool || tool.status !== "PENDING") {
    return { success: false, error: "Tool not found or not PENDING" };
  }

  await prisma.tool.update({
    where: { id: toolId },
    data: { status: "ARCHIVED" },
  });

  return { success: true };
}
