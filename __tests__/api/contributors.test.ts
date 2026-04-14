/**
 * @jest-environment node
 */
import { GET } from "@/app/api/contributors/route"
import { prisma } from "@/lib/db"

jest.mock("@/lib/db", () => ({
  prisma: {
    submission: {
      findMany: jest.fn(),
    },
  },
}))

const mockFindMany = prisma.submission.findMany as jest.Mock

describe("GET /api/contributors", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns sorted contributors with correct counts", async () => {
    const now = new Date()
    const earlier = new Date(now.getTime() - 86400000)

    mockFindMany.mockResolvedValue([
      {
        userId: "user-1",
        createdAt: now,
        user: { name: "Alice", image: "https://img.com/alice.jpg" },
      },
      {
        userId: "user-1",
        createdAt: earlier,
        user: { name: "Alice", image: "https://img.com/alice.jpg" },
      },
      {
        userId: "user-2",
        createdAt: now,
        user: { name: "Bob", image: null },
      },
    ])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)

    // Sorted by approvedCount descending — Alice has 2, Bob has 1
    expect(body.data[0]).toEqual({
      userId: "user-1",
      name: "Alice",
      image: "https://img.com/alice.jpg",
      approvedCount: 2,
      lastSubmissionAt: now.toISOString(),
    })
    expect(body.data[1].approvedCount).toBe(1)
    expect(body.data[1].name).toBe("Bob")
  })

  it("returns empty array when no approved submissions", async () => {
    mockFindMany.mockResolvedValue([])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  it("skips submissions with null userId", async () => {
    const now = new Date()

    mockFindMany.mockResolvedValue([
      {
        userId: null,
        createdAt: now,
        user: null,
      },
      {
        userId: "user-1",
        createdAt: now,
        user: { name: "Alice", image: null },
      },
    ])

    const response = await GET()
    const body = await response.json()

    expect(body.data).toHaveLength(1)
    expect(body.data[0].userId).toBe("user-1")
  })

  it("handles user with null name and image", async () => {
    const now = new Date()

    mockFindMany.mockResolvedValue([
      {
        userId: "user-anon",
        createdAt: now,
        user: { name: null, image: null },
      },
    ])

    const response = await GET()
    const body = await response.json()

    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBeNull()
    expect(body.data[0].image).toBeNull()
  })

  it("uses latest submission date as lastSubmissionAt", async () => {
    const older = new Date("2025-01-01")
    const newer = new Date("2025-06-01")

    mockFindMany.mockResolvedValue([
      {
        userId: "user-1",
        createdAt: older,
        user: { name: "Alice", image: null },
      },
      {
        userId: "user-1",
        createdAt: newer,
        user: { name: "Alice", image: null },
      },
    ])

    const response = await GET()
    const body = await response.json()

    expect(body.data[0].lastSubmissionAt).toBe(newer.toISOString())
  })

  it("handles database error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB connection failed"))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe("Failed to fetch contributors")
  })

  it("queries only APPROVED submissions with non-null userId", async () => {
    mockFindMany.mockResolvedValue([])

    await GET()

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "APPROVED",
          userId: { not: null },
        },
      }),
    )
  })
})
