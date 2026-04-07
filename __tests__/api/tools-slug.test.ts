/**
 * @jest-environment node
 */
import { GET } from '@/app/api/tools/[slug]/route';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    tool: {
      findUnique: jest.fn(),
    },
  },
}));

const mockFindUnique = prisma.tool.findUnique as jest.Mock;

function makeMockTool(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tool-1',
    slug: 'filesystem-mcp',
    name: 'Filesystem MCP Server',
    description: 'Secure file system operations.',
    descriptionZh: '安全的文件系统操作。',
    type: 'MCP_SERVER',
    status: 'FEATURED',
    repoUrl: 'https://github.com/example/filesystem',
    homepageUrl: null,
    npmPackage: '@modelcontextprotocol/server-filesystem',
    pypiPackage: null,
    stars: 83090,
    forks: 12000,
    openIssues: 156,
    language: 'TypeScript',
    license: 'MIT',
    lastCommitAt: new Date('2026-03-28T00:00:00Z'),
    author: 'Anthropic',
    version: '1.0.0',
    tags: ['filesystem', 'files'],
    transports: ['stdio'],
    isFeatured: true,
    featuresZh: ['安全的文件读写操作'],
    featuresEn: ['Secure file read/write operations'],
    installGuide: null,
    screenshots: [],
    avgRating: 4.8,
    ratingCount: 342,
    categories: [
      {
        toolId: 'tool-1',
        categoryId: 'cat-1',
        category: { id: 'cat-1', slug: 'filesystem', nameEn: 'File System', nameZh: '文件系统', icon: 'FolderOpen', descriptionEn: 'File management', descriptionZh: '文件管理', order: 4 },
      },
    ],
    platforms: [
      {
        toolId: 'tool-1',
        platformId: 'plat-1',
        platform: { id: 'plat-1', slug: 'claude-code', name: 'Claude Code', icon: 'Bot', configKey: 'claude-code' },
      },
      {
        toolId: 'tool-1',
        platformId: 'plat-2',
        platform: { id: 'plat-2', slug: 'cursor', name: 'Cursor', icon: 'MousePointer', configKey: 'cursor' },
      },
    ],
    ...overrides,
  };
}

describe('GET /api/tools/[slug]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tool detail for valid slug', async () => {
    mockFindUnique.mockResolvedValue(makeMockTool());

    const request = new Request('http://localhost:3000/api/tools/filesystem-mcp');
    const response = await GET(request, { params: Promise.resolve({ slug: 'filesystem-mcp' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe('filesystem-mcp');
    expect(body.data.name).toBe('Filesystem MCP Server');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { slug: 'filesystem-mcp' },
      include: expect.any(Object),
    });
  });

  it('returns 404 for non-existent slug', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/tools/nonexistent');
    const response = await GET(request, { params: Promise.resolve({ slug: 'nonexistent' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Tool not found');
  });

  it('includes flattened categories and platforms in response', async () => {
    mockFindUnique.mockResolvedValue(makeMockTool());

    const request = new Request('http://localhost:3000/api/tools/filesystem-mcp');
    const response = await GET(request, { params: Promise.resolve({ slug: 'filesystem-mcp' }) });
    const body = await response.json();

    // Categories should be flattened objects, not join-table wrappers
    expect(body.data.categories).toEqual([
      { id: 'cat-1', slug: 'filesystem', nameEn: 'File System', nameZh: '文件系统', icon: 'FolderOpen', descriptionEn: 'File management', descriptionZh: '文件管理', order: 4 },
    ]);

    // Platforms should be flattened objects
    expect(body.data.platforms).toEqual([
      { id: 'plat-1', slug: 'claude-code', name: 'Claude Code', icon: 'Bot', configKey: 'claude-code' },
      { id: 'plat-2', slug: 'cursor', name: 'Cursor', icon: 'MousePointer', configKey: 'cursor' },
    ]);
  });

  it('handles database error gracefully', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB connection failed'));

    const request = new Request('http://localhost:3000/api/tools/test-tool');
    const response = await GET(request, { params: Promise.resolve({ slug: 'test-tool' }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to fetch tool');
  });
});
