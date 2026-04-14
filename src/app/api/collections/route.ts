import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { tools: true } },
      },
    });

    const data = collections.map((c) => ({
      id: c.id,
      slug: c.slug,
      titleEn: c.titleEn,
      titleZh: c.titleZh,
      descriptionEn: c.descriptionEn,
      descriptionZh: c.descriptionZh,
      icon: c.icon,
      coverImage: c.coverImage,
      toolCount: c._count.tools,
    }));

    return successResponse(data);
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    return errorResponse("Failed to fetch collections", 500);
  }
}
