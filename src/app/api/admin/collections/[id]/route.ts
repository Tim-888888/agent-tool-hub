import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const collection = await prisma.collection.update({
      where: { id },
      data: {
        ...(body.slug ? { slug: body.slug } : {}),
        ...(body.titleEn !== undefined ? { titleEn: body.titleEn } : {}),
        ...(body.titleZh !== undefined ? { titleZh: body.titleZh } : {}),
        ...(body.descriptionEn !== undefined ? { descriptionEn: body.descriptionEn } : {}),
        ...(body.descriptionZh !== undefined ? { descriptionZh: body.descriptionZh } : {}),
        ...(body.icon !== undefined ? { icon: body.icon } : {}),
        ...(body.isPublished !== undefined ? { isPublished: body.isPublished } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });

    return successResponse(collection);
  } catch (error) {
    console.error("Failed to update collection:", error);
    return errorResponse("Failed to update collection", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const { id } = await params;
    await prisma.collection.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Failed to delete collection:", error);
    return errorResponse("Failed to delete collection", 500);
  }
}
