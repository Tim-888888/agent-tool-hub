import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const userId = session!.user!.id as string;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        tool: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    return successResponse({ notifications, unreadCount });
  } catch (error) {
    console.error("Fetch notifications failed:", error);
    return errorResponse("Fetch notifications failed", 500);
  }
}
