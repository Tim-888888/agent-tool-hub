/**
 * @jest-environment node
 */
import { GET } from '@/app/api/categories/route';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
    },
  },
}));

const mockFindMany = prisma.category.findMany as jest.Mock;

describe('GET /api/categories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all categories ordered by order field', async () => {
    const mockCategories = [
      { id: 'cat-1', slug: 'database', nameEn: 'Database', nameZh: '数据库', icon: 'Database', descriptionEn: 'Connect to databases', descriptionZh: '连接数据库', order: 1, _count: { tools: 3 } },
      { id: 'cat-2', slug: 'development', nameEn: 'Development', nameZh: '开发工具', icon: 'Wrench', descriptionEn: 'Developer tools', descriptionZh: '开发者工具', order: 2, _count: { tools: 5 } },
    ];
    mockFindMany.mockResolvedValue(mockCategories);

    const request = new Request('http://localhost:3000/api/categories');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].slug).toBe('database');
    expect(body.data[1].slug).toBe('development');

    // Verify ordering
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { order: 'asc' },
      }),
    );
  });

  it('includes tool count for each category', async () => {
    const mockCategories = [
      { id: 'cat-1', slug: 'database', nameEn: 'Database', nameZh: '数据库', icon: 'Database', descriptionEn: 'Database tools', descriptionZh: '数据库工具', order: 1, _count: { tools: 3 } },
    ];
    mockFindMany.mockResolvedValue(mockCategories);

    const request = new Request('http://localhost:3000/api/categories');
    const response = await GET(request);
    const body = await response.json();

    expect(body.data[0].toolCount).toBe(3);
    // _count should not be exposed in the response
    expect(body.data[0]._count).toBeUndefined();
  });

  it('handles database error', async () => {
    mockFindMany.mockRejectedValue(new Error('DB connection failed'));

    const request = new Request('http://localhost:3000/api/categories');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to fetch categories');
  });
});
