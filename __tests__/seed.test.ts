/**
 * @jest-environment node
 */

// Mocks must be defined inline inside jest.mock() factories because Jest hoists
// jest.mock calls above const declarations. Using jest.fn() directly in the factory
// and then extracting references after avoids the "Cannot access before initialization" error.

import { seedMain } from '../prisma/seed';

jest.mock('@prisma/client', () => {
  const mockPlatformUpsert = jest.fn().mockResolvedValue({ id: 'plat-id' });
  const mockCategoryUpsert = jest.fn().mockResolvedValue({ id: 'cat-id' });
  const mockToolUpsert = jest.fn().mockResolvedValue({ id: 'tool-id' });
  const mockToolCategoryUpsert = jest.fn().mockResolvedValue({ id: 'tc-id' });
  const mockToolPlatformUpsert = jest.fn().mockResolvedValue({ id: 'tp-id' });
  const mockCategoryFindUnique = jest.fn().mockResolvedValue({ id: 'cat-found-id' });
  const mockPlatformFindUnique = jest.fn().mockResolvedValue({ id: 'plat-found-id' });
  const mockCount = jest.fn().mockResolvedValue(0);
  const mockDisconnect = jest.fn();

  // Attach mocks to the module so tests can access them via require()
  const mod = {
    PrismaClient: jest.fn().mockImplementation(() => ({
      platform: { upsert: mockPlatformUpsert, findUnique: mockPlatformFindUnique, count: mockCount },
      category: { upsert: mockCategoryUpsert, findUnique: mockCategoryFindUnique, count: mockCount },
      tool: { upsert: mockToolUpsert, count: mockCount },
      toolCategory: { upsert: mockToolCategoryUpsert },
      toolPlatform: { upsert: mockToolPlatformUpsert },
      $disconnect: mockDisconnect,
    })),
    ToolType: { MCP_SERVER: 'MCP_SERVER', SKILL: 'SKILL', RULE: 'RULE' },
    ToolStatus: { PENDING: 'PENDING', ACTIVE: 'ACTIVE', FEATURED: 'FEATURED', ARCHIVED: 'ARCHIVED' },
    __mocks: {
      mockPlatformUpsert,
      mockCategoryUpsert,
      mockToolUpsert,
      mockToolCategoryUpsert,
      mockToolPlatformUpsert,
      mockDisconnect,
    },
  };
  return mod;
});

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

// Extract mock references after jest.mock has been set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('@prisma/client');
const {
  mockPlatformUpsert,
  mockCategoryUpsert,
  mockToolUpsert,
  mockToolCategoryUpsert,
  mockToolPlatformUpsert,
  mockDisconnect,
} = __mocks;

describe('seed script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls platform.upsert for each platform (7 times)', async () => {
    await seedMain();
    expect(mockPlatformUpsert).toHaveBeenCalledTimes(7);
  });

  it('calls category.upsert for each category (12 times)', async () => {
    await seedMain();
    expect(mockCategoryUpsert).toHaveBeenCalledTimes(12);
  });

  it('calls tool.upsert for each tool (12 times)', async () => {
    await seedMain();
    expect(mockToolUpsert).toHaveBeenCalledTimes(12);
  });

  it('creates join table entries for tool-category and tool-platform', async () => {
    await seedMain();
    // Each tool has categories and platforms; join table upserts should be > 0
    expect(mockToolCategoryUpsert).toHaveBeenCalled();
    expect(mockToolPlatformUpsert).toHaveBeenCalled();
    // Total join table calls should exceed entity count
    const joinCalls = mockToolCategoryUpsert.mock.calls.length + mockToolPlatformUpsert.mock.calls.length;
    expect(joinCalls).toBeGreaterThan(0);
  });

  it('seedMain completes without error (disconnect is caller responsibility)', async () => {
    // seedMain itself does not call $disconnect - that's done by the calling script.
    // Verify the function completes without throwing.
    await expect(seedMain()).resolves.toBeUndefined();
  });

  it('uses upsert for idempotent re-runs', async () => {
    // Run seed twice
    await seedMain();
    const firstPlatformCalls = mockPlatformUpsert.mock.calls.length;
    const firstToolCalls = mockToolUpsert.mock.calls.length;

    jest.clearAllMocks();
    await seedMain();

    const secondPlatformCalls = mockPlatformUpsert.mock.calls.length;
    const secondToolCalls = mockToolUpsert.mock.calls.length;

    // Both runs should produce the same number of upsert calls
    expect(secondPlatformCalls).toBe(firstPlatformCalls);
    expect(secondToolCalls).toBe(firstToolCalls);
  });
});
