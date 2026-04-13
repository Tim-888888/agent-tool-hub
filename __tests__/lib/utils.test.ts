import { cn, formatStars, slugify, formatDate, getToolTypeColor, getPlatformColor } from '@/lib/utils';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', undefined, null, false, 'b')).toBe('a b');
  });

  it('returns empty string for all falsy', () => {
    expect(cn(undefined, null, false)).toBe('');
  });
});

describe('formatStars', () => {
  it('formats thousands with k suffix', () => {
    expect(formatStars(1000)).toBe('1.0k');
    expect(formatStars(1500)).toBe('1.5k');
    expect(formatStars(83090)).toBe('83.1k');
  });

  it('returns number as string for under 1000', () => {
    expect(formatStars(0)).toBe('0');
    expect(formatStars(42)).toBe('42');
    expect(formatStars(999)).toBe('999');
  });
});

describe('slugify', () => {
  it('converts to lowercase with hyphens', () => {
    expect(slugify('Brave Search MCP')).toBe('brave-search-mcp');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('--test--')).toBe('test');
  });
});

describe('formatDate', () => {
  it('returns N/A for null', () => {
    expect(formatDate(null)).toBe('N/A');
  });

  it('formats valid date string', () => {
    const result = formatDate('2026-03-28T00:00:00Z');
    expect(result).toContain('2026');
    expect(result).toContain('Mar');
  });
});

describe('getToolTypeColor', () => {
  it('returns correct color for each type', () => {
    expect(getToolTypeColor('MCP_SERVER')).toBe('var(--color-mcp)');
    expect(getToolTypeColor('SKILL')).toBe('var(--color-skill)');
    expect(getToolTypeColor('RULE')).toBe('var(--color-rule)');
  });

  it('returns default for unknown type', () => {
    expect(getToolTypeColor('UNKNOWN')).toBe('var(--text-secondary)');
  });
});

describe('getPlatformColor', () => {
  it('returns correct color for known platforms', () => {
    expect(getPlatformColor('claude-code')).toBe('var(--color-claude)');
    expect(getPlatformColor('cursor')).toBe('var(--color-cursor)');
    expect(getPlatformColor('cline')).toBe('var(--color-cline)');
  });

  it('returns default for unknown platform', () => {
    expect(getPlatformColor('unknown')).toBe('var(--text-secondary)');
  });
});
