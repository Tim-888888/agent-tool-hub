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
    const [total, active, inactive] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { active: true } }),
      prisma.newsletterSubscriber.count({ where: { active: false } }),
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

    return successResponse({ total, active, inactive, recent });
  } catch {
    return errorResponse("Failed to fetch subscribers", 500);
  }
}
