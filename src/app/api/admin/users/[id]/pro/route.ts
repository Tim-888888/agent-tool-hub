import { requireAuth, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!session?.user?.id) return errorResponse("Authentication required", 401);

  if (!isAdmin(session.user.id)) {
    return errorResponse("Admin access required", 403);
  }

  const { id } = await params;
  const body = await request.json();
  const { isPro } = body;

  if (typeof isPro !== "boolean") {
    return errorResponse("isPro must be a boolean", 400);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isPro },
    select: { id: true, name: true, email: true, isPro: true },
  });

  return successResponse(user);
}
