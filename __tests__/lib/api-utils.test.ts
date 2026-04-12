import { mapToolResponse, TOOL_PRISMA_INCLUDE, buildOrderBy, buildWhereClause, parsePagination } from '@/lib/api-utils';

describe('mapToolResponse', () => {
  it('returns null for null input', () => {
    expect(mapToolResponse(null)).toBeNull();
  });

  it('maps categories and platforms correctly', () => {
    const tool = {
      id: '1',
      name: 'Test Tool',
      categories: [
        { category: { id: 'c1', slug: 'search', nameEn: 'Search', nameZh: '搜索' } },
      ],
      platforms: [
        { platform: { id: 'p1', slug: 'claude', name: 'Claude' } },
      ],
      score: 80,
      syncedAt: new Date(),
      npmDownloads: 100,
      tagVotes: [],
    };

    const result = mapToolResponse(tool);
    expect(result.id).toBe('1');
    expect(result.name).toBe('Test Tool');
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].slug).toBe('search');
    expect(result.platforms).toHaveLength(1);
    expect(result.platforms[0].slug).toBe('claude');
    // Internal fields should be stripped
    expect(result.score).toBeUndefined();
    expect(result.syncedAt).toBeUndefined();
    expect(result.npmDownloads).toBeUndefined();
  });

  it('handles empty categories and platforms', () => {
    const tool = {
      id: '2',
      name: 'Empty Tool',
      categories: [],
      platforms: [],
      score: 50,
      syncedAt: new Date(),
      npmDownloads: null,
      tagVotes: [],
    };

    const result = mapToolResponse(tool);
    expect(result.categories).toEqual([]);
    expect(result.platforms).toEqual([]);
  });

  it('computes topTags from tagVotes', () => {
    const tool = {
      id: '3',
      name: 'Tagged Tool',
      categories: [],
      platforms: [],
      score: 90,
      syncedAt: new Date(),
      npmDownloads: 0,
      tagVotes: [
        { tagSlug: 'mcp' },
        { tagSlug: 'mcp' },
        { tagSlug: 'search' },
        { tagSlug: 'mcp' },
        { tagSlug: 'search' },
        { tagSlug: 'ai' },
      ],
    };

    const result = mapToolResponse(tool);
    expect(result.topTags).toHaveLength(3);
    expect(result.topTags[0]).toEqual({ tagSlug: 'mcp', count: 3 });
    expect(result.topTags[1]).toEqual({ tagSlug: 'search', count: 2 });
    expect(result.topTags[2]).toEqual({ tagSlug: 'ai', count: 1 });
  });

  it('returns undefined topTags when no tagVotes', () => {
    const tool = {
      id: '4',
      categories: [],
      platforms: [],
      score: 10,
      syncedAt: new Date(),
      npmDownloads: 0,
      tagVotes: [],
    };

    const result = mapToolResponse(tool);
    expect(result.topTags).toBeUndefined();
  });
});

describe('TOOL_PRISMA_INCLUDE', () => {
  it('includes categories, platforms, and tagVotes', () => {
    expect(TOOL_PRISMA_INCLUDE.categories).toBeDefined();
    expect(TOOL_PRISMA_INCLUDE.platforms).toBeDefined();
    expect(TOOL_PRISMA_INCLUDE.tagVotes).toBeDefined();
  });
});

describe('buildOrderBy', () => {
  it('defaults to score desc', () => {
    expect(buildOrderBy(null)).toEqual({ score: 'desc' });
  });

  it('sorts by recent (lastCommitAt desc)', () => {
    expect(buildOrderBy('recent')).toEqual({ lastCommitAt: 'desc' });
  });

  it('sorts by name asc', () => {
    expect(buildOrderBy('name')).toEqual({ name: 'asc' });
  });

  it('sorts by rating desc', () => {
    expect(buildOrderBy('rating')).toEqual({ avgRating: 'desc' });
  });
});

describe('parsePagination', () => {
  it('uses defaults when no params', () => {
    const sp = new URLSearchParams();
    const result = parsePagination(sp);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  it('parses page and limit', () => {
    const sp = new URLSearchParams('page=3&limit=10');
    const result = parsePagination(sp);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(20);
  });

  it('clamps limit to max 100', () => {
    const sp = new URLSearchParams('limit=999');
    const result = parsePagination(sp);
    expect(result.limit).toBe(100);
  });
});

describe('buildWhereClause', () => {
  it('returns base status filter with no params', () => {
    const sp = new URLSearchParams();
    const where = buildWhereClause(sp) as { status: { in: string[] } };
    expect(where.status.in).toContain('ACTIVE');
    expect(where.status.in).toContain('FEATURED');
  });

  it('filters by type', () => {
    const sp = new URLSearchParams('type=mcp');
    const where = buildWhereClause(sp) as { AND: unknown[] };
    expect(where.AND).toBeDefined();
    expect(where.AND.length).toBeGreaterThan(1);
  });
});
