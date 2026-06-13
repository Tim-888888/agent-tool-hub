import { TOOLS, CATEGORIES, PLATFORMS } from '@/lib/mock-data';

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

describe('mock data entries', () => {
  it('can find tools by slug in the exported constants', () => {
    const tool = TOOLS.find((entry) => entry.slug === 'filesystem-mcp');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Filesystem MCP');
  });

  it('includes all supported tool types', () => {
    const types = new Set(TOOLS.map((tool) => tool.type));
    expect(types.has('MCP_SERVER')).toBe(true);
    expect(types.has('SKILL')).toBe(true);
    expect(types.has('RULE')).toBe(true);
  });
});
