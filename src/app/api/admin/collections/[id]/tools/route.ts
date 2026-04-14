import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(
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
    const { toolId, noteEn, noteZh, sortOrder } = body;

    if (!toolId) {
      return errorResponse("toolId is required", 400);
    }

    // Verify collection and tool exist
    const [collection, tool] = await Promise.all([
      prisma.collection.findUnique({ where: { id } }),
      prisma.tool.findUnique({ where: { id: toolId } }),
    ]);

    if (!collection) return errorResponse("Collection not found", 404);
    if (!tool) return errorResponse("Tool not found", 404);

    const ct = await prisma.collectionTool.create({
      data: {
        collectionId: id,
        toolId,
        noteEn: noteEn || null,
        noteZh: noteZh || null,
        sortOrder: sortOrder ?? 0,
      },
    });

    return successResponse(ct);
  } catch (error) {
    // Handle unique constraint violation (tool already in collection)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return errorResponse("Tool already in this collection", 409);
    }
    console.error("Failed to add tool to collection:", error);
    return errorResponse("Failed to add tool to collection", 500);
  }
}

export async function DELETE(
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
    const { toolId } = body;

    if (!toolId) {
      return errorResponse("toolId is required", 400);
    }

    await prisma.collectionTool.delete({
      where: {
        collectionId_toolId: { collectionId: id, toolId },
      },
    });

    return successResponse({ removed: true });
  } catch (error) {
    console.error("Failed to remove tool from collection:", error);
    return errorResponse("Failed to remove tool from collection", 500);
  }
}
