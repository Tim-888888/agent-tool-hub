/**
 * Auto-discovery module for new AI Agent tools.
 *
 * Scans public sources (GitHub Topics, npm) to find MCP Servers, Skills, and Rules
 * that are not yet in the database. Discovered tools are created with PENDING status
 * for admin review.
 */

import { prisma } from "@/lib/db";
import { fetchRepoData, parseRepoUrl } from "@/lib/github-client";
import { fetchWeeklyDownloads } from "@/lib/npm-client";
import { computeScore } from "@/lib/scoring";
import { withRetry } from "@/lib/retry";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_VERSION = "2022-11-28";

interface DiscoveredRepo {
  owner: string;
  repo: string;
  url: string;
  stars: number;
  description: string | null;
  language: string | null;
}

interface DiscoveryResult {
  source: string;
  discovered: number;
  created: number;
  skipped: number;
  errors: string[];
}

function getGitHubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
  if (GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * Search GitHub for repositories matching MCP-related topics/keywords.
 * Returns deduplicated list of repos sorted by stars (descending).
 */
export async function searchGitHubTopics(
  query: string,
  maxResults: number = 30,
): Promise<DiscoveredRepo[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${maxResults}`;

  const res = await fetch(url, { headers: getGitHubHeaders() });

  if (!res.ok) {
    throw new Error(`GitHub Search API ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();

  return (data.items || [])
    .filter((item: Record<string, unknown>) => item.html_url && item.name && item.owner)
    .map((item: Record<string, unknown>) => ({
      owner: (item.owner as Record<string, string>).login,
      repo: item.name as string,
      url: item.html_url as string,
      stars: item.stargazers_count as number,
      description: (item.description as string) || null,
      language: (item.language as string) || null,
    }));
}

/**
 * Search npm registry for packages matching MCP keywords.
 * Returns list of repos (parsed from npm package metadata).
 */
export async function searchNpmPackages(
  keyword: string,
  maxResults: number = 30,
): Promise<DiscoveredRepo[]> {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(keyword)}&size=${maxResults}&popularity=1.0`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`npm Search API ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const results: DiscoveredRepo[] = [];

  for (const pkg of data.objects || []) {
    const repoUrl = pkg.package?.links?.repository || pkg.package?.links?.npm;
    if (!repoUrl) continue;

    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) continue;

    results.push({
      owner: parsed.owner,
      repo: parsed.repo,
      url: repoUrl,
      stars: 0,
      description: pkg.package?.description || null,
      language: null,
    });
  }

  return results;
}

/**
 * Run full discovery pipeline: scan all sources, deduplicate against
 * existing tools and pending submissions, create new tools with PENDING status.
 */
