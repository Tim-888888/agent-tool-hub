export type ToolType = 'MCP_SERVER' | 'SKILL' | 'RULE';

export interface Platform {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  nameEn: string;
  nameZh: string;
  slug: string;
  icon: string;
  descriptionEn?: string;
  descriptionZh?: string;
  toolCount?: number;
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string;
  descriptionZh?: string;
  type: ToolType;
  repoUrl: string;
  stars: number;
  forks: number;
  avgRating: number;
  ratingCount: number;
  language?: string;
  license?: string;
  author?: string;
  version?: string;
  lastCommitAt?: string;
  createdAt: string;
  updatedAt: string;
  featuresEn: string[];
  featuresZh: string[];
  tags: string[];
  installGuide?: string | Record<string, unknown>;
  categories: Category[];
  platforms: Platform[];
  topTags?: { tagSlug: string; count: number }[];
}

export interface ToolFilters {
  sort?: string;
  query?: string;
  type?: string;
  platform?: string;
  category?: string;
  page?: number;
  license?: string;
  language?: string;
  maintenance?: string;
}
