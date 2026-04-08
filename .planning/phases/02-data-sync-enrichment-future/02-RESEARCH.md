# Phase 2: Data Sync & Enrichment - Research

**Researched:** 2026-04-07
**Domain:** GitHub/npm data fetching, cron-based sync, weighted scoring
**Confidence:** HIGH

## Summary

This phase enriches the 12 existing tools in the database with live data from GitHub (stars, forks, issues, last commit, description, topics, license) and npm (weekly download counts). A weighted scoring algorithm combines these signals into a single float for ranking. A Vercel Cron Job triggers the sync once daily. Individual tool failures are isolated so one broken repo does not block the rest.

The core technical challenges are: (1) parsing `repoUrl` values that include tree paths (e.g., `https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem`) into clean `owner/repo` pairs, (2) parsing README markdown to extract features lists and installation instructions, (3) adding a `score` field to the Prisma schema and migrating without data loss, and (4) wiring the score into the existing sorting system in `api-utils.ts`.

**Primary recommendation:** Use native `fetch` (already in the project) for all HTTP calls. Keep the sync route idempotent via Prisma upsert. Isolate each tool's sync in a try/catch so one failure does not abort the batch.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Only sync existing 12 tools (no new tool discovery)
- D-02: Fetch from GitHub: stars, forks, openIssues, lastCommitAt, description, license, topics
- D-03: Parse README for features (Zh/En) and installGuide
- D-04: Fetch npm weekly download counts where npmPackage is non-null
- D-05: Weighted scoring: stars (0-40) + activity (0-20) + npm downloads (0-20) + forks/community (0-20)
- D-06: Score for ranking only, not displayed to users
- D-07: Activity measured by lastCommitAt recency
- D-08: Score recomputed each sync run
- D-09: Vercel Cron, once daily
- D-10: Cron triggers sync endpoint
- D-11: Retry failed fetches up to 3 times
- D-12: Individual tool failures do not block others
- D-13: GITHUB_TOKEN from .env
- D-14: Log all sync results (success/failure per tool)
- D-15: Include sync timestamp in tool record
- D-16: API rate limit awareness (GitHub 5000/hr authenticated)

### Claude's Discretion
- Exact scoring formula thresholds
- README parsing strategy (regex vs AST)
- Error logging format and verbosity
- Retry backoff strategy

### Deferred Ideas (OUT OF SCOPE)
- Auto-discovery of new tools
- User-submitted tools
- Manual sync trigger from admin UI
- Historical score tracking
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 2 has no explicit REQ-IDs in REQUIREMENTS.md yet. The planner should derive tasks from CONTEXT.md decisions D-01 through D-16. Each decision maps to implementable behavior:

| Decision | Implementation Area |
|----------|-------------------|
| D-01 | Scope sync query to existing 12 tools only |
| D-02, D-04 | GitHub/npm fetch clients |
| D-03 | README parser module |
| D-05, D-07, D-08 | Scoring algorithm module |
| D-06 | Wire score into buildOrderBy, do not expose in mapToolResponse |
| D-09, D-10 | vercel.json cron config + sync API route |
| D-11 | Retry wrapper utility |
| D-12 | Per-tool try/catch isolation |
| D-13 | GITHUB_TOKEN env var (exists in .env, currently empty) |
| D-14 | Structured logging in sync route |
| D-15 | Add syncedAt DateTime field to Tool model |
| D-16 | Rate limit headers tracking |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.2 | API routes for sync endpoint | Project framework [VERIFIED: package.json] |
| Prisma | ^7.6.0 | ORM for Tool model upserts | Project ORM [VERIFIED: package.json] |
| @prisma/client | ^7.6.0 | Database client | Paired with Prisma 7 [VERIFIED: package.json] |
| React | 19.2.4 | UI framework | Project framework [VERIFIED: package.json] |
| Jest | ^30.3.0 | Test runner | Project test framework [VERIFIED: package.json] |

### No New Dependencies Required
This phase uses **native `fetch`** for all HTTP calls (GitHub API, npm API, raw README content). No need for `axios`, `got`, or similar HTTP clients. Next.js 16 runs on Node.js 18+ which has built-in `fetch`.

**Key insight:** The project has no external HTTP client in package.json and does not need one. Native fetch with proper headers covers GitHub API, npm API, and raw GitHub content fetching.

