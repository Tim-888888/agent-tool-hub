/**
 * GitHub REST API client.
 * Per D-02: fetch stars, forks, openIssues, lastCommitAt, description, license.
 * Per D-13: auth via GITHUB_TOKEN env var.
 * Per D-16: rate limit awareness from response headers.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_VERSION = '2022-11-28';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  return headers;
}

export interface GitHubRepoData {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  description: string | null;
  topics: string[];
  license: { key: string; name: string } | null;
  language: string | null;
}

/**
 * Parse a GitHub URL into owner and repo segments.
 * Handles both:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/main/src/filesystem
 * Returns null if the URL is not a valid GitHub repo URL.
 */
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(repoUrl);
    if (url.hostname !== 'github.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

/**
 * Fetch repository data from GitHub REST API.
 * Tracks rate limit from response headers.
 */
export async function fetchRepoData(
  owner: string,
  repo: string,
): Promise<GitHubRepoData> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${res.statusText} for ${owner}/${repo}`);
  }

  // Per D-16: track rate limit
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining && parseInt(remaining, 10) < 100) {
    console.warn(`GitHub API rate limit low: ${remaining} remaining`);
  }

  return res.json() as Promise<GitHubRepoData>;
}

/**
 * Fetch raw README content from GitHub.
 * Tries main branch first, then master as fallback.
 * Returns null if README is not found.
 */
export async function fetchReadme(
  owner: string,
  repo: string,
): Promise<string | null> {
  for (const branch of ['main', 'master']) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`,
        { headers: getHeaders(), signal: AbortSignal.timeout(10_000) },
      );
      if (res.ok) return res.text();
    } catch {
      // Timeout or network error — skip this branch
    }
  }
  return null;
}
