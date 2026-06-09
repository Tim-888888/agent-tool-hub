import { prisma } from "@/lib/db"
import { classifyToolCategories, translateToolToChinese, translateInstallGuide } from "@/lib/translate"

/**
 * Batch-connect a tool to all platforms (for collection-type tools).
 */
export async function connectAllPlatforms(toolId: string): Promise<void> {
  const allPlatforms = await prisma.platform.findMany()
  if (allPlatforms.length === 0) return
  for (const platform of allPlatforms) {
    await prisma.toolPlatform.upsert({
      where: { toolId_platformId: { toolId, platformId: platform.id } },
      create: { toolId, platformId: platform.id },
      update: {},
    })
  }
}

/**
 * Classify tool into categories via GLM and batch-connect them.
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

  for (const category of matchedCategories) {
    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId, categoryId: category.id } },
      create: { toolId, categoryId: category.id },
      update: {},
    })
  }
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
