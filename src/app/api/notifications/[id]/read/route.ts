import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-helpers";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const userId = session!.user!.id as string;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      return errorResponse("Notification not found", 404);
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return successResponse({ read: true });
  } catch (error) {
    console.error("Mark notification read failed:", error);
    return errorResponse("Mark notification read failed", 500);
  }
}
