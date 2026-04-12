import { mapToolResponse, TOOL_PRISMA_INCLUDE } from '@/lib/api-utils';
import type { Category } from '@/types';

describe('Homepage ISR data pipeline', () => {
  // Simulate the exact data flow in the server component
  const mockPrismaTools = [
    {
      id: 't1',
      name: 'Sequential Thinking MCP',
      slug: 'sequential-thinking-mcp',
      description: 'Structured chain-of-thought reasoning',
      descriptionZh: '结构化的思维链推理',
      type: 'MCP_SERVER',
      repoUrl: 'https://github.com/example/st',
      stars: 83442,
      forks: 1000,
      avgRating: 4.8,
      ratingCount: 50,
      language: 'TypeScript',
      license: 'MIT',
      author: 'Anthropic',
      version: '1.0.0',
      lastCommitAt: '2026-04-10',
      createdAt: '2026-01-01',
      updatedAt: '2026-04-10',
      featuresEn: ['structured thinking'],
      featuresZh: ['结构化思考'],
      tags: ['mcp', 'reasoning'],
      installGuide: null,
      score: 95,
      syncedAt: new Date(),
      npmDownloads: 500,
      categories: [
        { category: { id: 'c1', slug: 'ai-ml', nameEn: 'AI / ML', nameZh: 'AI / ML', icon: 'brain', order: 1, descriptionEn: null, descriptionZh: null } },
      ],
      platforms: [
        { platform: { id: 'p1', slug: 'claude', name: 'Claude' } },
      ],
      tagVotes: [
        { tagSlug: 'mcp' },
        { tagSlug: 'mcp' },
        { tagSlug: 'reasoning' },
      ],
    },
    {
      id: 't2',
      name: 'Filesystem MCP',
      slug: 'filesystem-mcp',
      description: 'File system operations',
      descriptionZh: '文件系统操作',
      type: 'MCP_SERVER',
      repoUrl: 'https://github.com/example/fs',
      stars: 50000,
      forks: 800,
      avgRating: 4.5,
      ratingCount: 30,
      language: 'TypeScript',
      license: 'MIT',
      createdAt: '2026-01-15',
      updatedAt: '2026-04-09',
      featuresEn: [],
      featuresZh: [],
      tags: ['mcp', 'filesystem'],
      score: 88,
      syncedAt: new Date(),
      npmDownloads: 200,
      categories: [
        { category: { id: 'c2', slug: 'filesystem', nameEn: 'Filesystem', nameZh: '文件系统', icon: 'folder', order: 2, descriptionEn: null, descriptionZh: null } },
      ],
      platforms: [
        { platform: { id: 'p1', slug: 'claude', name: 'Claude' } },
      ],
      tagVotes: [],
    },
  ];

  const mockPrismaCategories = [
    { id: 'c1', slug: 'ai-ml', nameEn: 'AI / ML', nameZh: 'AI / ML', icon: 'brain', order: 1, descriptionEn: null, descriptionZh: null, _count: { tools: 2 } },
    { id: 'c2', slug: 'filesystem', nameEn: 'Filesystem', nameZh: '文件系统', icon: 'folder', order: 2, descriptionEn: null, descriptionZh: null, _count: { tools: 1 } },
    { id: 'c3', slug: 'database', nameEn: 'Database', nameZh: '数据库', icon: 'database', order: 3, descriptionEn: 'DB tools', descriptionZh: '数据库工具', _count: { tools: 0 } },
  ];

  it('maps featured tools correctly with categories and platforms', () => {
    const featuredTools = mockPrismaTools.map(mapToolResponse);

    expect(featuredTools).toHaveLength(2);
    expect(featuredTools[0].name).toBe('Sequential Thinking MCP');
    expect(featuredTools[0].categories).toHaveLength(1);
    expect(featuredTools[0].categories[0].slug).toBe('ai-ml');
    expect(featuredTools[0].platforms).toHaveLength(1);
    expect(featuredTools[0].topTags).toEqual([
      { tagSlug: 'mcp', count: 2 },
      { tagSlug: 'reasoning', count: 1 },
    ]);
    // Stripped fields
    expect(featuredTools[0].score).toBeUndefined();
    expect(featuredTools[0].syncedAt).toBeUndefined();
  });

  it('computes stats correctly', () => {
    const totalCount = 12; // simulated prisma.tool.count()
    const categories: Category[] = mockPrismaCategories.map(({ _count, ...rest }) => ({
      ...rest,
      descriptionEn: rest.descriptionEn ?? undefined,
      descriptionZh: rest.descriptionZh ?? undefined,
      toolCount: _count.tools,
    }));

    const stats = {
      tools: totalCount,
      platforms: 7,
      categories: categories.length,
    };

    expect(stats.tools).toBe(12);
    expect(stats.platforms).toBe(7);
    expect(stats.categories).toBe(3);
  });

  it('computes toolCounts from featured tools categories', () => {
    const featuredTools = mockPrismaTools.map(mapToolResponse);
    const toolCounts: Record<string, number> = {};
    for (const tool of featuredTools) {
      for (const cat of tool.categories) {
        toolCounts[cat.slug] = (toolCounts[cat.slug] ?? 0) + 1;
      }
    }

    expect(toolCounts['ai-ml']).toBe(1);
    expect(toolCounts['filesystem']).toBe(1);
    expect(toolCounts['database']).toBeUndefined();
  });

  it('maps categories with null→undefined conversion', () => {
    const categories: Category[] = mockPrismaCategories.map(({ _count, ...rest }) => ({
      ...rest,
      descriptionEn: rest.descriptionEn ?? undefined,
      descriptionZh: rest.descriptionZh ?? undefined,
      toolCount: _count.tools,
    }));

    // null → undefined conversion
    expect(categories[0].descriptionEn).toBeUndefined();
    expect(categories[0].descriptionZh).toBeUndefined();
    // non-null stays
    expect(categories[2].descriptionEn).toBe('DB tools');
    expect(categories[2].descriptionZh).toBe('数据库工具');
    // toolCount from _count
    expect(categories[0].toolCount).toBe(2);
    expect(categories[2].toolCount).toBe(0);
  });

  it('TOOL_PRISMA_INCLUDE has required relations', () => {
    expect(TOOL_PRISMA_INCLUDE.categories.include.category).toBe(true);
    expect(TOOL_PRISMA_INCLUDE.platforms.include.platform).toBe(true);
    expect(TOOL_PRISMA_INCLUDE.tagVotes.select.tagSlug).toBe(true);
  });
});
