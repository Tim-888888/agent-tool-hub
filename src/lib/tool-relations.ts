import type { PrismaClient } from "@/generated/prisma/client";

type PrismaExecutor = PrismaClient;

export interface ToolRelationLists {
  tags?: string[];
  transports?: string[];
  featuresEn?: string[];
  featuresZh?: string[];
  screenshots?: string[];
}

type RelationRow = {
  value?: string;
  url?: string;
  locale?: string;
  sortOrder?: number;
};

function normalizeList(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);
}

export function listToCreateRows(values: string[] | undefined): Array<{ value: string; sortOrder: number }> {
  return normalizeList(values).map((value, sortOrder) => ({ value, sortOrder }));
}

export function screenshotsToCreateRows(values: string[] | undefined): Array<{ url: string; sortOrder: number }> {
  return normalizeList(values).map((url, sortOrder) => ({ url, sortOrder }));
}

export function featuresToCreateRows(
  locale: "en" | "zh",
  values: string[] | undefined,
): Array<{ locale: string; value: string; sortOrder: number }> {
  return normalizeList(values).map((value, sortOrder) => ({ locale, value, sortOrder }));
}

export function buildToolRelationCreate(lists: ToolRelationLists) {
  const features = [
    ...featuresToCreateRows("en", lists.featuresEn),
    ...featuresToCreateRows("zh", lists.featuresZh),
  ];

  return {
    ...(lists.tags ? { tags: { create: listToCreateRows(lists.tags) } } : {}),
    ...(lists.transports ? { transports: { create: listToCreateRows(lists.transports) } } : {}),
    ...(features.length > 0 ? { features: { create: features } } : {}),
    ...(lists.screenshots ? { screenshots: { create: screenshotsToCreateRows(lists.screenshots) } } : {}),
  };
}

export async function replaceToolRelations(
  prisma: PrismaExecutor,
  toolId: string,
  lists: ToolRelationLists,
) {
  if (lists.tags) {
    await prisma.toolTag.deleteMany({ where: { toolId } });
    for (const data of listToCreateRows(lists.tags)) {
      await prisma.toolTag.create({ data: { toolId, ...data } });
    }
  }

  if (lists.transports) {
    await prisma.toolTransport.deleteMany({ where: { toolId } });
    for (const data of listToCreateRows(lists.transports)) {
      await prisma.toolTransport.create({ data: { toolId, ...data } });
    }
  }

  if (lists.featuresEn) {
    await prisma.toolFeature.deleteMany({ where: { toolId, locale: "en" } });
    for (const data of featuresToCreateRows("en", lists.featuresEn)) {
      await prisma.toolFeature.create({ data: { toolId, ...data } });
    }
  }

  if (lists.featuresZh) {
    await prisma.toolFeature.deleteMany({ where: { toolId, locale: "zh" } });
    for (const data of featuresToCreateRows("zh", lists.featuresZh)) {
      await prisma.toolFeature.create({ data: { toolId, ...data } });
    }
  }

  if (lists.screenshots) {
    await prisma.toolScreenshot.deleteMany({ where: { toolId } });
    for (const data of screenshotsToCreateRows(lists.screenshots)) {
      await prisma.toolScreenshot.create({ data: { toolId, ...data } });
    }
  }
}

export function relationValues(rows: Array<RelationRow | string> | undefined, key: "value" | "url" = "value"): string[] {
  if (!Array.isArray(rows)) return [];
  if (rows.every((row) => typeof row === "string")) {
    return rows as unknown as string[];
  }
  return [...rows]
    .filter((row): row is RelationRow => typeof row === "object" && row !== null)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((row) => row[key])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function featureValues(rows: RelationRow[] | undefined, locale: "en" | "zh"): string[] {
  if (!Array.isArray(rows)) return [];
  return relationValues(rows.filter((row) => row.locale === locale));
}
