import { TOOLS, CATEGORIES, PLATFORMS, getTools, getToolBySlug, getFeaturedTools, getTrendingTools } from '@/lib/mock-data';

describe('mock data constants', () => {
  it('has tools loaded', () => {
    expect(TOOLS.length).toBeGreaterThan(0);
  });

  it('has categories loaded', () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });

  it('has platforms loaded', () => {
    expect(PLATFORMS.length).toBeGreaterThan(0);
  });

  it('each tool has required fields', () => {
    for (const tool of TOOLS) {
      expect(tool.id).toBeTruthy();
      expect(tool.slug).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.type).toMatch(/^(MCP_SERVER|SKILL|RULE)$/);
      expect(tool.repoUrl).toMatch(/^https:\/\//);
      expect(Array.isArray(tool.tags)).toBe(true);
      expect(Array.isArray(tool.platforms)).toBe(true);
    }
  });
});

describe('getTools', () => {
  it('returns all tools without filters', () => {
    const result = getTools();
    expect(result.length).toBe(TOOLS.length);
  });

  it('filters by type MCP_SERVER', () => {
    const result = getTools({ type: 'mcp' });
    expect(result.every((t) => t.type === 'MCP_SERVER')).toBe(true);
  });

  it('filters by type SKILL', () => {
    const result = getTools({ type: 'skill' });
    expect(result.every((t) => t.type === 'SKILL')).toBe(true);
  });

  it('filters by platform', () => {
    const result = getTools({ platform: 'cursor' });
    expect(result.every((t) => t.platforms.some((p) => p.slug === 'cursor'))).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('filters by category', () => {
    const result = getTools({ category: 'database' });
    expect(result.every((t) => t.categories.some((c) => c.slug === 'database'))).toBe(true);
  });

  it('filters by query', () => {
    const result = getTools({ query: 'search' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((t) => t.name.toLowerCase().includes('search'))).toBe(true);
  });

  it('sorts by stars descending', () => {
    const result = getTools({ sort: 'stars' });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].stars).toBeGreaterThanOrEqual(result[i].stars);
    }
  });

  it('sorts by rating descending', () => {
    const result = getTools({ sort: 'rating' });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].avgRating).toBeGreaterThanOrEqual(result[i].avgRating);
    }
  });

  it('sorts by name alphabetically', () => {
    const result = getTools({ sort: 'name' });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
    }
  });

  it('returns empty for non-matching query', () => {
    const result = getTools({ query: 'zzzznonexistent' });
    expect(result).toEqual([]);
  });
});

describe('getToolBySlug', () => {
  it('returns tool by slug', () => {
    const tool = getToolBySlug('filesystem-mcp');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Filesystem MCP Server');
  });

  it('returns undefined for non-existent slug', () => {
    expect(getToolBySlug('non-existent')).toBeUndefined();
  });
});

describe('getFeaturedTools', () => {
  it('returns only featured tools', () => {
    const result = getFeaturedTools();
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.isFeatured)).toBe(true);
  });
});

describe('getTrendingTools', () => {
  it('returns up to 6 tools', () => {
    const result = getTrendingTools();
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it('returns tools sorted by lastCommitAt', () => {
    const result = getTrendingTools();
    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1].lastCommitAt || result[i - 1].updatedAt).getTime();
      const curr = new Date(result[i].lastCommitAt || result[i].updatedAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});
