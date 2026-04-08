/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/tools/route';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    tool: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockFindMany = prisma.tool.findMany as jest.Mock;
const mockCount = prisma.tool.count as jest.Mock;

// Helper to build a mock tool with Prisma join-table shape
function makeMockTool(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tool-1',
    slug: 'test-tool',
    name: 'Test Tool',
    description: 'A test tool',
    descriptionZh: null,
    type: 'MCP_SERVER',
    status: 'ACTIVE',
    repoUrl: 'https://github.com/example/test',
    homepageUrl: null,
    npmPackage: null,
    pypiPackage: null,
    stars: 1000,
    forks: 50,
    openIssues: 5,
    language: 'TypeScript',
    license: 'MIT',
    lastCommitAt: new Date('2026-03-28T00:00:00Z'),
    author: 'Test Author',
    version: '1.0.0',
    tags: ['test'],
    transports: ['stdio'],
    isFeatured: false,
    featuresZh: [],
    featuresEn: [],
    installGuide: null,
    screenshots: [],
    avgRating: 4.5,
    ratingCount: 10,
    categories: [
      {
        toolId: 'tool-1',
        categoryId: 'cat-1',
        category: { id: 'cat-1', slug: 'database', nameEn: 'Database', nameZh: '数据库', icon: 'Database', descriptionEn: 'Database tools', descriptionZh: '数据库工具', order: 1 },
      },
    ],
    platforms: [
      {
        toolId: 'tool-1',
        platformId: 'plat-1',
        platform: { id: 'plat-1', slug: 'claude-code', name: 'Claude Code', icon: 'Bot', configKey: 'claude-code' },
      },
    ],
    ...overrides,
  };
}

describe('GET /api/tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated tools with success/meta structure', async () => {
    const mockTools = [makeMockTool()];
    mockFindMany.mockResolvedValue(mockTools);
    mockCount.mockResolvedValue(1);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools'));
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('applies default pagination (page=1, limit=20)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools'));
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      }),
    );
  });

  it('respects custom page and limit params', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(50);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools?page=3&limit=10'));
    const response = await GET(request);
    const body = await response.json();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
    expect(body.meta.page).toBe(3);
    expect(body.meta.limit).toBe(10);
    expect(body.meta.totalPages).toBe(5);
  });

  it('filters by type query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools?type=mcp'));
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ type: 'MCP_SERVER' }),
          ]),
        }),
      }),
    );
  });

  it('filters by platform query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools?platform=claude-code'));
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { platforms: { some: { platform: { slug: 'claude-code' } } } },
          ]),
        }),
      }),
    );
  });

  it('filters by category query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools?category=database'));
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { categories: { some: { category: { slug: 'database' } } } },
          ]),
        }),
      }),
    );
  });

  it('filters by search query (q param)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools?q=filesystem'));
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: expect.arrayContaining([
                { name: { contains: 'filesystem', mode: 'insensitive' } },
              ]),
            },
          ]),
        }),
      }),
    );
  });

  it('sorts by score (default)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools'));
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { score: 'desc' },
      }),
    );
  });

  it('sorts by recent (lastCommitAt)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools?sort=recent'));
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { lastCommitAt: 'desc' },
      }),
    );
  });

  it('sorts by rating', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools?sort=rating'));
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { avgRating: 'desc' },
      }),
    );
  });

  it('sorts by name', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools?sort=name'));
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
      }),
    );
  });

  it('returns 500 on database error', async () => {
    mockFindMany.mockRejectedValue(new Error('DB connection failed'));
    mockCount.mockRejectedValue(new Error('DB connection failed'));

    const request = new NextRequest(new URL('http://localhost:3000/api/tools'));
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to fetch tools');
  });

  it('flattens categories and platforms via mapToolResponse', async () => {
    mockFindMany.mockResolvedValue([makeMockTool()]);
    mockCount.mockResolvedValue(1);

    const request = new NextRequest(new URL('http://localhost:3000/api/tools'));
    const response = await GET(request);
    const body = await response.json();

    const tool = body.data[0];
    // Categories should be flattened (not contain toolId/categoryId wrappers)
    expect(tool.categories).toEqual([
      { id: 'cat-1', slug: 'database', nameEn: 'Database', nameZh: '数据库', icon: 'Database', descriptionEn: 'Database tools', descriptionZh: '数据库工具', order: 1 },
    ]);
    // Platforms should be flattened
    expect(tool.platforms).toEqual([
      { id: 'plat-1', slug: 'claude-code', name: 'Claude Code', icon: 'Bot', configKey: 'claude-code' },
    ]);
  });
});
