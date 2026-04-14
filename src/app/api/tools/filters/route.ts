import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const [licenses, languages] = await Promise.all([
      prisma.tool.findMany({
        where: { status: { in: ["ACTIVE", "FEATURED"] }, license: { not: null } },
        select: { license: true },
        distinct: ["license"],
        orderBy: { license: "asc" },
      }),
      prisma.tool.findMany({
        where: { status: { in: ["ACTIVE", "FEATURED"] }, language: { not: null } },
        select: { language: true },
        distinct: ["language"],
        orderBy: { language: "asc" },
      }),
    ]);

    return successResponse({
      licenses: licenses.map((l) => l.license).filter(Boolean) as string[],
      languages: languages.map((l) => l.language).filter(Boolean) as string[],
    });
  } catch {
    return errorResponse("Failed to fetch filter options", 500);
  }
}
