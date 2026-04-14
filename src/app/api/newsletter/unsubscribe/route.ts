import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return errorResponse("Invalid token", 400);
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { token },
    });

    if (!subscriber) {
      return errorResponse("Subscriber not found", 404);
    }

    if (!subscriber.active) {
      return successResponse({ action: "already_unsubscribed" });
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { active: false, unsubscribedAt: new Date() },
    });

    return successResponse({ action: "unsubscribed" });
  } catch {
    return errorResponse("Failed to unsubscribe", 500);
  }
}