### Supporting (for optional improvements)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| remark / unified | latest | AST-based markdown parsing | Only if regex README parsing proves unreliable |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch | axios | axios adds 14kb gzip for retry/interceptor sugar we can replicate in 20 lines |
| Regex README parsing | remark AST | remark is more robust but heavy dependency for extracting 2 fields from README |
| Prisma upsert | Raw SQL | Raw SQL loses type safety; upsert pattern already proven in seed.ts |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db.ts                  # EXISTING - Prisma singleton
│   ├── api-utils.ts           # EXISTING - needs score sort added
│   ├── github-client.ts       # NEW - GitHub REST API wrapper
│   ├── npm-client.ts          # NEW - npm registry API wrapper
│   ├── readme-parser.ts       # NEW - extract features + installGuide
│   ├── scoring.ts             # NEW - weighted score computation
│   └── retry.ts               # NEW - retry with backoff helper
├── app/
│   └── api/
│       ├── sync/
│       │   └── route.ts       # NEW - POST/GET sync endpoint
│       └── tools/
│           ├── route.ts       # EXISTING - add score sort option
│           └── trending/
│               └── route.ts   # EXISTING - no changes needed
prisma/
├── schema.prisma              # MIGRATE - add score, syncedAt fields
└── seed.ts                    # EXISTING - reference for patterns
vercel.json                    # NEW - cron job configuration
```

### Pattern 1: GitHub Client with Auth Headers
**What:** Centralized GitHub API access with auth and rate limit awareness
**When to use:** All GitHub REST API calls in this phase
**Example:**
```typescript
// src/lib/github-client.ts
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_HEADERS: HeadersInit = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

interface GitHubRepoData {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  description: string | null;
  topics: string[];
  license: { key: string; name: string } | null;
  language: string | null;
}

async function fetchRepoData(owner: string, repo: string): Promise<GitHubRepoData> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: GITHUB_HEADERS,
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);

  // Track rate limits from response headers
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining && parseInt(remaining) < 100) {
    console.warn(`GitHub API rate limit low: ${remaining} remaining`);
  }

  return res.json();
}
```
[Source: GitHub REST API docs - https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28]

### Pattern 2: RepoUrl Parsing
**What:** Extract owner/repo from various GitHub URL formats in seed data
**When to use:** Before every GitHub API call
**Example:**
```typescript
// CRITICAL: Handle both formats found in seed.ts
// Format 1: https://github.com/owner/repo
// Format 2: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
```
**Important:** The `match[2]` captures only the repo segment. Tree paths like `/tree/main/src/filesystem` are in subsequent path segments and do not affect owner/repo extraction. [VERIFIED: seed.ts contains 5 URLs with `/tree/` paths]

### Pattern 3: README Fetching and Parsing
**What:** Fetch raw README from GitHub and extract structured data
**When to use:** During sync for each tool with a repoUrl
**Example:**
```typescript
// Fetch raw README content
async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`
  );
  if (!res.ok) {
    // Try HEAD/master as fallback
    const res2 = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`
    );
    if (!res2.ok) return null;
    return res2.text();
  }
  return res.text();
}

