/**
 * @jest-environment node
 */
import { translateToolToChinese } from "@/lib/translate"
import { prisma } from "@/lib/db"

jest.mock("@/lib/db", () => ({
  prisma: {
    translationCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

const mockFindUnique = prisma.translationCache.findUnique as jest.Mock
const mockUpsert = prisma.translationCache.upsert as jest.Mock

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe("translateToolToChinese cache layer", () => {
  const originalEnv = process.env.GLM_API_KEY

  beforeEach(() => {
    mockFetch.mockReset()
    mockFindUnique.mockReset()
    mockUpsert.mockReset()
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GLM_API_KEY = originalEnv
    } else {
      delete process.env.GLM_API_KEY
    }
  })

  it("returns cached result when cache hit, without calling API", async () => {
    process.env.GLM_API_KEY = "test-key"

    mockFindUnique.mockResolvedValue({
      sourceHash: "abc12345",
      descriptionZh: "缓存的翻译",
      featuresZh: ["特性一", "特性二"],
    })

    const result = await translateToolToChinese("A powerful tool", [
      "Feature one",
      "Feature two",
    ])

    expect(result).toEqual({
      descriptionZh: "缓存的翻译",
      featuresZh: ["特性一", "特性二"],
    })

    // Should NOT call the API
    expect(mockFetch).not.toHaveBeenCalled()
    // Should NOT write to cache
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("calls API and writes to cache on cache miss", async () => {
    process.env.GLM_API_KEY = "test-key"

    // Cache miss
    mockFindUnique.mockResolvedValue(null)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"descriptionZh":"一个强大的工具","featuresZh":["特性一"]}',
            },
          },
        ],
      }),
    })

    const result = await translateToolToChinese("A powerful tool", [
      "Feature one",
    ])

    expect(result).toEqual({
      descriptionZh: "一个强大的工具",
      featuresZh: ["特性一"],
    })

    // Should call the API
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Should write to cache via upsert
    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const upsertArgs = mockUpsert.mock.calls[0][0]
    expect(upsertArgs.where.sourceHash).toBeDefined()
    expect(upsertArgs.create.descriptionZh).toBe("一个强大的工具")
    expect(upsertArgs.create.featuresZh).toEqual(["特性一"])
  })

  it("produces consistent hashes for same input (cache key stability)", async () => {
    process.env.GLM_API_KEY = "test-key"

    // Both calls use same input, first is cache miss, second is cache hit
    mockFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        sourceHash: "somehash",
        descriptionZh: "翻译",
        featuresZh: [],
      })

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: '{"descriptionZh":"翻译","featuresZh":[]}' } },
        ],
      }),
    })

    await translateToolToChinese("Same description", [])
    await translateToolToChinese("Same description", [])

    // Both calls should query cache with the same hash
    const hash1 = mockFindUnique.mock.calls[0][0].where.sourceHash
    const hash2 = mockFindUnique.mock.calls[1][0].where.sourceHash
    expect(hash1).toBe(hash2)
  })

  it("produces different hashes for different inputs", async () => {
    process.env.GLM_API_KEY = "test-key"

    mockFindUnique.mockResolvedValue(null)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: '{"descriptionZh":"x","featuresZh":[]}' } },
        ],
      }),
    })

    await translateToolToChinese("Description A", [])
    await translateToolToChinese("Description B", [])

    const hash1 = mockFindUnique.mock.calls[0][0].where.sourceHash
    const hash2 = mockFindUnique.mock.calls[1][0].where.sourceHash
    expect(hash1).not.toBe(hash2)
  })

  it("falls back to API when cache read throws", async () => {
    process.env.GLM_API_KEY = "test-key"

    // DB read fails
    mockFindUnique.mockRejectedValue(new Error("DB connection lost"))

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"descriptionZh":"回退翻译","featuresZh":[]}',
            },
          },
        ],
      }),
    })

    const result = await translateToolToChinese("Test description", [])

    expect(result).toEqual({
      descriptionZh: "回退翻译",
      featuresZh: [],
    })

    // API was called as fallback
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("cache write failure does not affect the result", async () => {
    process.env.GLM_API_KEY = "test-key"

    mockFindUnique.mockResolvedValue(null)
    mockUpsert.mockRejectedValue(new Error("Write failed"))

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"descriptionZh":"结果","featuresZh":["特性"]}',
            },
          },
        ],
      }),
    })

    const result = await translateToolToChinese("Test", ["Feature"])

    // Result is still returned even though cache write failed
    expect(result).toEqual({
      descriptionZh: "结果",
      featuresZh: ["特性"],
    })
  })
})
