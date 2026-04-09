export interface TagPreset {
  slug: string
  labelEn: string
  labelZh: string
}

export const TAG_PRESETS: readonly TagPreset[] = [
  { slug: "easy-to-use", labelEn: "Easy to use", labelZh: "简单易用" },
  { slug: "great-docs", labelEn: "Great docs", labelZh: "文档优秀" },
  { slug: "high-performance", labelEn: "High performance", labelZh: "高性能" },
  { slug: "well-maintained", labelEn: "Well maintained", labelZh: "维护良好" },
  { slug: "creative-practical", labelEn: "Creative & practical", labelZh: "创意实用" },
  { slug: "easy-to-install", labelEn: "Easy to install", labelZh: "安装便捷" },
  { slug: "good-for-beginners", labelEn: "Good for beginners", labelZh: "新手友好" },
  { slug: "production-ready", labelEn: "Production ready", labelZh: "生产可用" },
  { slug: "great-support", labelEn: "Great support", labelZh: "支持优秀" },
  { slug: "time-saving", labelEn: "Time saving", labelZh: "节省时间" },
] as const

export function getTagLabel(slug: string, locale: "en" | "zh"): string {
  const tag = TAG_PRESETS.find(t => t.slug === slug)
  return tag ? (locale === "zh" ? tag.labelZh : tag.labelEn) : slug
}
