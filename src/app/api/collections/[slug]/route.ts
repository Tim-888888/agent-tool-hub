import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const collection = await prisma.collection.findUnique({
      where: { slug, isPublished: true },
      include: {
        tools: {
          orderBy: { sortOrder: "asc" },
          include: {
            tool: {
              select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                descriptionZh: true,
                stars: true,
                forks: true,
                language: true,
                license: true,
                type: true,
                avgRating: true,
                repoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!collection) {
      return errorResponse("Collection not found", 404);
    }

    return successResponse({
      id: collection.id,
      slug: collection.slug,
      titleEn: collection.titleEn,
      titleZh: collection.titleZh,
      descriptionEn: collection.descriptionEn,
      descriptionZh: collection.descriptionZh,
      icon: collection.icon,
      coverImage: collection.coverImage,
      tools: collection.tools.map((ct) => ({
        ...ct.tool,
        noteEn: ct.noteEn,
        noteZh: ct.noteZh,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch collection:", error);
    return errorResponse("Failed to fetch collection", 500);
  }
}
