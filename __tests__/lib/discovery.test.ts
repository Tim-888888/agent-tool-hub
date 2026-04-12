/**
 * @jest-environment node
 */
import { searchGitHubTopics, searchNpmPackages } from "@/lib/discovery";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("discovery", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("searchGitHubTopics", () => {
    it("parses GitHub search results into DiscoveredRepo array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              name: "awesome-mcp",
              owner: { login: "user1" },
              html_url: "https://github.com/user1/awesome-mcp",
              stargazers_count: 500,
              description: "An awesome MCP server",
              language: "TypeScript",
            },
            {
              name: "mcp-tools",
              owner: { login: "user2" },
              html_url: "https://github.com/user2/mcp-tools",
              stargazers_count: 200,
              description: "MCP tools collection",
              language: "Python",
            },
          ],
        }),
      });

      const results = await searchGitHubTopics("topic:mcp-server", 30);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        owner: "user1",
        repo: "awesome-mcp",
        url: "https://github.com/user1/awesome-mcp",
        stars: 500,
        description: "An awesome MCP server",
        language: "TypeScript",
      });
      expect(results[1].repo).toBe("mcp-tools");
    });

    it("throws on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(searchGitHubTopics("test")).rejects.toThrow(
        "GitHub Search API 403",
      );
    });

    it("returns empty array for no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const results = await searchGitHubTopics("topic:nonexistent");
      expect(results).toHaveLength(0);
    });
  });

  describe("searchNpmPackages", () => {
    it("parses npm search results with GitHub URLs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          objects: [
            {
              package: {
                name: "@modelcontextprotocol/server-test",
                description: "Test MCP server",
                links: {
                  repository: "https://github.com/mcp/test-server",
                  npm: "https://www.npmjs.com/package/@mcp/server-test",
                },
              },
            },
          ],
        }),
      });

      const results = await searchNpmPackages("mcp-server");

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        owner: "mcp",
        repo: "test-server",
        url: "https://github.com/mcp/test-server",
        stars: 0,
        description: "Test MCP server",
        language: null,
      });
    });

    it("skips packages without GitHub repository URLs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          objects: [
            {
              package: {
                name: "some-package",
                description: "No GitHub link",
                links: {
                  npm: "https://www.npmjs.com/package/some-package",
                },
              },
            },
          ],
        }),
      });

      const results = await searchNpmPackages("test");
      expect(results).toHaveLength(0);
    });

    it("throws on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(searchNpmPackages("test")).rejects.toThrow(
        "npm Search API 500",
      );
    });
  });
});
