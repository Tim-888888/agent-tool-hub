import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface Contributor {
  userId: string;
  name: string | null;
  image: string | null;
  approvedCount: number;
  lastSubmissionAt: string;
}

export async function GET() {
  try {
    // Query submissions grouped by userId, only APPROVED
    const submissions = await prisma.submission.findMany({
      where: {
        status: "APPROVED",
        userId: { not: null },
      },
      select: {
        userId: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate by userId
    const map = new Map<
      string,
      {
        name: string | null;
        image: string | null;
        approvedCount: number;
        lastSubmissionAt: Date;
      }
    >();

    for (const s of submissions) {
      if (!s.userId) continue;
      const existing = map.get(s.userId);
      if (existing) {
        existing.approvedCount++;
        if (s.createdAt > existing.lastSubmissionAt) {
          existing.lastSubmissionAt = s.createdAt;
        }
      } else {
        map.set(s.userId, {
          name: s.user?.name ?? null,
          image: s.user?.image ?? null,
          approvedCount: 1,
          lastSubmissionAt: s.createdAt,
        });
      }
    }

    const contributors: Contributor[] = Array.from(map.entries())
      .map(([userId, data]) => ({
        userId,
        name: data.name,
        image: data.image,
        approvedCount: data.approvedCount,
        lastSubmissionAt: data.lastSubmissionAt.toISOString(),
      }))
      .sort((a, b) => b.approvedCount - a.approvedCount);

    return successResponse(contributors);
  } catch (error) {
    console.error("Failed to fetch contributors:", error);
    return errorResponse("Failed to fetch contributors", 500);
  }
}
