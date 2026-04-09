import { z } from "zod"
import { prisma } from "@/lib/db"
import { successResponse, errorResponse } from "@/lib/api-utils"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import {
  parseRepoUrl,
  fetchRepoData,
  fetchReadme,
} from "@/lib/github-client"
import { extractFeatures, extractInstallGuide } from "@/lib/readme-parser"
import { computeScore } from "@/lib/scoring"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  submissionId: z.string(),
  action: z.enum(["approve", "reject"]),
})

/**
 * GET /api/admin/submissions
 * Per D-16: list PENDING submissions with user info (admin-only)
 */
export async function GET(): Promise<Response> {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session!.user!.id as string
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403)
  }

  const submissions = await prisma.submission.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return successResponse(submissions)
}

/**
 * PATCH /api/admin/submissions
 * Per D-11: approve/reject submission
 * Per D-15: on approval, auto-fetch GitHub data and create Tool record
 */
export async function PATCH(request: Request): Promise<Response> {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session!.user!.id as string
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403)
  }

  // Parse and validate request body
  let validated: z.infer<typeof actionSchema>
  try {
    const body = await request.json()
    validated = actionSchema.parse(body)
  } catch {
    return errorResponse("Invalid request body", 400)
  }

  const { submissionId, action } = validated

  // Find submission, verify it exists and is still PENDING
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  })

  if (!submission || submission.status !== "PENDING") {
    return errorResponse(
      "Submission not found or already processed",
      404,
    )
  }

  // Handle rejection
  if (action === "reject") {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "REJECTED", reviewedAt: new Date() },
    })
    return successResponse({ status: "REJECTED" })
  }

  // Handle approval: auto-fetch GitHub data per D-15
  const parsed = parseRepoUrl(submission.repoUrl)
  if (!parsed) {
    return errorResponse("Invalid repo URL on submission", 400)
  }

  const { owner, repo } = parsed

  const [repoResult, readmeResult] = await Promise.allSettled([
    fetchRepoData(owner, repo),
    fetchReadme(owner, repo),
  ])

  const repoData =
    repoResult.status === "fulfilled" ? repoResult.value : null
  if (!repoData) {
    return errorResponse("Cannot fetch repo data from GitHub", 400)
  }

  const readmeContent =
    readmeResult.status === "fulfilled" ? readmeResult.value : null
  const features = readmeContent ? extractFeatures(readmeContent) : []
  const installGuide = readmeContent
    ? extractInstallGuide(readmeContent)
    : null

  const score = computeScore({
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    lastCommitAt: new Date(repoData.pushed_at),
    npmDownloads: null,
  })

  // Generate unique slug: use owner-repo if slug collision exists
  let slug = repo
  const existingSlug = await prisma.tool.findUnique({ where: { slug } })
  if (existingSlug) {
    slug = `${owner}-${repo}`
    const existingOwnerSlug = await prisma.tool.findUnique({
      where: { slug },
    })
    if (existingOwnerSlug) {
      // Fallback: append timestamp suffix for guaranteed uniqueness
      slug = `${owner}-${repo}-${Date.now()}`
    }
  }

  // Create Tool and update Submission in a transaction
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
      featuresEn: features,
      installGuide: installGuide ? { markdown: installGuide } : undefined,
      status: "ACTIVE",
      score,
    },
  })

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      toolId: tool.id,
    },
  })

  return successResponse({ status: "APPROVED", toolId: tool.id })
}
