import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const collections = await prisma.collection.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { tools: true } },
      },
    });

    return successResponse(
      collections.map((c) => ({
        id: c.id,
        slug: c.slug,
        titleEn: c.titleEn,
        titleZh: c.titleZh,
        descriptionEn: c.descriptionEn,
        descriptionZh: c.descriptionZh,
        icon: c.icon,
        isPublished: c.isPublished,
        sortOrder: c.sortOrder,
        toolCount: c._count.tools,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    );
  } catch (error) {
    console.error("Failed to fetch admin collections:", error);
    return errorResponse("Failed to fetch collections", 500);
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const body = await request.json();
    const { slug, titleEn, titleZh, descriptionEn, descriptionZh, icon, isPublished, sortOrder } = body;

    if (!slug || !titleEn || !titleZh) {
      return errorResponse("slug, titleEn, titleZh are required", 400);
    }

    const existing = await prisma.collection.findUnique({ where: { slug } });
    if (existing) {
      return errorResponse("Slug already exists", 409);
    }

    const collection = await prisma.collection.create({
      data: {
        slug,
        titleEn,
        titleZh,
        descriptionEn: descriptionEn || null,
        descriptionZh: descriptionZh || null,
        icon: icon || null,
        isPublished: isPublished ?? false,
        sortOrder: sortOrder ?? 0,
      },
    });

    return successResponse(collection, undefined);
  } catch (error) {
    console.error("Failed to create collection:", error);
    return errorResponse("Failed to create collection", 500);
  }
}
