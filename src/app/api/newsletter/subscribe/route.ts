import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, locale } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return errorResponse("Invalid email address", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (!existing.active) {
        await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { active: true, unsubscribedAt: null },
        });
        return successResponse({ action: "resubscribed" });
      }
      return successResponse({ action: "already_subscribed" });
    }

    const token = randomBytes(32).toString("hex");

    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        locale: locale === "zh" ? "zh" : "en",
        token,
      },
    });

    return successResponse({ action: "subscribed" });
  } catch {
    return errorResponse("Failed to subscribe", 500);
  }
}
