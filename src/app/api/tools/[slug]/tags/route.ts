import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-helpers";
import { TAG_PRESETS } from "@/lib/tag-presets";
import { z } from "zod";

const VALID_TAG_SLUGS = new Set(TAG_PRESETS.map((t) => t.slug));

const voteSchema = z.object({
  tagSlug: z.string(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const tool = await prisma.tool.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tool) {
      return errorResponse("Tool not found", 404);
    }

    const tagCounts = await prisma.toolTagVote.groupBy({
      by: ["tagSlug"],
      where: { toolId: tool.id },
      _count: { tagSlug: true },
      orderBy: { _count: { tagSlug: "desc" } },
    });

    // Get current user's votes if authenticated
    const { session } = await requireAuth().catch(() => ({
      session: null,
    }));
    let userVotes: string[] = [];
    if (session?.user?.id) {
      const votes = await prisma.toolTagVote.findMany({
        where: { toolId: tool.id, userId: session.user.id },
        select: { tagSlug: true },
      });
      userVotes = votes.map((v) => v.tagSlug);
    }

    return successResponse({
      tags: tagCounts.map((t) => ({
        tagSlug: t.tagSlug,
        count: t._count.tagSlug,
      })),
      userVotes,
    });
  } catch {
    return errorResponse("Failed to fetch tag votes", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { session, error: authError } = await requireAuth();
    if (authError) return authError;

    const { slug } = await params;

    const body = await request.json();
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message ?? "Invalid input", 400);
    }

    const { tagSlug } = parsed.data;

    if (!VALID_TAG_SLUGS.has(tagSlug)) {
      return errorResponse("Invalid tag", 400);
    }

    const tool = await prisma.tool.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tool) {
      return errorResponse("Tool not found", 404);
    }

    const userId = session!.user!.id as string;

    const existing = await prisma.toolTagVote.findUnique({
      where: {
        toolId_tagSlug_userId: {
          toolId: tool.id,
          tagSlug,
          userId,
        },
      },
    });

    if (existing) {
      await prisma.toolTagVote.delete({ where: { id: existing.id } });
      return successResponse({ action: "unvoted", tagSlug });
    }

    const voteCount = await prisma.toolTagVote.count({
      where: { toolId: tool.id, userId },
    });

    if (voteCount >= 3) {
      return errorResponse("Max 3 tags per tool", 400);
    }

    await prisma.toolTagVote.create({
      data: { toolId: tool.id, tagSlug, userId },
    });

    return successResponse({ action: "voted", tagSlug });
  } catch {
    return errorResponse("Failed to vote on tag", 500);
  }
}
