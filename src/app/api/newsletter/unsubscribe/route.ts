import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return errorResponse("Invalid token", 400);
    }

    // Try NewsletterSubscriber first (legacy free newsletter)
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { token },
    });

    if (subscriber) {
      if (!subscriber.active) {
        return successResponse({ action: "already_unsubscribed" });
      }
      await prisma.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { active: false, unsubscribedAt: new Date() },
      });
      return successResponse({ action: "unsubscribed" });
    }

    // Try User.proToken (Pro newsletter)
    const user = await prisma.user.findUnique({
      where: { proToken: token },
    });

    if (user) {
      if (!user.proNewsletter) {
        return successResponse({ action: "already_unsubscribed" });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { proNewsletter: false },
      });
      return successResponse({ action: "unsubscribed" });
    }

    return errorResponse("Subscriber not found", 404);
  } catch {
    return errorResponse("Failed to unsubscribe", 500);
  }
}
