/**
 * @jest-environment node
 */
import { GET } from "@/app/api/collections/route"
import { prisma } from "@/lib/db"

jest.mock("@/lib/db", () => ({
  prisma: {
    collection: {
      findMany: jest.fn(),
    },
  },
}))

const mockFindMany = prisma.collection.findMany as jest.Mock

describe("GET /api/collections", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns only published collections with tool counts", async () => {
    const mockCollections = [
      {
        id: "col-1",
        slug: "best-mcp-servers",
        titleEn: "Best MCP Servers",
        titleZh: "最佳 MCP 服务器",
        descriptionEn: "Top picks",
        descriptionZh: "精选推荐",
        icon: "Star",
        coverImage: null,
        isPublished: true,
        sortOrder: 1,
        _count: { tools: 5 },
      },
      {
        id: "col-2",
        slug: "ai-tools",
        titleEn: "AI Tools",
        titleZh: "AI 工具",
        descriptionEn: "AI-related tools",
        descriptionZh: "AI 相关工具",
        icon: "Sparkles",
        coverImage: "https://img.com/cover.jpg",
        isPublished: true,
        sortOrder: 2,
        _count: { tools: 3 },
      },
    ]

    mockFindMany.mockResolvedValue(mockCollections)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)

    expect(body.data[0]).toEqual({
      id: "col-1",
      slug: "best-mcp-servers",
      titleEn: "Best MCP Servers",
      titleZh: "最佳 MCP 服务器",
      descriptionEn: "Top picks",
      descriptionZh: "精选推荐",
      icon: "Star",
      coverImage: null,
      toolCount: 5,
    })
    expect(body.data[1].toolCount).toBe(3)

    // _count should not be exposed in the response
    expect(body.data[0]._count).toBeUndefined()
    expect(body.data[1]._count).toBeUndefined()
  })

  it("filters for published collections only", async () => {
    mockFindMany.mockResolvedValue([])

    await GET()

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true },
      }),
    )
  })

  it("orders by sortOrder ascending", async () => {
    mockFindMany.mockResolvedValue([])

    await GET()

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { sortOrder: "asc" },
      }),
    )
  })

  it("returns empty array when no published collections", async () => {
    mockFindMany.mockResolvedValue([])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  it("handles database error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB connection failed"))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe("Failed to fetch collections")
  })
})
