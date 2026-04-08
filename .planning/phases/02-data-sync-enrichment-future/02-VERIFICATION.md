---
phase: 02-data-sync-enrichment-future
verified: 2026-04-08T04:30:00Z
status: human_needed
score: 21/22 must-haves verified
gaps:
  - truth: "Sync endpoint checks for Vercel Cron user-agent for security"
    status: partial
    reason: "Plan must_haves listed Vercel Cron user-agent check, but the implementation does not include it. The sync endpoint is publicly callable without any user-agent verification. This is a minor security concern -- the endpoint is idempotent (re-syncs same data) but still allows unauthenticated invocation."
    artifacts:
      - path: "src/app/api/sync/route.ts"
        issue: "No user-agent header check; anyone can trigger sync"
    missing:
      - "Add request.headers.get('user-agent') check for 'vercel-cron'; log warning if missing but still allow execution per plan spec"
human_verification:
  - test: "Trigger a real sync by calling GET /api/sync (or deploy and wait for Vercel Cron)"
    expected: "All 12 tools get updated with current GitHub/npm data; score, syncedAt, npmDownloads fields populated in database"
    why_human: "Requires live GitHub/npm API access and database connectivity; cannot verify real data flow without external services"
  - test: "Verify GITHUB_TOKEN is set in production Vercel environment"
    expected: "GITHUB_TOKEN environment variable configured for higher rate limits (5000 req/hr vs 60 unauthenticated)"
    why_human: "Environment variable configuration is outside codebase; requires Vercel dashboard access"
---

# Phase 2: Data Sync & Enrichment Verification Report

**Phase Goal:** Automate tool data collection from GitHub and npm -- sync existing 12 tools' metadata daily, compute weighted ranking scores, and wire scores into the API sort system.
**Verified:** 2026-04-08T04:30:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Schema has score, syncedAt, and npmDownloads fields on Tool model | VERIFIED | prisma/schema.prisma lines 63-65: score Float?, syncedAt DateTime?, npmDownloads Int?; @@index([score]) line 80 |
| 2 | GitHub client can parse both standard and /tree/ URLs into owner/repo | VERIFIED | src/lib/github-client.ts: parseRepoUrl uses URL constructor, checks hostname === 'github.com', extracts parts[0] and parts[1]; test verifies both standard and tree-path URLs |
| 3 | GitHub client fetches repo data with auth headers and rate limit tracking | VERIFIED | src/lib/github-client.ts: getHeaders() adds Bearer token when GITHUB_TOKEN is set; fetchRepoData logs warning when x-ratelimit-remaining < 100; test confirms both behaviors |
| 4 | npm client fetches weekly download counts for a package name | VERIFIED | src/lib/npm-client.ts: fetchWeeklyDownloads calls api.npmjs.org with encodeURIComponent; returns 0 on 404; test confirms URL encoding for scoped packages |
| 5 | README parser extracts features list and install guide from markdown | VERIFIED | src/lib/readme-parser.ts: extractFeatures matches ## Features/What it does/Capabilities; extractInstallGuide matches ## Installation/Install/Setup/Getting Started; 11 tests pass |
| 6 | Retry wrapper retries transient failures up to 3 times with backoff | VERIFIED | src/lib/retry.ts: withRetry with exponential backoff (1s, 2s, 4s capped at 10s); 5 tests pass covering success, retry, and max-retries |
| 7 | All new modules have passing unit tests | VERIFIED | 87 tests pass across 9 test suites; full suite: 119 pass, 0 fail |
| 8 | computeScore produces a value between 0-100 from stars, forks, lastCommitAt, npmDownloads | VERIFIED | src/lib/scoring.ts: logarithmic stars (0-40), activity decay (0-20), npm downloads (0-20), forks (0-20); 12 unit tests cover all components |
| 9 | Stars contribute up to 40 points (logarithmic scale) | VERIFIED | 10 * Math.log10(max(stars,1)), capped at 40; test: 10000 stars = 40.0, 10 stars = 10.0 |
| 10 | Activity contributes up to 20 points (decays with commit age) | VERIFIED | Linear decay: 30 days = 20pts, 365 days = 0pts; tests confirm boundaries |
| 11 | npm downloads contribute up to 20 points (logarithmic scale) | VERIFIED | 4 * Math.log10(max(downloads,1)), capped at 20; test: 10000 downloads = 16.0 |
| 12 | Forks contribute up to 20 points (logarithmic scale) | VERIFIED | 5 * Math.log10(max(forks,1)), capped at 20; test: 1000 forks = 15.0 |
| 13 | API tools endpoint supports sort=score | VERIFIED | src/lib/api-utils.ts line 86: case "score" returns { score: "desc" } |
| 14 | Default sort uses score instead of stars | VERIFIED | src/lib/api-utils.ts line 89: default case returns { score: "desc" as const }; previously was { stars: "desc" } |
| 15 | Score is NOT exposed in API responses (per D-06) | VERIFIED | src/lib/api-utils.ts line 106: const { categories, platforms, score, syncedAt, npmDownloads, ...rest } = tool; destructured out |
| 16 | GET /api/sync triggers data sync for all 12 existing tools | VERIFIED | src/app/api/sync/route.ts: prisma.tool.findMany with status in ["ACTIVE", "FEATURED"]; loops through all tools |
| 17 | Each tool sync fetches GitHub repo data, README, and npm downloads independently | VERIFIED | Promise.allSettled for parallel fetches; each tool in its own try/catch loop |
| 18 | Individual tool failures do not block other tools from syncing | VERIFIED | Per-tool try/catch (lines 36-128); test verifies: first tool fails, second succeeds, synced=1 failed=1 |
| 19 | Failed fetches retry up to 3 times before giving up | VERIFIED | withRetry wraps fetchRepoData, fetchReadme, fetchWeeklyDownloads calls |
| 20 | Sync results are logged per tool (success or failure with error) | VERIFIED | console.log JSON.stringify({event, synced, failed, durationMs, results}) at line 136 |
| 21 | Score is computed and stored for each synced tool | VERIFIED | computeScore called with GitHub data + npm downloads; prisma.tool.update includes score field |
| 22 | syncedAt timestamp is updated for each successfully synced tool | VERIFIED | prisma.tool.update data includes syncedAt: new Date() at line 116 |
| 23 | Vercel Cron triggers sync once daily at 2:00 AM UTC | VERIFIED | vercel.json: path "/api/sync", schedule "0 2 * * *" |
| 24 | Sync endpoint checks for Vercel Cron user-agent for security | PARTIAL | Not implemented. Route does not inspect user-agent header. Anyone can trigger /api/sync. Plan must_haves specified this check. Endpoint is idempotent so risk is low. |

