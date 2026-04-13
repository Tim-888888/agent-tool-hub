import { prisma } from "@/lib/db"
import { classifyToolCategories, translateToolToChinese, translateInstallGuide } from "@/lib/translate"

/**
 * Batch-connect a tool to all platforms (for collection-type tools).
 * Uses createMany with skipDuplicates instead of N+1 upserts.
 */
export async function connectAllPlatforms(toolId: string): Promise<void> {
  const allPlatforms = await prisma.platform.findMany()
  if (allPlatforms.length === 0) return
  await prisma.toolPlatform.createMany({
    data: allPlatforms.map((p) => ({ toolId, platformId: p.id })),
    skipDuplicates: true,
  })
}

/**
 * Classify tool into categories via GLM and batch-connect them.
 * Uses whereIn + createMany instead of N+1 findUnique + upsert.
 */
export async function classifyAndConnectCategories(
  toolId: string,
  name: string,
  description: string,
  readmeContent: string | null,
): Promise<void> {
  const categorySlugs = await classifyToolCategories(name, description, readmeContent)
  if (categorySlugs.length === 0) return

  const matchedCategories = await prisma.category.findMany({
    where: { slug: { in: categorySlugs } },
  })
  if (matchedCategories.length === 0) return

  await prisma.toolCategory.createMany({
    data: matchedCategories.map((c) => ({ toolId, categoryId: c.id })),
    skipDuplicates: true,
  })
}

interface TranslationResult {
  descriptionZh?: string
  featuresZh?: string[]
  installGuide: Record<string, string> | null
}

/**
 * Run translation and install guide translation in parallel.
 * Skips features translation if featuresZh is already populated.
 */
export async function enrichTranslations(
  description: string,
  featuresEn: string[],
  existingFeaturesZh: string[],
  installGuideStr: string | null,
): Promise<TranslationResult> {
  const featuresToTranslate = existingFeaturesZh.length > 0 ? [] : featuresEn
  const needsInstallTranslation = !!installGuideStr

  const [translation, guideZh] = await Promise.all([
    translateToolToChinese(description, featuresToTranslate),
    needsInstallTranslation
      ? translateInstallGuide(installGuideStr!)
      : Promise.resolve(null),
  ])

  const descriptionZh = translation.descriptionZh || undefined
  const featuresZh =
    existingFeaturesZh.length > 0
      ? existingFeaturesZh
      : translation.featuresZh.length > 0
        ? translation.featuresZh
        : undefined

  let installGuide: Record<string, string> | null = null
  if (installGuideStr) {
    installGuide = { en: installGuideStr, zh: guideZh ?? installGuideStr }
  }

  return { descriptionZh, featuresZh, installGuide }
}
