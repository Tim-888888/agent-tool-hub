import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const [total, active, inactive, proSubscriberCount] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { active: true } }),
      prisma.newsletterSubscriber.count({ where: { active: false } }),
      prisma.user.count({ where: { isPro: true, proNewsletter: true } }),
    ]);

    const recent = await prisma.newsletterSubscriber.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        email: true,
        locale: true,
        createdAt: true,
      },
    });

    const recentDigestSends = await prisma.digestSend.findMany({
      orderBy: { sentAt: "desc" },
      take: 5,
      select: {
        id: true,
        userId: true,
        sentAt: true,
        toolCount: true,
        status: true,
        error: true,
      },
    });

    return successResponse({
      total,
      active,
      inactive,
      proSubscriberCount,
      recent,
      recentDigestSends: recentDigestSends.map((s) => ({
        ...s,
        sentAt: s.sentAt.toISOString(),
      })),
    });
  } catch {
    return errorResponse("Failed to fetch subscribers", 500);
  }
}
