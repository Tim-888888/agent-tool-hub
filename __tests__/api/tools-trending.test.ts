/**
 * @jest-environment node
 */
import { GET as getTrending } from '@/app/api/tools/trending/route';
import { GET as getNewest } from '@/app/api/tools/newest/route';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    tool: {
      findMany: jest.fn(),
    },
  },
}));

const mockFindMany = prisma.tool.findMany as jest.Mock;

function makeMockTool(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `tool-${slug}`,
    slug,
    name: `Tool ${slug}`,
    description: `Description for ${slug}`,
    descriptionZh: null,
    type: 'MCP_SERVER',
    status: 'ACTIVE',
    repoUrl: 'https://github.com/example/' + slug,
    homepageUrl: null,
    npmPackage: null,
    pypiPackage: null,
    stars: 1000,
    forks: 50,
    openIssues: 5,
    language: 'TypeScript',
    license: 'MIT',
    lastCommitAt: new Date('2026-03-28T00:00:00Z'),
    author: 'Test',
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
    categories: [],
    platforms: [],
    ...overrides,
  };
}

describe('GET /api/tools/trending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tools sorted by lastCommitAt desc', async () => {
    mockFindMany.mockResolvedValue([makeMockTool('tool-a'), makeMockTool('tool-b')]);

    const response = await getTrending();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { lastCommitAt: 'desc' },
      }),
    );
  });

  it('limits results to 6', async () => {
    mockFindMany.mockResolvedValue([]);

    await getTrending();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 6,
      }),
    );
  });

  it('only returns ACTIVE and FEATURED tools', async () => {
    mockFindMany.mockResolvedValue([]);

    await getTrending();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ['ACTIVE', 'FEATURED'] } },
      }),
    );
  });
});

describe('GET /api/tools/newest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tools sorted by createdAt desc', async () => {
    mockFindMany.mockResolvedValue([makeMockTool('tool-x'), makeMockTool('tool-y')]);

    const response = await getNewest();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('limits results to 6', async () => {
    mockFindMany.mockResolvedValue([]);

    await getNewest();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 6,
      }),
    );
  });

  it('only returns ACTIVE and FEATURED tools', async () => {
    mockFindMany.mockResolvedValue([]);

    await getNewest();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ['ACTIVE', 'FEATURED'] } },
      }),
    );
  });
});
