/**
 * @jest-environment node
 */
import { translateToolToChinese } from "@/lib/translate"

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe("translateToolToChinese", () => {
  const originalEnv = process.env.GLM_API_KEY

  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GLM_API_KEY = originalEnv
    } else {
      delete process.env.GLM_API_KEY
    }
  })

  it("returns empty result when GLM_API_KEY is not set", async () => {
    delete process.env.GLM_API_KEY
    const result = await translateToolToChinese("Hello", ["Feature 1"])
    expect(result).toEqual({ descriptionZh: null, featuresZh: [] })
  })

  it("returns empty result when both inputs are empty", async () => {
    process.env.GLM_API_KEY = "test-key"
    const result = await translateToolToChinese("", [])
    expect(result).toEqual({ descriptionZh: null, featuresZh: [] })
  })

  it("calls GLM API and returns translated content", async () => {
    process.env.GLM_API_KEY = "test-key"
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"descriptionZh":"一个强大的工具","featuresZh":["特性一","特性二"]}',
            },
          },
        ],
      }),
    })

    const result = await translateToolToChinese("A powerful tool", [
      "Feature one",
      "Feature two",
    ])

    expect(result).toEqual({
      descriptionZh: "一个强大的工具",
      featuresZh: ["特性一", "特性二"],
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.model).toBe("glm-4-flash")
    expect(body.messages).toHaveLength(2)
    expect(body.messages[0].role).toBe("system")
    expect(body.messages[1].role).toBe("user")
  })

  it("handles API error gracefully", async () => {
    process.env.GLM_API_KEY = "test-key"
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limited",
    })

    const result = await translateToolToChinese("Test description", [])
    expect(result).toEqual({ descriptionZh: null, featuresZh: [] })
  })

  it("handles malformed JSON response", async () => {
    process.env.GLM_API_KEY = "test-key"
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not valid json" } }],
      }),
    })

    const result = await translateToolToChinese("Test", ["Feat"])
    expect(result).toEqual({ descriptionZh: null, featuresZh: [] })
  })

  it("handles JSON wrapped in markdown code block", async () => {
    process.env.GLM_API_KEY = "test-key"
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '```json\n{"descriptionZh":"翻译","featuresZh":[]}\n```',
            },
          },
        ],
      }),
    })

    const result = await translateToolToChinese("Test", [])
    expect(result).toEqual({
      descriptionZh: "翻译",
      featuresZh: [],
    })
  })

  it("handles network error gracefully", async () => {
    process.env.GLM_API_KEY = "test-key"
    mockFetch.mockRejectedValueOnce(new Error("Network failure"))

    const result = await translateToolToChinese("Test", [])
    expect(result).toEqual({ descriptionZh: null, featuresZh: [] })
  })

  it("sends correct Authorization header", async () => {
    process.env.GLM_API_KEY = "my-secret-key"
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: '{"descriptionZh":"x","featuresZh":[]}' } },
        ],
      }),
    })

    await translateToolToChinese("desc", [])

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBe("Bearer my-secret-key")
  })
})
