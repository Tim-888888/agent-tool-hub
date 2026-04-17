import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!session?.user?.id) return errorResponse("Authentication required", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true, proNewsletter: true },
  });

  if (!user) return errorResponse("User not found", 404);

  return successResponse({
    isPro: user.isPro,
    proNewsletter: user.proNewsletter,
  });
}

export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!session?.user?.id) return errorResponse("Authentication required", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true, proNewsletter: true },
  });

  if (!user) return errorResponse("User not found", 404);
  if (!user.isPro) return errorResponse("Pro membership required", 403);

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { proNewsletter: !user.proNewsletter },
    select: { proNewsletter: true },
  });

  return successResponse({
    proNewsletter: updated.proNewsletter,
  });
}