**Score:** 21/22 truths verified (1 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| prisma/schema.prisma | Tool model with score, syncedAt, npmDownloads fields | VERIFIED | All 3 fields present (lines 63-65) with @@index([score]) (line 80) |
| src/lib/github-client.ts | GitHub REST API wrapper with auth, URL parsing, rate limit | VERIFIED | Exports: parseRepoUrl, fetchRepoData, fetchReadme, GitHubRepoData; 8 tests |
| src/lib/npm-client.ts | npm download count fetcher | VERIFIED | Exports: fetchWeeklyDownloads; 4 tests |
| src/lib/readme-parser.ts | README markdown feature and install guide extraction | VERIFIED | Exports: extractFeatures, extractInstallGuide; 11 tests |
| src/lib/retry.ts | Retry with exponential backoff | VERIFIED | Exports: withRetry; 5 tests |
| src/lib/scoring.ts | Weighted scoring algorithm | VERIFIED | Exports: computeScore, ScoreInput; 12 tests |
| src/lib/api-utils.ts | Updated buildOrderBy with score sort | VERIFIED | case "score" added; default changed to score; mapToolResponse excludes internal fields |
| src/app/api/sync/route.ts | GET sync endpoint with per-tool isolation | VERIFIED | All 6 imports wired; per-tool try/catch; Promise.allSettled; score + syncedAt storage |
| vercel.json | Vercel Cron configuration | VERIFIED | crons[0].path="/api/sync", schedule="0 2 * * *" |
| __tests__/api/sync.test.ts | Integration-style tests for sync endpoint | VERIFIED | 6 tests: success, invalid URL, no npm, isolation, empty list, fatal error |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| sync/route.ts | github-client.ts | import parseRepoUrl, fetchRepoData, fetchReadme | WIRED | Line 3 |
| sync/route.ts | npm-client.ts | import fetchWeeklyDownloads | WIRED | Line 4 |
| sync/route.ts | readme-parser.ts | import extractFeatures, extractInstallGuide | WIRED | Line 5 |
| sync/route.ts | retry.ts | import withRetry | WIRED | Line 6 |
| sync/route.ts | scoring.ts | import computeScore | WIRED | Line 7 |
| sync/route.ts | db.ts | import prisma | WIRED | Line 1 |
| vercel.json | /api/sync | crons path | WIRED | path: "/api/sync" |
| github-client.ts | GITHUB_TOKEN env | process.env.GITHUB_TOKEN | WIRED | Line 8, used in getHeaders() line 17 |
| npm-client.ts | api.npmjs.org | fetch URL | WIRED | Line 22 |
| api-utils.ts | scoring.ts | buildOrderBy case 'score' | WIRED | Line 86-87 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| sync/route.ts | repoData | fetchRepoData() via GitHub API | Yes -- returns stargazers_count, forks_count, etc. from live API | FLOWING |
| sync/route.ts | readmeContent | fetchReadme() via raw.githubusercontent.com | Yes -- returns README markdown text | FLOWING |
| sync/route.ts | npmDownloads | fetchWeeklyDownloads() via npm API | Yes -- returns download count from live API | FLOWING |
| sync/route.ts | features | extractFeatures(readmeContent) | Yes -- parses real README content | FLOWING |
| sync/route.ts | score | computeScore({stars, forks, lastCommitAt, npmDownloads}) | Yes -- computed from real GitHub/npm data | FLOWING |
| sync/route.ts | DB update | prisma.tool.update() | Yes -- writes all fetched + computed fields to database | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All Phase 2 tests pass | npx jest __tests__/lib/ __tests__/api/sync.test.ts | 87 tests passed, 0 failed | PASS |
| Full suite no regressions | npx jest --passWithNoTests | 119 passed, 0 failed, 3 skipped | PASS |
| computeScore returns correct range | (verified via test code review) | 12 tests covering 0-100 range, boundaries, decay | PASS |
| vercel.json valid JSON with cron | cat vercel.json | {"crons":[{"path":"/api/sync","schedule":"0 2 * * *"}]} | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ROADMAP-02 | 02-01, 02-02, 02-03 | Data sync and enrichment pipeline -- GitHub/npm data fetching, weighted scoring algorithm, daily automated sync via Vercel Cron | SATISFIED | All 3 plans implemented: schema + clients, scoring + sort, sync endpoint + cron |

**Orphaned requirements:** None. REQUIREMENTS.md does not map any additional IDs to Phase 2 beyond ROADMAP-02.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No blockers, warnings, or notable anti-patterns detected |

Clean scan results:
- No TODO/FIXME/PLACEHOLDER comments in any Phase 2 source files
- No empty/stub implementations (all return values are substantive)
- console.log/warn/error usage is appropriate for sync infrastructure (background job logging)
- return null in parseRepoUrl is correct behavior for invalid URLs (not a stub)

### Human Verification Required

### 1. Live Sync End-to-End Test

**Test:** Deploy to Vercel (or run locally with database connection) and call GET /api/sync
**Expected:** All 12 tools get updated with current GitHub stars, forks, issues, lastCommitAt, npm downloads, computed score, and syncedAt timestamp. The tools API returns data sorted by score by default.
**Why human:** Requires live GitHub/npm API access and Supabase database connectivity; cannot verify real data flow without external services and network access.

### 2. Production Environment Configuration

**Test:** Verify GITHUB_TOKEN is set in Vercel production environment variables
**Expected:** GITHUB_TOKEN populated with a valid GitHub personal access token for 5000 req/hr rate limit
**Why human:** Environment variable configuration is outside the codebase; requires Vercel dashboard or CLI access. Currently empty in .env -- sync works at 60 req/hr unauthenticated but should be configured for production.

### Gaps Summary

One partial gap identified: the sync endpoint does not check for Vercel Cron user-agent. The plan's must_haves listed this as a truth ("Sync endpoint checks for Vercel Cron user-agent for security"), and the plan's behavior section stated it should check and log a warning for non-cron callers. The implementation omits this check entirely, making the endpoint publicly triggerable without any caller identification.

This is a low-severity gap because:
1. The endpoint is idempotent (re-syncing same data causes no harm)
2. It only reads from external APIs and writes to own database
3. No user data or secrets are exposed in the response
4. Rate limiting and abuse protection can be added later

However, for production security hygiene, adding the user-agent check (with warning log for non-cron callers) is recommended.

---

_Verified: 2026-04-08T04:30:00Z_
_Verifier: Claude (gsd-verifier)_