export async function runDiscovery(): Promise<DiscoveryResult[]> {
  const results: DiscoveryResult[] = [];

  // Get existing tool repo URLs to skip duplicates
  const existingUrls = new Set(
    (
      await prisma.tool.findMany({
        select: { repoUrl: true },
      })
    ).map((t) => t.repoUrl),
  );

  // Also skip repos with pending submissions
  const pendingUrls = new Set(
    (
      await prisma.submission.findMany({
        where: { status: "PENDING" },
        select: { repoUrl: true },
      })
    ).map((s) => s.repoUrl),
  );

  const knownUrls = new Set([...existingUrls, ...pendingUrls]);

  // Define search queries covering MCP ecosystem
  const githubQueries = [
    "topic:mcp-server",
    "topic:mcp server",
    "mcp server language:typescript stars:>50",
    "mcp server language:python stars:>50",
    "claude code skill stars:>20",
    "claude mcp server stars:>50",
  ];

  const npmKeywords = ["mcp server", "mcp-server", "@modelcontextprotocol"];

  // --- GitHub discovery ---
  const allGitHubRepos: DiscoveredRepo[] = [];
  const gitHubErrors: string[] = [];

  for (const query of githubQueries) {
    try {
      const repos = await withRetry(() => searchGitHubTopics(query, 30));
      allGitHubRepos.push(...repos);
    } catch (error) {
      gitHubErrors.push(
        `GitHub query "${query}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueGitHubRepos = allGitHubRepos.filter((repo) => {
    const normalizedUrl = `https://github.com/${repo.owner}/${repo.repo}`;
    if (seenUrls.has(normalizedUrl)) return false;
    seenUrls.add(normalizedUrl);
    return true;
  });

  // Sort by stars descending
  uniqueGitHubRepos.sort((a, b) => b.stars - a.stars);

  // Filter out known repos
  const newGitHubRepos = uniqueGitHubRepos.filter(
    (repo) => !knownUrls.has(`https://github.com/${repo.owner}/${repo.repo}`),
  );

  // Create PENDING tools (limit to top 20 per run to avoid flooding)
  let gitHubCreated = 0;
  for (const repo of newGitHubRepos.slice(0, 20)) {
    try {
      const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
      let stars = repo.stars;
      let language = repo.language;
      let license: string | null = null;
      let forks = 0;

      // Enrich with actual GitHub data if stars < 50 (search results may be stale)
      if (stars < 50 || !language) {
        try {
          const repoData = await withRetry(() => fetchRepoData(repo.owner, repo.repo));
          stars = repoData.stargazers_count;
          language = repoData.language;
          license = repoData.license?.key ?? null;
          forks = repoData.forks_count;
        } catch {
          // Use search result data as fallback
        }
      }

      // Skip repos with very few stars (< 10) — likely low quality
      if (stars < 10) continue;

      const slug = generateSlug(repo.owner, repo.repo);

      // Skip if slug already exists
      const existingSlug = await prisma.tool.findUnique({ where: { slug } });
      if (existingSlug) continue;

      // Determine tool type from repo metadata
      const toolType = inferToolType(repo.repo, repo.description);

      const score = computeScore({
        stars,
        forks,
        lastCommitAt: new Date(),
        npmDownloads: null,
      });

      await prisma.tool.create({
        data: {
          slug,
          name: repo.repo,
          description: repo.description || "",
          repoUrl,
          type: toolType,
          status: "PENDING",
          stars,
          forks,
          language,
          license,
          score,
        },
      });

      gitHubCreated++;
    } catch (error) {
      gitHubErrors.push(
        `Create ${repo.owner}/${repo.repo}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  results.push({
    source: "github",
    discovered: newGitHubRepos.length,
    created: gitHubCreated,
    skipped: newGitHubRepos.length - gitHubCreated,
    errors: gitHubErrors,
  });

  // --- npm discovery ---
  const allNpmRepos: DiscoveredRepo[] = [];
  const npmErrors: string[] = [];

  for (const keyword of npmKeywords) {
    try {
      const repos = await searchNpmPackages(keyword, 30);
      allNpmRepos.push(...repos);
    } catch (error) {
      npmErrors.push(
        `npm keyword "${keyword}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Deduplicate npm results
  const seenNpmUrls = new Set<string>();
  const uniqueNpmRepos = allNpmRepos.filter((repo) => {
    const key = `https://github.com/${repo.owner}/${repo.repo}`;
    if (seenNpmUrls.has(key) || knownUrls.has(key)) return false;
    seenNpmUrls.add(key);
    return true;
  });

  // Also skip repos already discovered via GitHub
  const filteredNpmRepos = uniqueNpmRepos.filter(
    (repo) => !seenUrls.has(`https://github.com/${repo.owner}/${repo.repo}`),
  );

  let npmCreated = 0;
  for (const repo of filteredNpmRepos.slice(0, 10)) {
    try {
      const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;

      // Fetch full GitHub data for npm-discovered repos
      let stars = 0;
      let forks = 0;
      let language: string | null = null;
      let license: string | null = null;
      let description = repo.description;

      try {
        const repoData = await withRetry(() => fetchRepoData(repo.owner, repo.repo));
        stars = repoData.stargazers_count;
        forks = repoData.forks_count;
        language = repoData.language;
        license = repoData.license?.key ?? null;
        if (repoData.description) description = repoData.description;
      } catch {
        // Skip repos we can't verify
        continue;
      }

      if (stars < 10) continue;

      const slug = generateSlug(repo.owner, repo.repo);
      const existingSlug = await prisma.tool.findUnique({ where: { slug } });
      if (existingSlug) continue;

      const toolType = inferToolType(repo.repo, description);

      const score = computeScore({
        stars,
        forks,
        lastCommitAt: new Date(),
        npmDownloads: null,
      });

      await prisma.tool.create({
        data: {
          slug,
          name: repo.repo,
          description: description || "",
          repoUrl,
          type: toolType,
          status: "PENDING",
          stars,
          forks,
          language,
          license,
          score,
        },
      });

      npmCreated++;
    } catch (error) {
      npmErrors.push(
        `Create ${repo.owner}/${repo.repo}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  results.push({
    source: "npm",
    discovered: filteredNpmRepos.length,
    created: npmCreated,
    skipped: filteredNpmRepos.length - npmCreated,
    errors: npmErrors,
  });

  return results;
}

/**
 * Generate a URL-safe slug from owner and repo name.
 */
function generateSlug(owner: string, repo: string): string {
  // Use repo name as base slug
  let slug = repo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // If slug is too generic (like "server"), prefix with owner
  const genericNames = ["server", "mcp-server", "mcp", "client", "sdk"];
  if (genericNames.includes(slug)) {
    slug = `${owner.toLowerCase()}-${slug}`;
  }

  return slug;
}

/**
 * Infer tool type from repo name and description.
 */
function inferToolType(
  repoName: string,
  description: string | null,
): "MCP_SERVER" | "SKILL" | "RULE" {
  const text = `${repoName} ${description || ""}`.toLowerCase();

  if (text.includes("skill") || text.includes("command") || text.includes("claude-code")) {
    return "SKILL";
  }
  if (text.includes("rule") || text.includes("rules") || text.includes("guideline")) {
    return "RULE";
  }
  // Default to MCP_SERVER (most common in the ecosystem)
  return "MCP_SERVER";
}
