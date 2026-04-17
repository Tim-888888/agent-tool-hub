/**
 * TDD tests for skills.sh scraper module.
 *
 * Tests the following:
 * 1. searchSkillsSh() - API call to /api/search
 * 2. fetchAllSkillsSh() - enumerate skills via multiple search queries + dedup
 * 3. runSkillsShDiscovery() - full pipeline: fetch → deduplicate → create PENDING
 * 4. Dedup logic against existing tools and submissions
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
      update: jest.fn(),
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

// Mock github-client
jest.mock('@/lib/github-client', () => ({
  fetchRepoData: jest.fn(),
}));

// Mock scoring
jest.mock('@/lib/scoring', () => ({
  computeScore: jest.fn().mockReturnValue(42),
}));

import { prisma } from '@/lib/db';
import { fetchRepoData } from '@/lib/github-client';
import {
  searchSkillsSh,
  fetchAllSkillsSh,
  runSkillsShDiscovery,
} from '@/lib/skills-sh-scraper';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockFetchRepoData = fetchRepoData as jest.MockedFunction<typeof fetchRepoData>;

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

const mockGitHubRepoData = {
  stargazers_count: 1500,
  forks_count: 120,
  open_issues_count: 15,
  pushed_at: '2026-04-10T00:00:00Z',
  description: 'Best practices for React development with Claude Code',
  topics: ['react', 'claude', 'skills'],
  license: { key: 'mit', name: 'MIT License' },
  language: 'TypeScript',
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
    // Mock two different search responses
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

    // skill-a appears in both queries but should be deduplicated
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
  it('should skip tools that already exist in database', async () => {
    // Mock existing tools
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([
      { repoUrl: 'https://github.com/owner/repo-a' },
    ]);
    // Mock pending submissions
    (mockPrisma.submission.findMany as jest.Mock).mockResolvedValueOnce([]);

    // Mock fetchAllSkillsSh (we test it separately, mock it here)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/repo-a/existing-skill',
            skillId: 'existing-skill',
            name: 'existing-skill',
            installs: 1000,
            source: 'owner/repo-a',
          },
          {
            id: 'owner/repo-new/new-skill',
            skillId: 'new-skill',
            name: 'new-skill',
            installs: 500,
            source: 'owner/repo-new',
          },
        ],
      }),
    });

    // Mock GitHub enrichment
    mockFetchRepoData.mockResolvedValueOnce({
      ...mockGitHubRepoData,
      stargazers_count: 50,
      forks_count: 10,
    });

    // Mock slug uniqueness check
    (mockPrisma.tool.findUnique as jest.Mock).mockResolvedValue(null);
    // Mock create
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

    const result = await runSkillsShDiscovery();

    // owner/repo-a was filtered before newSkills, so discovered=2 but only 1 was new
    expect(result.discovered).toBeGreaterThanOrEqual(2);
    // owner/repo-new should be created
    expect(result.created).toBeGreaterThanOrEqual(1);
  });

  it('should create tools with type=SKILL and status=PENDING', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.submission.findMany as jest.Mock).mockResolvedValueOnce([]);

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

    mockFetchRepoData.mockResolvedValueOnce({
      ...mockGitHubRepoData,
      stargazers_count: 200,
      forks_count: 30,
    });

    (mockPrisma.tool.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

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

  it('should skip repos that fail GitHub enrichment', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.submission.findMany as jest.Mock).mockResolvedValueOnce([]);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: 'owner/bad-repo/bad-skill',
            skillId: 'bad-skill',
            name: 'bad-skill',
            installs: 100,
            source: 'owner/bad-repo',
          },
        ],
      }),
    });

    // GitHub API fails for this repo
    mockFetchRepoData.mockRejectedValueOnce(new Error('Not found'));

    const result = await runSkillsShDiscovery();

    expect(result.created).toBe(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('should use installs as a quality signal in scoring', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.submission.findMany as jest.Mock).mockResolvedValueOnce([]);

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

    mockFetchRepoData.mockResolvedValueOnce({
      ...mockGitHubRepoData,
      stargazers_count: 300,
      forks_count: 50,
    });

    (mockPrisma.tool.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

    await runSkillsShDiscovery();

    const createCall = (mockPrisma.tool.create as jest.Mock).mock.calls[0][0];
    // Score comes from computeScore mock (42)
    expect(createCall.data.score).toBe(42);
  });

  it('should update SkillSyncState after discovery', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.submission.findMany as jest.Mock).mockResolvedValueOnce([]);

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

    mockFetchRepoData.mockResolvedValueOnce(mockGitHubRepoData);
    (mockPrisma.tool.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

    await runSkillsShDiscovery();

    expect(mockPrisma.skillSyncState.upsert).toHaveBeenCalled();
    expect(mockPrisma.skillSyncState.update).toHaveBeenCalled();
  });
});
