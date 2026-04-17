/**
 * Tests for skills.sh scraper module.
 *
 * Tests the following:
 * 1. searchSkillsSh() - API call to /api/search
 * 2. fetchAllSkillsSh() - enumerate skills via multiple search queries + dedup
 * 3. runSkillsShDiscovery() - full pipeline: fetch → deduplicate → create PENDING (fast, no GitHub)
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    tool: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    submission: {
      findMany: jest.fn(),
    },
    skillSyncState: {
      upsert: jest.fn().mockResolvedValue({ id: 'default' }),
      update: jest.fn().mockResolvedValue({ id: 'default' }),
    },
  },
}));

import { prisma } from '@/lib/db';
import {
  searchSkillsSh,
  fetchAllSkillsSh,
  runSkillsShDiscovery,
} from '@/lib/skills-sh-scraper';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Sample skills.sh API response
const mockSkillSearchResponse = {
  query: 'react',
  searchType: 'fuzzy',
  skills: [
    {
      id: 'vercel-labs/agent-skills/vercel-react-best-practices',
      skillId: 'vercel-react-best-practices',
      name: 'vercel-react-best-practices',
      installs: 320135,
      source: 'vercel-labs/agent-skills',
    },
    {
      id: 'some-dev/awesome-mcp/react-mcp-server',
      skillId: 'react-mcp-server',
      name: 'react-mcp-server',
      installs: 5000,
      source: 'some-dev/awesome-mcp',
    },
  ],
  count: 2,
  duration_ms: 50,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

describe('searchSkillsSh', () => {
  it('should call the skills.sh search API with correct params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSkillSearchResponse,
    });

    const results = await searchSkillsSh('react', 10);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://skills.sh/api/search?q=react&limit=10',
    );
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: 'vercel-labs/agent-skills/vercel-react-best-practices',
      skillId: 'vercel-react-best-practices',
      name: 'vercel-react-best-practices',
      installs: 320135,
      source: 'vercel-labs/agent-skills',
    });
  });

  it('should return empty array on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const results = await searchSkillsSh('react', 10);
    expect(results).toEqual([]);
  });

  it('should return empty array on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const results = await searchSkillsSh('react', 10);
    expect(results).toEqual([]);
  });
});

describe('fetchAllSkillsSh', () => {
  it('should search with multiple queries and deduplicate results', async () => {
    const response1 = {
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/repo-a/skill-a',
            skillId: 'skill-a',
            name: 'skill-a',
            installs: 1000,
            source: 'owner/repo-a',
          },
          {
            id: 'owner/repo-b/skill-b',
            skillId: 'skill-b',
            name: 'skill-b',
            installs: 500,
            source: 'owner/repo-b',
          },
        ],
      }),
    };

    const response2 = {
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/repo-a/skill-a',
            skillId: 'skill-a',
            name: 'skill-a',
            installs: 1000,
            source: 'owner/repo-a',
          },
          {
            id: 'owner/repo-c/skill-c',
            skillId: 'skill-c',
            name: 'skill-c',
            installs: 200,
            source: 'owner/repo-c',
          },
        ],
      }),
    };

    mockFetch
      .mockResolvedValueOnce(response1)
      .mockResolvedValueOnce(response2);

    const results = await fetchAllSkillsSh();

    expect(results).toHaveLength(3);
    const ids = results.map((s) => s.id);
    expect(ids).toContain('owner/repo-a/skill-a');
    expect(ids).toContain('owner/repo-b/skill-b');
    expect(ids).toContain('owner/repo-c/skill-c');
  });

  it('should sort results by installs descending', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          { id: 'a/b/c', skillId: 'c', name: 'c', installs: 100, source: 'a/b' },
          { id: 'd/e/f', skillId: 'f', name: 'f', installs: 5000, source: 'd/e' },
        ],
      }),
    });

    const results = await fetchAllSkillsSh();
    expect(results[0].installs).toBeGreaterThanOrEqual(results[results.length - 1].installs);
  });
});

describe('runSkillsShDiscovery', () => {
  it('should create one tool per skill (not per repo)', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

    // Two skills from the same repo
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/repo-x/skill-x1',
            skillId: 'skill-x1',
            name: 'skill-x1',
            installs: 2000,
            source: 'owner/repo-x',
          },
          {
            id: 'owner/repo-x/skill-x2',
            skillId: 'skill-x2',
            name: 'skill-x2',
            installs: 1000,
            source: 'owner/repo-x',
          },
        ],
      }),
    });

    const result = await runSkillsShDiscovery();

    // Both skills should be created (one per skill, not one per repo)
    expect(result.created).toBeGreaterThanOrEqual(2);
  });

  it('should create tools with type=SKILL and status=PENDING', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/repo-x/skill-x',
            skillId: 'skill-x',
            name: 'skill-x',
            installs: 2000,
            source: 'owner/repo-x',
          },
        ],
      }),
    });

    await runSkillsShDiscovery();

    expect(mockPrisma.tool.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'SKILL',
          status: 'PENDING',
        }),
      }),
    );
  });

  it('should skip tools whose slug already exists', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([
      { slug: 'skill-owner-repo-x-skill-x' },
    ]);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/repo-x/skill-x',
            skillId: 'skill-x',
            name: 'skill-x',
            installs: 2000,
            source: 'owner/repo-x',
          },
        ],
      }),
    });

    const result = await runSkillsShDiscovery();

    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.created).toBe(0);
  });

  it('should generate unique slugs per skill', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/repo/skill-a',
            skillId: 'skill-a',
            name: 'skill-a',
            installs: 100,
            source: 'owner/repo',
          },
          {
            id: 'owner/repo/skill-b',
            skillId: 'skill-b',
            name: 'skill-b',
            installs: 50,
            source: 'owner/repo',
          },
        ],
      }),
    });

    await runSkillsShDiscovery();

    const createCalls = (mockPrisma.tool.create as jest.Mock).mock.calls;
    const slugs = createCalls.map((c: any) => c[0].data.slug);
    expect(slugs).toContain('skill-owner-repo-skill-a');
    expect(slugs).toContain('skill-owner-repo-skill-b');
    // All slugs should be unique
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('should update SkillSyncState after discovery', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/repo/skill',
            skillId: 'skill',
            name: 'skill',
            installs: 100,
            source: 'owner/repo',
          },
        ],
      }),
    });

    await runSkillsShDiscovery();

    expect(mockPrisma.skillSyncState.upsert).toHaveBeenCalled();
  });

  it('should use installs for scoring', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/popular/popular-skill',
            skillId: 'popular-skill',
            name: 'popular-skill',
            installs: 50000,
            source: 'owner/popular',
          },
        ],
      }),
    });

    await runSkillsShDiscovery();

    const createCall = (mockPrisma.tool.create as jest.Mock).mock.calls[0][0];
    // High installs should produce a reasonable score
    expect(createCall.data.score).toBeGreaterThan(0);
    // Score based on log10(50000) * 15 ≈ 71
    expect(createCall.data.score).toBeLessThanOrEqual(100);
  });
});
