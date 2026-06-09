/**
 * Tests for skills.sh scraper module.
 * Tests D1-compatible insert pipeline.
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    tool: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    skillSyncState: {
      upsert: jest.fn().mockResolvedValue({ id: 'default' }),
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

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

describe('searchSkillsSh', () => {
  it('should call the skills.sh search API with correct params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        skills: [
          { id: 'a/b/c', skillId: 'c', name: 'c', installs: 100, source: 'a/b' },
        ],
      }),
    });

    const results = await searchSkillsSh('test', 10);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://skills.sh/api/search?q=test&limit=10',
    );
    expect(results).toHaveLength(1);
  });

  it('should return empty array on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' });
    const results = await searchSkillsSh('test', 10);
    expect(results).toEqual([]);
  });

  it('should return empty array on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const results = await searchSkillsSh('test', 10);
    expect(results).toEqual([]);
  });
});

describe('fetchAllSkillsSh', () => {
  it('should deduplicate results by id', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          skills: [
            { id: 'a/b/c', skillId: 'c', name: 'c', installs: 100, source: 'a/b' },
            { id: 'd/e/f', skillId: 'f', name: 'f', installs: 50, source: 'd/e' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          skills: [
            { id: 'a/b/c', skillId: 'c', name: 'c', installs: 100, source: 'a/b' },
            { id: 'g/h/i', skillId: 'i', name: 'i', installs: 200, source: 'g/h' },
          ],
        }),
      });

    const results = await fetchAllSkillsSh();
    expect(results).toHaveLength(3);
  });

  it('should sort by installs descending', async () => {
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
  it('should insert discovered skills', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({});

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          { id: 'owner/repo/skill-a', skillId: 'skill-a', name: 'skill-a', installs: 2000, source: 'owner/repo' },
          { id: 'owner/repo/skill-b', skillId: 'skill-b', name: 'skill-b', installs: 1000, source: 'owner/repo' },
        ],
      }),
    });

    const result = await runSkillsShDiscovery();

    expect(mockPrisma.tool.create).toHaveBeenCalled();
    expect(result.created).toBeGreaterThanOrEqual(1);
  });

  it('should create tools with type=SKILL and status=PENDING', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({});

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          { id: 'owner/repo-x/skill-x', skillId: 'skill-x', name: 'skill-x', installs: 2000, source: 'owner/repo-x' },
        ],
      }),
    });

    await runSkillsShDiscovery();

    const call = (mockPrisma.tool.create as jest.Mock).mock.calls[0][0];
    const tool = call.data;
    expect(tool.type).toBe('SKILL');
    expect(tool.status).toBe('PENDING');
  });

  it('should skip tools whose slug already exists', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([
      { slug: 'skill-owner-repo-x-skill-x' },
    ]);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          { id: 'owner/repo-x/skill-x', skillId: 'skill-x', name: 'skill-x', installs: 2000, source: 'owner/repo-x' },
        ],
      }),
    });

    const result = await runSkillsShDiscovery();

    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.created).toBe(0);
    expect(mockPrisma.tool.create).not.toHaveBeenCalled();
  });

  it('should update SkillSyncState after discovery', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({});

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          { id: 'owner/repo/skill', skillId: 'skill', name: 'skill', installs: 100, source: 'owner/repo' },
        ],
      }),
    });

    await runSkillsShDiscovery();
    expect(mockPrisma.skillSyncState.upsert).toHaveBeenCalled();
  });

  it('should generate unique slugs per skill from same repo', async () => {
    (mockPrisma.tool.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.tool.create as jest.Mock).mockResolvedValue({});

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        skills: [
          { id: 'owner/repo/skill-a', skillId: 'skill-a', name: 'skill-a', installs: 100, source: 'owner/repo' },
          { id: 'owner/repo/skill-b', skillId: 'skill-b', name: 'skill-b', installs: 50, source: 'owner/repo' },
        ],
      }),
    });

    await runSkillsShDiscovery();

    const slugs = (mockPrisma.tool.create as jest.Mock).mock.calls.map((call) => call[0].data.slug);
    expect(slugs).toContain('skill-owner-repo-skill-a');
    expect(slugs).toContain('skill-owner-repo-skill-b');
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
