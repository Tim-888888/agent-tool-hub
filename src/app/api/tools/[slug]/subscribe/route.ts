import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { slug } = await params;
    const userId = session!.user!.id as string;

    const tool = await prisma.tool.findUnique({ where: { slug } });
    if (!tool) return errorResponse("Tool not found", 404);

    // Check if already subscribed
    const existing = await prisma.toolSubscription.findUnique({
      where: { userId_toolId: { userId, toolId: tool.id } },
    });

    if (existing) {
      // Unsubscribe
      await prisma.toolSubscription.delete({ where: { id: existing.id } });
      return successResponse({ subscribed: false });
    }

    // Subscribe
    await prisma.toolSubscription.create({
      data: { userId, toolId: tool.id },
    });
    return successResponse({ subscribed: true });
  } catch (error) {
    console.error("Subscribe failed:", error);
    return errorResponse("Subscribe failed", 500);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { slug } = await params;
    const userId = session!.user!.id as string;

    const tool = await prisma.tool.findUnique({ where: { slug } });
    if (!tool) return errorResponse("Tool not found", 404);

    const sub = await prisma.toolSubscription.findUnique({
      where: { userId_toolId: { userId, toolId: tool.id } },
    });

    return successResponse({ subscribed: !!sub });
  } catch (error) {
    console.error("Check subscription failed:", error);
    return errorResponse("Check subscription failed", 500);
  }
}
