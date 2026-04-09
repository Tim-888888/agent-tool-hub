import { z } from "zod"
import { prisma } from "@/lib/db"
import { successResponse, errorResponse } from "@/lib/api-utils"
import { requireAuth } from "@/lib/auth-helpers"
import { parseRepoUrl, fetchRepoData } from "@/lib/github-client"

export const dynamic = "force-dynamic"

const submitSchema = z.object({
  repoUrl: z
    .string()
    .url()
    .refine((url) => new URL(url).hostname === "github.com", {
      message: "Must be a GitHub URL",
    }),
  notes: z.string().max(300).optional(),
  suggestedTags: z.array(z.string()).max(10).optional(),
})

export async function POST(request: Request): Promise<Response> {
  // Per D-12: require authentication
  const { session, error } = await requireAuth()
  if (error) return error

  // Parse and validate request body
  let validated: z.infer<typeof submitSchema>
  try {
    const body = await request.json()
    validated = submitSchema.parse(body)
  } catch {
    return errorResponse("Invalid request body", 400)
  }

  const { repoUrl } = validated

  // Per D-13: validate repo URL format
  const parsed = parseRepoUrl(repoUrl)
  if (!parsed) {
    return errorResponse("Invalid GitHub URL", 400)
  }

  // Per D-14: dedup check against existing tools
  const existingTool = await prisma.tool.findFirst({
    where: { repoUrl },
  })
  if (existingTool) {
    return errorResponse(
      "This repository already exists in our database",
      409,
    )
  }

  // Per D-14: dedup check against pending submissions
  const existingSubmission = await prisma.submission.findFirst({
    where: { repoUrl, status: "PENDING" },
  })
  if (existingSubmission) {
    return errorResponse(
      "This repository has already been submitted and is pending review",
      409,
    )
  }

  // Per D-13: validate repo exists on GitHub
  try {
    await fetchRepoData(parsed.owner, parsed.repo)
  } catch {
    return errorResponse(
      "Could not verify this repository. Please check the URL.",
      400,
    )
  }

  // Per D-17: create submission record
  const submission = await prisma.submission.create({
    data: {
      repoUrl,
      userId: session!.user!.id,
      submitterName: session!.user!.name ?? null,
      notes: validated.notes,
      suggestedTags: validated.suggestedTags ?? [],
      status: "PENDING",
    },
  })

  return Response.json(
    {
      success: true,
      data: {
        message: "Submission received, pending review",
        submissionId: submission.id,
      },
    },
    { status: 201 },
  )
}
