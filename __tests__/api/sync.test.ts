/**
 * @jest-environment node
 */
import { GET } from "@/app/api/sync/route";

// Mock all external modules
jest.mock("@/lib/db", () => ({
  prisma: {
    tool: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/github-client", () => ({
  parseRepoUrl: jest.fn(),
  fetchRepoData: jest.fn(),
  fetchReadme: jest.fn(),
}));

jest.mock("@/lib/npm-client", () => ({
  fetchWeeklyDownloads: jest.fn(),
}));

jest.mock("@/lib/readme-parser", () => ({
  extractFeatures: jest.fn(),
  extractInstallGuide: jest.fn(),
}));

jest.mock("@/lib/scoring", () => ({
  computeScore: jest.fn(),
}));

jest.mock("@/lib/retry", () => ({
  withRetry: jest.fn((fn) => fn()),
}));

import { prisma } from "@/lib/db";
import { parseRepoUrl, fetchRepoData, fetchReadme } from "@/lib/github-client";
import { fetchWeeklyDownloads } from "@/lib/npm-client";
import { extractFeatures, extractInstallGuide } from "@/lib/readme-parser";
import { computeScore } from "@/lib/scoring";

const mockFindMany = prisma.tool.findMany as jest.Mock;
const mockFindUnique = prisma.tool.findUnique as jest.Mock;
const mockUpdate = prisma.tool.update as jest.Mock;
const mockParseRepoUrl = parseRepoUrl as jest.Mock;
const mockFetchRepoData = fetchRepoData as jest.Mock;
const mockFetchReadme = fetchReadme as jest.Mock;
const mockFetchWeeklyDownloads = fetchWeeklyDownloads as jest.Mock;
const mockExtractFeatures = extractFeatures as jest.Mock;
const mockExtractInstallGuide = extractInstallGuide as jest.Mock;
const mockComputeScore = computeScore as jest.Mock;

describe("GET /api/sync", () => {
  const mockRequest = new Request("http://localhost:3000/api/sync");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("successfully syncs one tool", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "tool-1",
        name: "Test Tool",
        repoUrl: "https://github.com/owner/repo",
        npmPackage: "test-package",
      },
    ]);

    mockParseRepoUrl.mockReturnValue({ owner: "owner", repo: "repo" });
    mockFetchRepoData.mockResolvedValue({
      stargazers_count: 5000,
      forks_count: 200,
      open_issues_count: 30,
      pushed_at: "2026-04-01T00:00:00Z",
      description: "A great tool",
      topics: ["mcp"],
      license: { key: "mit", name: "MIT License" },
      language: "TypeScript",
    });
    mockFetchReadme.mockResolvedValue("# Test Tool\n## Features\n- Fast");
    mockFetchWeeklyDownloads.mockResolvedValue(5000);
    mockExtractFeatures.mockReturnValue(["Fast"]);
    mockExtractInstallGuide.mockReturnValue("npm install test-package");
    mockComputeScore.mockReturnValue(75.3);
    // Existing tool has structured installGuide and featuresEn
    mockFindUnique.mockResolvedValue({
      installGuide: { "claude-code": { method: "cli", command: "test" } },
      featuresEn: ["Existing feature"],
      featuresZh: ["已有特性"],
    });
    mockUpdate.mockResolvedValue({});

    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.synced).toBe(1);
    expect(body.data.failed).toBe(0);
    expect(body.data.results).toHaveLength(1);
    expect(body.data.results[0]).toEqual({
      tool: "Test Tool",
      status: "success",
    });

    // Verify prisma.tool.update was called with expected fields
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "tool-1" },
      data: expect.objectContaining({
        stars: 5000,
        forks: 200,
        openIssues: 30,
        score: 75.3,
        syncedAt: expect.any(Date),
      }),
    });

    // Verify installGuide was NOT overwritten (existing is non-null)
    const updateData = mockUpdate.mock.calls[0][0].data;
    expect(updateData.installGuide).toBeUndefined();
    // Verify featuresEn was NOT overwritten (existing is non-empty)
    expect(updateData.featuresEn).toBeUndefined();
  });

  it("handles tool with invalid repoUrl", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "tool-1",
        name: "Bad URL Tool",
        repoUrl: "not-a-valid-url",
        npmPackage: null,
      },
    ]);

    mockParseRepoUrl.mockReturnValue(null);

    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.synced).toBe(0);
    expect(body.data.failed).toBe(1);
    expect(body.data.results[0].status).toBe("failed");
    expect(body.data.results[0].error).toContain("Invalid repo URL");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("handles tool without npmPackage (skips npm fetch)", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "tool-1",
        name: "No NPM Tool",
        repoUrl: "https://github.com/owner/repo",
        npmPackage: null,
      },
    ]);

    mockParseRepoUrl.mockReturnValue({ owner: "owner", repo: "repo" });
    mockFetchRepoData.mockResolvedValue({
      stargazers_count: 100,
      forks_count: 10,
      open_issues_count: 5,
      pushed_at: "2026-04-01T00:00:00Z",
      description: "Tool without npm",
      topics: [],
      license: null,
      language: "Go",
    });
    mockFetchReadme.mockResolvedValue(null);
    mockExtractFeatures.mockReturnValue([]);
    mockExtractInstallGuide.mockReturnValue(null);
    mockComputeScore.mockReturnValue(20.0);
    mockFindUnique.mockResolvedValue({
      installGuide: null,
      featuresEn: [],
      featuresZh: [],
    });
    mockUpdate.mockResolvedValue({});

    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.synced).toBe(1);
    expect(body.data.failed).toBe(0);

    // npm download fetch should NOT have been called
    expect(mockFetchWeeklyDownloads).not.toHaveBeenCalled();

    // npmDownloads should not be in the update data (it's undefined)
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.npmDownloads).toBeUndefined();
  });

  it("individual tool failure does not block others", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "tool-1",
        name: "Failing Tool",
        repoUrl: "https://github.com/owner/failing",
        npmPackage: null,
      },
      {
        id: "tool-2",
        name: "Working Tool",
        repoUrl: "https://github.com/owner/working",
        npmPackage: null,
      },
    ]);

    mockParseRepoUrl
      .mockReturnValueOnce({ owner: "owner", repo: "failing" })
      .mockReturnValueOnce({ owner: "owner", repo: "working" });

    // First tool: repo data fetch fails
    mockFetchRepoData
      .mockRejectedValueOnce(new Error("GitHub API 403"))
      .mockResolvedValueOnce({
        stargazers_count: 50,
        forks_count: 5,
        open_issues_count: 1,
        pushed_at: "2026-04-01T00:00:00Z",
        description: "Working tool",
        topics: [],
        license: null,
        language: "TypeScript",
      });

    mockFetchReadme.mockResolvedValue(null);
    mockExtractFeatures.mockReturnValue([]);
    mockExtractInstallGuide.mockReturnValue(null);
    mockComputeScore.mockReturnValue(15.0);
    mockFindUnique.mockResolvedValue({
      installGuide: null,
      featuresEn: [],
      featuresZh: [],
    });
    mockUpdate.mockResolvedValue({});

    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.synced).toBe(1);
    expect(body.data.failed).toBe(1);

    // Update should only be called for the working tool
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tool-2" },
      }),
    );

    // Verify results array
    expect(body.data.results).toHaveLength(2);
    const failedResult = body.data.results.find(
      (r: { status: string }) => r.status === "failed",
    );
    expect(failedResult.tool).toBe("Failing Tool");
    expect(failedResult.error).toContain("GitHub API 403");
  });

  it("handles empty tools list", async () => {
    mockFindMany.mockResolvedValue([]);

    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.synced).toBe(0);
    expect(body.data.failed).toBe(0);
    expect(body.data.results).toEqual([]);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 500 on fatal database error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB connection failed"));

    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Sync failed");
  });

  it("does NOT overwrite existing structured installGuide", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "tool-1",
        name: "Protected Tool",
        repoUrl: "https://github.com/owner/repo",
        npmPackage: null,
      },
    ]);

    mockParseRepoUrl.mockReturnValue({ owner: "owner", repo: "repo" });
    mockFetchRepoData.mockResolvedValue({
      stargazers_count: 100,
      forks_count: 10,
      open_issues_count: 5,
      pushed_at: "2026-04-01T00:00:00Z",
      description: "Protected tool",
      topics: [],
      license: null,
      language: "TypeScript",
    });
    mockFetchReadme.mockResolvedValue("# Install\nnpm install foo");
    mockExtractFeatures.mockReturnValue([]);
    mockExtractInstallGuide.mockReturnValue("npm install foo");
    mockComputeScore.mockReturnValue(30.0);

    // Existing tool has structured installGuide
    mockFindUnique.mockResolvedValue({
      installGuide: {
        "claude-code": { method: "cli", command: "claude mcp add foo" },
        cursor: { method: "config", config: { mcpServers: { foo: {} } } },
      },
      featuresEn: ["Feature 1"],
      featuresZh: ["特性 1"],
    });
    mockUpdate.mockResolvedValue({});

    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.synced).toBe(1);

    // installGuide should NOT be in the update payload
    const updateData = mockUpdate.mock.calls[0][0].data;
    expect(updateData.installGuide).toBeUndefined();
    // featuresZh should never appear in update
    expect(updateData.featuresZh).toBeUndefined();
  });

  it("sets installGuide from README only when existing is null", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "tool-2",
        name: "New Tool",
        repoUrl: "https://github.com/owner/new-repo",
        npmPackage: null,
      },
    ]);

    mockParseRepoUrl.mockReturnValue({ owner: "owner", repo: "new-repo" });
    mockFetchRepoData.mockResolvedValue({
      stargazers_count: 200,
      forks_count: 15,
      open_issues_count: 3,
      pushed_at: "2026-04-01T00:00:00Z",
      description: "New tool",
      topics: [],
      license: null,
      language: "Python",
    });
    mockFetchReadme.mockResolvedValue("# Install\npip install foo");
    mockExtractFeatures.mockReturnValue([]);
    mockExtractInstallGuide.mockReturnValue("pip install foo");
    mockComputeScore.mockReturnValue(25.0);

    // No existing installGuide
    mockFindUnique.mockResolvedValue({
      installGuide: null,
      featuresEn: [],
      featuresZh: [],
    });
    mockUpdate.mockResolvedValue({});

    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.synced).toBe(1);

    // installGuide SHOULD be set when existing is null
    const updateData = mockUpdate.mock.calls[0][0].data;
    expect(updateData.installGuide).toEqual({ markdown: "pip install foo" });
  });

  it("sets featuresEn from README only when existing is empty", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "tool-3",
        name: "Empty Features Tool",
        repoUrl: "https://github.com/owner/empty-feat",
        npmPackage: null,
      },
    ]);

    mockParseRepoUrl.mockReturnValue({ owner: "owner", repo: "empty-feat" });
    mockFetchRepoData.mockResolvedValue({
      stargazers_count: 50,
      forks_count: 5,
      open_issues_count: 2,
      pushed_at: "2026-04-01T00:00:00Z",
      description: "Empty features",
      topics: [],
      license: null,
      language: "Rust",
    });
    mockFetchReadme.mockResolvedValue("# Features\n- Fast\n- Safe");
    mockExtractFeatures.mockReturnValue(["Fast", "Safe"]);
    mockExtractInstallGuide.mockReturnValue(null);
    mockComputeScore.mockReturnValue(18.0);

    // Existing has empty featuresEn
    mockFindUnique.mockResolvedValue({
      installGuide: null,
      featuresEn: [],
      featuresZh: [],
    });
    mockUpdate.mockResolvedValue({});

    const response = await GET(mockRequest);
    expect(response.status).toBe(200);

    // featuresEn SHOULD be set when existing is empty
    const updateData = mockUpdate.mock.calls[0][0].data;
    expect(updateData.featuresEn).toEqual(["Fast", "Safe"]);
  });
});
