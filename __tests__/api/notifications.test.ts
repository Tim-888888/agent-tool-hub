/**
 * @jest-environment node
 */

// Mock auth-helpers before importing routes that depend on it
jest.mock("@/lib/auth-helpers", () => ({
  requireAuth: jest.fn(),
}))

jest.mock("@/lib/db", () => ({
  prisma: {
    tool: {
      findUnique: jest.fn(),
    },
    toolSubscription: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

import { POST, GET as GET_SUBSCRIBE } from "@/app/api/tools/[slug]/subscribe/route"
import { GET as GET_NOTIFICATIONS } from "@/app/api/notifications/route"
import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/db"

const mockRequireAuth = requireAuth as jest.Mock
const mockToolFindUnique = prisma.tool.findUnique as jest.Mock
const mockSubFindUnique = prisma.toolSubscription.findUnique as jest.Mock
const mockSubCreate = prisma.toolSubscription.create as jest.Mock
const mockSubDelete = prisma.toolSubscription.delete as jest.Mock
const mockNotifFindMany = prisma.notification.findMany as jest.Mock
const mockNotifCount = prisma.notification.count as jest.Mock

function mockAuthedSession(userId = "user-1") {
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: userId } },
    error: null,
  })
}

function mockUnauthed() {
  mockRequireAuth.mockResolvedValue({
    session: null,
    error: Response.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    ),
  })
}

describe("POST /api/tools/[slug]/subscribe (toggle)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("subscribes when not already subscribed", async () => {
    mockAuthedSession()
    mockToolFindUnique.mockResolvedValue({ id: "tool-1", slug: "my-tool" })
    mockSubFindUnique.mockResolvedValue(null)
    mockSubCreate.mockResolvedValue({ id: "sub-1", userId: "user-1", toolId: "tool-1" })

    const request = new Request("http://localhost:3000/api/tools/my-tool/subscribe", {
      method: "POST",
    })
    const response = await POST(request, {
      params: Promise.resolve({ slug: "my-tool" }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.subscribed).toBe(true)
    expect(mockSubCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", toolId: "tool-1" },
    })
  })

  it("unsubscribes when already subscribed", async () => {
    mockAuthedSession()
    mockToolFindUnique.mockResolvedValue({ id: "tool-1", slug: "my-tool" })
    mockSubFindUnique.mockResolvedValue({ id: "sub-1", userId: "user-1", toolId: "tool-1" })
    mockSubDelete.mockResolvedValue({ id: "sub-1" })

    const request = new Request("http://localhost:3000/api/tools/my-tool/subscribe", {
      method: "POST",
    })
    const response = await POST(request, {
      params: Promise.resolve({ slug: "my-tool" }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.subscribed).toBe(false)
    expect(mockSubDelete).toHaveBeenCalledWith({ where: { id: "sub-1" } })
    expect(mockSubCreate).not.toHaveBeenCalled()
  })

  it("returns 404 when tool not found", async () => {
    mockAuthedSession()
    mockToolFindUnique.mockResolvedValue(null)

    const request = new Request("http://localhost:3000/api/tools/nonexistent/subscribe", {
      method: "POST",
    })
    const response = await POST(request, {
      params: Promise.resolve({ slug: "nonexistent" }),
    })

    expect(response.status).toBe(404)
  })

  it("returns 401 when not authenticated", async () => {
    mockUnauthed()

    const request = new Request("http://localhost:3000/api/tools/my-tool/subscribe", {
      method: "POST",
    })
    const response = await POST(request, {
      params: Promise.resolve({ slug: "my-tool" }),
    })

    expect(response.status).toBe(401)
  })
})

describe("GET /api/tools/[slug]/subscribe (check status)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns subscribed: true when subscription exists", async () => {
    mockAuthedSession()
    mockToolFindUnique.mockResolvedValue({ id: "tool-1", slug: "my-tool" })
    mockSubFindUnique.mockResolvedValue({ id: "sub-1" })

    const request = new Request("http://localhost:3000/api/tools/my-tool/subscribe")
    const response = await GET_SUBSCRIBE(request, {
      params: Promise.resolve({ slug: "my-tool" }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.subscribed).toBe(true)
  })

  it("returns subscribed: false when no subscription", async () => {
    mockAuthedSession()
    mockToolFindUnique.mockResolvedValue({ id: "tool-1", slug: "my-tool" })
    mockSubFindUnique.mockResolvedValue(null)

    const request = new Request("http://localhost:3000/api/tools/my-tool/subscribe")
    const response = await GET_SUBSCRIBE(request, {
      params: Promise.resolve({ slug: "my-tool" }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.subscribed).toBe(false)
  })

  it("returns 404 when tool not found", async () => {
    mockAuthedSession()
    mockToolFindUnique.mockResolvedValue(null)

    const request = new Request("http://localhost:3000/api/tools/missing/subscribe")
    const response = await GET_SUBSCRIBE(request, {
      params: Promise.resolve({ slug: "missing" }),
    })

    expect(response.status).toBe(404)
  })
})

describe("GET /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns notifications and unread count for authenticated user", async () => {
    mockAuthedSession("user-42")

    const mockNotifications = [
      {
        id: "notif-1",
        userId: "user-42",
        read: false,
        createdAt: new Date(),
        tool: { id: "t-1", slug: "my-tool", name: "My Tool" },
      },
      {
        id: "notif-2",
        userId: "user-42",
        read: true,
        createdAt: new Date(),
        tool: { id: "t-2", slug: "other-tool", name: "Other Tool" },
      },
    ]

    mockNotifFindMany.mockResolvedValue(mockNotifications)
    mockNotifCount.mockResolvedValue(1)

    const response = await GET_NOTIFICATIONS()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.notifications).toHaveLength(2)
    expect(body.data.unreadCount).toBe(1)

    // Verify queries use the correct userId
    expect(mockNotifFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-42" },
        take: 30,
      }),
    )
    expect(mockNotifCount).toHaveBeenCalledWith({
      where: { userId: "user-42", read: false },
    })
  })

  it("returns 401 when not authenticated", async () => {
    mockUnauthed()

    const response = await GET_NOTIFICATIONS()

    expect(response.status).toBe(401)
  })

  it("handles database error gracefully", async () => {
    mockAuthedSession()
    mockNotifFindMany.mockRejectedValue(new Error("DB error"))

    const response = await GET_NOTIFICATIONS()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe("Fetch notifications failed")
  })

  it("returns empty notifications when user has none", async () => {
    mockAuthedSession()
    mockNotifFindMany.mockResolvedValue([])
    mockNotifCount.mockResolvedValue(0)

    const response = await GET_NOTIFICATIONS()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.notifications).toEqual([])
    expect(body.data.unreadCount).toBe(0)
  })
})