// Extract features from README markdown
function extractFeatures(readme: string): string[] {
  // Look for common MCP server README patterns:
  // "## Features" or "## What it does" or "- Feature 1" under a heading
  const featuresSection = readme.match(/##\s+(?:Features|What it does|Capabilities)\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (!featuresSection) return [];

  return featuresSection[1]
    .split('\n')
    .filter(line => line.match(/^[-*]\s+/))
    .map(line => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}

// Extract install guide
function extractInstallGuide(readme: string): string | null {
  const installSection = readme.match(/##\s+(?:Installation|Install|Setup|Getting Started)\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  return installSection ? installSection[1].trim() : null;
}
```
[ASSUMED: README structure varies per repo; fallback to null if patterns not found]

### Pattern 4: Idempotent Sync with Upsert
**What:** Update tool records without creating duplicates, matching seed.ts pattern
**When to use:** Writing sync results to database
**Example:**
```typescript
// Follow existing pattern from seed.ts
await db.tool.update({
  where: { id: tool.id },
  data: {
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    openIssues: repoData.open_issues_count,
    lastCommitAt: new Date(repoData.pushed_at),
    featuresEn: extractedFeatures,
    installGuide: installGuide ? { markdown: installGuide } : undefined,
    score: computedScore,
    npmDownloads: weeklyDownloads,
    syncedAt: new Date(),
  },
});
```
[VERIFIED: seed.ts uses PrismaPg adapter and upsert/update patterns]

### Pattern 5: Retry with Exponential Backoff
**What:** Retry transient failures up to 3 times (per D-11)
**When to use:** Wrapping all external API calls
**Example:**
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 10000); // 1s, 2s, 4s max
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('unreachable');
}
```
[ASSUMED: exponential backoff is standard practice for API retries]

### Pattern 6: Per-Tool Error Isolation
**What:** Sync each tool independently so one failure does not block others (per D-12)
**When to use:** Main sync loop over all tools
**Example:**
```typescript
const results = [];
for (const tool of tools) {
  try {
    const repoData = await withRetry(() => fetchRepoData(owner, repo));
    const readmeContent = await withRetry(() => fetchReadme(owner, repo));
    const downloads = tool.npmPackage
      ? await withRetry(() => fetchNpmDownloads(tool.npmPackage))
      : null;

    const features = readmeContent ? extractFeatures(readmeContent) : [];
    const installGuide = readmeContent ? extractInstallGuide(readmeContent) : null;
    const score = computeScore({ stars: repoData.stargazers_count, ... });

    await db.tool.update({ where: { id: tool.id }, data: { ... } });
    results.push({ tool: tool.name, status: 'success' });
  } catch (error) {
    console.error(`Sync failed for ${tool.name}:`, error);
    results.push({ tool: tool.name, status: 'failed', error: String(error) });
  }
}
```
[VERIFIED: D-12 mandates individual failure isolation]

### Anti-Patterns to Avoid
- **Sequential waterfall fetches for independent data:** GitHub repo data and npm downloads are independent; fetch them in parallel with `Promise.allSettled` within each tool's sync.
- **Storing raw API responses:** Only store the normalized fields needed (stars as int, lastCommitAt as DateTime, etc.), not full GitHub JSON blobs.
- **Hardcoding branch names in raw URLs:** Try `main` first, then `master` as fallback for README fetching.
- **Ignoring rate limits:** Log remaining rate limit from `x-ratelimit-remaining` header after each GitHub call.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub auth + headers | Custom header logic scattered across files | Centralized `github-client.ts` with shared headers | Ensures consistent auth, version header, and Accept header |
| Repo URL parsing | Ad-hoc regex in multiple places | Single `parseRepoUrl()` function | 5 of 12 URLs have `/tree/` paths that need consistent handling |
| Date recency scoring | Custom date comparison logic | Simple days-since calculation with capped range | Standard approach: `min(daysSinceLastCommit / maxDays, 1)` |
| Retry logic | try/catch nesting | `withRetry()` wrapper | Exponential backoff is deceptively tricky to get right inline |

**Key insight:** The seed.ts repoUrl values have two distinct formats that a single parser must handle. Five URLs use `/tree/branch/path` format pointing to subdirectories within monorepos. The regex `github\.com\/([^/]+)\/([^/]+)` handles both formats correctly by capturing only the first two path segments.

## Common Pitfalls

### Pitfall 1: Tree-Based Repo URLs
**What goes wrong:** Passing the full URL (including `/tree/main/src/filesystem`) to GitHub API causes 404
**Why it happens:** 5 of 12 tools in seed.ts use URLs like `https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem`
**How to avoid:** Extract only `owner/repo` (first two path segments) before calling the API
**Warning signs:** GitHub API returns 404 for repos that definitely exist

### Pitfall 2: Empty GITHUB_TOKEN
**What goes wrong:** All GitHub API calls use unauthenticated rate limit (60/hour) instead of 5000/hour
**Why it happens:** The `.env` file has `GITHUB_TOKEN=""` (empty string)
**How to avoid:** Validate token is non-empty at sync startup; log warning and proceed with lower rate if missing
**Warning signs:** Rate limit errors after just 60 requests in an hour

### Pitfall 3: npm Downloads for Non-JavaScript Tools
**What goes wrong:** Calling npm API for tools with `null` npmPackage causes errors
**Why it happens:** 4 of 12 tools have `npmPackage: null` (github-mcp-server is Go, everything-claude-code is local, openclaw is Python, sequential-thinking might not be published)
**How to avoid:** Guard all npm fetch calls with `if (tool.npmPackage)` check
**Warning signs:** npm registry returns 404 or crashes with null package name

### Pitfall 4: README Branch Mismatch
**What goes wrong:** Fetching from `main` branch when repo uses `master`
**Why it happens:** Default branch names vary across repos
**How to avoid:** Try `main` first, fall back to `master` if 404
**Warning signs:** README content always null

### Pitfall 5: Score Field Not in Schema
**What goes wrong:** Code tries to write `score` to database but field does not exist
**Why it happens:** Current schema has no `score` or `syncedAt` field
**How to avoid:** Schema migration MUST be the first task in the plan
**Warning signs:** Prisma runtime error on first sync attempt

### Pitfall 6: Vercel Cron GET Only
**What goes wrong:** Implementing sync as POST but Vercel Cron only sends GET
**Why it happens:** Vercel Cron Jobs always send HTTP GET requests
**How to avoid:** Make sync route handle GET (for cron) and optionally POST (for manual trigger, but that's deferred)
**Warning signs:** Cron runs but sync never executes

## Code Examples

### Vercel Cron Configuration
```jsonc
// vercel.json - NEW FILE
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 2 * * *"
    }
  ]
}
```
[Source: Vercel Cron Jobs docs - https://vercel.com/docs/cron-jobs]
Note: `0 2 * * *` = 2:00 AM UTC daily. Adjust time as needed. Vercel crons always use UTC timezone.

### Prisma Schema Migration
```prisma
// Add to existing Tool model in schema.prisma:
model Tool {
  // ... existing fields ...
  score       Float?    // Weighted score for ranking (0-100)
  syncedAt    DateTime? // Last successful sync timestamp
  npmDownloads Int?     // Weekly npm download count

  @@index([score])     // For score-based sorting
}
```
[VERIFIED: Current schema has no score/npmDownloads/syncedAt fields; migration needed]

### npm Downloads Fetch
```typescript
// src/lib/npm-client.ts
interface NpmDownloadData {
  downloads: number;
  package: string;
  start: string;
  end: string;
}

async function fetchWeeklyDownloads(packageName: string): Promise<number> {
  const res = await fetch(
    `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`
  );
  if (!res.ok) {
    // 404 means package exists but has no downloads, or package not found
    if (res.status === 404) return 0;
    throw new Error(`npm API ${res.status}: ${res.statusText}`);
  }
  const data: NpmDownloadData = await res.json();
  return data.downloads;
}
```
[Source: npm registry API - https://github.com/npm/registry/blob/master/docs/download-counts.md]

### Scoring Algorithm
```typescript
// src/lib/scoring.ts
interface ScoreInput {
  stars: number;
  forks: number;
  lastCommitAt: Date | null;
  npmDownloads: number | null;
}

function computeScore(input: ScoreInput): number {
  // Stars: 0-40 points (logarithmic scale to compress range)
  // 10 stars ~ 10pts, 100 ~ 20pts, 1000 ~ 30pts, 10000+ ~ 40pts
  const starsScore = Math.min(40, 10 * Math.log10(Math.max(input.stars, 1)));

  // Activity: 0-20 points based on lastCommitAt recency
  const daysSinceCommit = input.lastCommitAt
    ? (Date.now() - input.lastCommitAt.getTime()) / (1000 * 60 * 60 * 24)
    : 365; // Default to 1 year ago if null
  const activityScore = Math.max(0, 20 - (daysSinceCommit / 30) * 2); // Lose 2pts per month

  // npm downloads: 0-20 points (logarithmic)
  const downloads = input.npmDownloads ?? 0;
  const downloadScore = downloads > 0
    ? Math.min(20, 4 * Math.log10(Math.max(downloads, 1)))
    : 0;

  // Forks/community: 0-20 points (logarithmic)
  const forksScore = Math.min(20, 5 * Math.log10(Math.max(input.forks, 1)));

  return Math.round((starsScore + activityScore + downloadScore + forksScore) * 10) / 10;
}
```
[ASSUMED: Logarithmic scale prevents mega-popular repos from drowning all others; exact thresholds are Claude's discretion per CONTEXT.md]

### Build Sort Integration
```typescript
// Update src/lib/api-utils.ts buildOrderBy function
// Add "score" case to the existing switch:
case 'score':
  return { score: 'desc' as const };
// Also update the default case to use score:
default:
  return { score: 'desc' as const }; // Changed from stars desc to score desc
```
[VERIFIED: Current buildOrderBy handles recent/rating/name/default; needs score case added]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GitHub API v3 without version header | API version `2022-11-28` header required | 2022 | Must include `X-GitHub-Api-Version` header |
| Vercel Cron in now.json | Vercel Cron in vercel.json `crons` array | Vercel Platform changes | Use new format with path + schedule |
| Linear scoring by stars | Weighted multi-signal scoring | N/A | Better ranking quality |
| Prisma 4/5 patterns | Prisma 7 with PrismaPg adapter | 2025-2026 | Use `@prisma/adapter-pg` pattern already in project |

**Deprecated/outdated:**
- GitHub API without Accept header: Use `application/vnd.github+json` [VERIFIED: GitHub docs]
- `vercel.json` with `builds`/`routes` arrays: Modern Vercel uses framework detection, only `crons` needed here

## Data Inventory

### Existing Tool Records (from seed.ts)
12 tools with these relevant fields pre-populated:
- `repoUrl`: 12/12 populated (5 with `/tree/` paths)
- `npmPackage`: 8/12 populated, 4 null (github-mcp-server, everything-claude-code, openclaw, one other)
- `stars`, `forks`, `openIssues`: seeded with initial values, will be overwritten by sync
- `lastCommitAt`: seeded, will be overwritten
- `featuresZh`, `featuresEn`: seeded as empty arrays `[]`, will be populated from README
- `installGuide`: seeded as null, will be populated from README

### Tools Requiring Special Handling

| Tool | repoUrl Format | npmPackage | Notes |
|------|---------------|------------|-------|
| Filesystem | `/tree/main/src/filesystem` | `@modelcontextprotocol/server-filesystem` | Monorepo subdir |
| Brave Search | `/tree/main/src/brave-search` | `@modelcontextprotocol/server-brave-search` | Monorepo subdir |
| GitHub MCP | standard | null (Go binary) | No npm data |
| PostgreSQL | standard | `@modelcontextprotocol/server-postgres` | Standard |
| Context7 | standard | `@upstash/context7-mcp` | Scoped package |
| Everything Claude Code | standard | null (local tool) | No npm data |
| Sequential Thinking | `/tree/main/src/sequentialthinking` | `@modelcontextprotocol/server-sequential-thinking` | Monorepo subdir |
| Slack | `/tree/main/src/slack` | `@modelcontextprotocol/server-slack` | Monorepo subdir |
| OpenClaw | standard | null (Python) | No npm data |
| Cloudflare | standard | `@cloudflare/mcp-server-cloudflare` | Scoped package |
| Memory | `/tree/main/src/memory` | `@modelcontextprotocol/server-memory` | Monorepo subdir |
| Playwright | standard | `@anthropic-ai/mcp-playwright` | Scoped package |

[VERIFIED: All data from seed.ts analysis]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | README markdown follows standard heading patterns (## Features, ## Installation) | README Parsing | Features/installGuide may be empty for many tools |
| A2 | Raw README available at `raw.githubusercontent.com/{owner}/{repo}/{branch}/README.md` | README Fetching | Some repos may use different README names or locations |
| A3 | Default branch is `main` with `master` fallback | README Fetching | Some repos may use other branch names |
| A4 | Logarithmic scoring scale prevents outlier dominance | Scoring Algorithm | May need linear or hybrid approach depending on actual data distribution |
| A5 | Vercel Cron supports `crons` array in vercel.json for this project's deployment | Vercel Cron | Need to verify project is deployed on Vercel (not just locally) |
| A6 | Prisma migration can add nullable Float/DateTime fields without data loss | Schema Migration | Safe for additive migration on non-empty tables |

## Open Questions

1. **GITHUB_TOKEN is empty in .env**
   - What we know: `.env` has `GITHUB_TOKEN=""`
   - What's unclear: Whether user has a token ready to populate, or needs instructions
   - Recommendation: Sync should work without token (60 req/hr unauthenticated) but log a warning. Document token setup.

2. **Verifying Vercel deployment**
   - What we know: Project uses Next.js 16 which is Vercel-compatible
   - What's unclear: Whether this specific project is deployed on Vercel
   - Recommendation: Create vercel.json anyway; it is harmless locally and required for production cron

3. **README content language**
   - What we know: D-03 mentions featuresZh and featuresEn
   - What's unclear: Whether MCP server READMEs have Chinese translations or if featuresZh should be machine-translated
   - Recommendation: Start with featuresEn from README; leave featuresZh as empty array or translate later

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 18+ (Next.js 16 requirement) | -- |
| GitHub API | Repo data + README | Yes (public) | REST v3 | Unauthenticated (60 req/hr) |
| npm Registry API | Download counts | Yes (public) | v1 | 0 downloads on failure |
| PostgreSQL (Supabase) | Tool data storage | Yes | Via pooler | -- |
| GITHUB_TOKEN | Auth for higher rate limit | No (empty) | -- | Proceed with unauthenticated |
| Vercel deployment | Cron jobs | Unknown | -- | Local dev can call sync endpoint manually |

**Missing dependencies with no fallback:**
- None that block development. GITHUB_TOKEN empty means lower rate limit (60/hr vs 5000/hr) but still functional for 12 tools.

**Missing dependencies with fallback:**
- Vercel deployment: vercel.json can be created and tested locally by calling `GET /api/sync` manually. Cron scheduling will only work in deployed environment.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 with ts-jest |
| Config file | `jest.config.ts` |
| Quick run command | `npx jest --passWithNoTests` |
| Full suite command | `npx jest` |

### Phase Requirements to Test Map

| Area | Behavior | Test Type | Automated Command | Priority |
|------|----------|-----------|-------------------|----------|
| parseRepoUrl | Extract owner/repo from standard and tree URLs | unit | `npx jest src/lib/__tests__/github-client.test.ts` | HIGH |
| fetchRepoData | Mock GitHub API response parsing | unit | `npx jest src/lib/__tests__/github-client.test.ts` | HIGH |
| fetchWeeklyDownloads | Mock npm API response parsing | unit | `npx jest src/lib/__tests__/npm-client.test.ts` | HIGH |
| computeScore | Score calculation with known inputs | unit | `npx jest src/lib/__tests__/scoring.test.ts` | HIGH |
| extractFeatures | README feature extraction | unit | `npx jest src/lib/__tests__/readme-parser.test.ts` | MEDIUM |
| extractInstallGuide | README install section extraction | unit | `npx jest src/lib/__tests__/readme-parser.test.ts` | MEDIUM |
| withRetry | Retry logic with mock failures | unit | `npx jest src/lib/__tests__/retry.test.ts` | MEDIUM |
| sync route | End-to-end sync with mocked APIs | integration | `npx jest src/app/api/sync/__tests__/route.test.ts` | MEDIUM |

### Sampling Rate
- **Per task commit:** `npx jest --passWithNoTests`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before phase completion

### Wave 0 Gaps
- [ ] `src/lib/__tests__/github-client.test.ts` -- covers parseRepoUrl, fetchRepoData
- [ ] `src/lib/__tests__/npm-client.test.ts` -- covers fetchWeeklyDownloads
- [ ] `src/lib/__tests__/scoring.test.ts` -- covers computeScore
- [ ] `src/lib/__tests__/readme-parser.test.ts` -- covers extractFeatures, extractInstallGuide
- [ ] `src/lib/__tests__/retry.test.ts` -- covers withRetry
- [ ] `src/app/api/sync/__tests__/route.test.ts` -- covers sync endpoint integration

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Bearer token via GITHUB_TOKEN env var (not hardcoded) |
| V3 Session Management | no | Stateless API, no sessions |
| V4 Access Control | yes | Sync endpoint should verify Vercel Cron user-agent or auth header |
| V5 Input Validation | yes | Validate owner/repo extracted from URLs before API calls |
| V6 Cryptography | no | No encryption needed; HTTPS for all external calls |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Sync endpoint abuse | Denial of Service | Verify `vercel-cron` user-agent or add bearer token |
| GITHUB_TOKEN exposure | Information Disclosure | Read from env var only, never log token value |
| GitHub API rate exhaustion | Denial of Service | Track remaining calls, stop early if below threshold |
| Malicious repoUrl in DB | Tampering | Validate URL format before constructing API calls |

## Sources

### Primary (HIGH confidence)
- GitHub REST API docs (repos endpoint) - response structure, auth headers, rate limits
- npm Registry API docs - download counts endpoint format
- Vercel Cron Jobs docs - configuration format, GET-only restriction, UTC timezone
- Project codebase: schema.prisma, seed.ts, api-utils.ts, route.ts, db.ts, package.json

### Secondary (MEDIUM confidence)
- Prisma 7 documentation (via project patterns in seed.ts)
- Next.js 16 API route patterns (via existing route.ts)

### Tertiary (LOW confidence)
- README markdown structure assumptions (varies per repo)
- Exact scoring formula thresholds (Claude's discretion, may need tuning)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in use in the project
- Architecture: HIGH - follows existing codebase patterns (Prisma upsert, API routes, fetch)
- GitHub/npm API: HIGH - verified from official docs
- README parsing: MEDIUM - patterns assumed from common MCP server READMEs
- Scoring algorithm: MEDIUM - formula is sound but thresholds may need tuning with real data
- Vercel Cron: HIGH - configuration is simple and well-documented

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable APIs, no fast-moving dependencies)
