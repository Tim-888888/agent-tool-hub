---
phase: 02-data-sync-enrichment-future
plan: 01
subsystem: database, api
tags: [prisma, github-api, npm-registry, fetch, retry, markdown-parser]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Tool model in Prisma schema, db.ts singleton, api-utils helpers"
provides:
  - "Tool model with score, syncedAt, npmDownloads fields"
  - "github-client.ts: parseRepoUrl, fetchRepoData, fetchReadme"
  - "npm-client.ts: fetchWeeklyDownloads"
  - "readme-parser.ts: extractFeatures, extractInstallGuide"
  - "retry.ts: withRetry with exponential backoff"
  - "28 unit tests across 4 test files"
affects: [02-data-sync-enrichment-future]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Native fetch for external APIs", "URL-based hostname validation for parseRepoUrl", "Exponential backoff retry wrapper"]

key-files:
  created:
    - src/lib/github-client.ts
    - src/lib/npm-client.ts
    - src/lib/readme-parser.ts
    - src/lib/retry.ts
    - __tests__/lib/github-client.test.ts
    - __tests__/lib/npm-client.test.ts
    - __tests__/lib/readme-parser.test.ts
    - __tests__/lib/retry.test.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Used URL constructor for hostname validation in parseRepoUrl instead of regex (rejects not-github.com)"
  - "Used real timers in retry tests instead of fake timers to avoid unhandled promise rejection issues"
  - "No new dependencies added - all HTTP via native fetch"

patterns-established:
  - "External API clients: getHeaders() helper for auth, per-response rate limit tracking"
  - "README parsing: regex-based section extraction under ## headings"
  - "Test pattern: @jest-environment node for tests using fetch API"

requirements-completed: [ROADMAP-02]

# Metrics
duration: 8min
completed: 2026-04-08
---

# Phase 2 Plan 01: Schema Migration & Data Client Modules Summary

**Prisma schema extended with score/syncedAt/npmDownloads fields plus 4 native-fetch API client modules (GitHub, npm, README parser, retry) with 28 passing tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-08T04:00:37Z
- **Completed:** 2026-04-08T04:08:43Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Prisma schema migrated with 3 new nullable fields (score, syncedAt, npmDownloads) and a score index -- applied via `prisma db push` without data loss
- GitHub client with parseRepoUrl (handles standard and /tree/ URLs), fetchRepoData (auth headers, rate limit tracking), and fetchReadme (main/master fallback)
- npm client with fetchWeeklyDownloads (404 returns 0, proper URL encoding for scoped packages)
- README parser with extractFeatures (Features/What it does/Capabilities headings) and extractInstallGuide (Installation/Install/Setup/Getting Started headings)
- Retry wrapper with exponential backoff (1s, 2s, 4s capped at 10s)
- 28 unit tests across 4 test files, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add score, syncedAt, npmDownloads fields to Prisma schema** - `8c99298` (feat)
2. **Task 2: Create github-client, npm-client, readme-parser, and retry modules with tests** - `f145fee` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added score Float?, syncedAt DateTime?, npmDownloads Int?, @@index([score])
- `src/lib/github-client.ts` - GitHub REST API wrapper with auth, URL parsing, rate limit tracking
- `src/lib/npm-client.ts` - npm weekly download count fetcher
- `src/lib/readme-parser.ts` - README markdown feature and install guide extraction
- `src/lib/retry.ts` - Retry with exponential backoff
- `__tests__/lib/github-client.test.ts` - 8 tests for parseRepoUrl and fetchRepoData
- `__tests__/lib/npm-client.test.ts` - 4 tests for fetchWeeklyDownloads
- `__tests__/lib/readme-parser.test.ts` - 11 tests for extractFeatures and extractInstallGuide
- `__tests__/lib/retry.test.ts` - 5 tests for withRetry

## Decisions Made
- Used `new URL()` constructor for hostname validation in parseRepoUrl instead of regex -- regex `github\.com` would match `not-github.com` substring, URL parsing ensures exact hostname match
- Used real timers in retry tests instead of fake timers -- fake timers with async retries caused unhandled promise rejection issues in Jest
- All external API calls use native fetch (no axios/got) per D-11 and research recommendation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed parseRepoUrl matching non-GitHub domains**
- **Found during:** Task 2 (test failure)
- **Issue:** Regex `/github\.com/` matched `not-github.com` because `github.com` is a substring
- **Fix:** Replaced regex with `new URL()` parsing that checks `url.hostname === 'github.com'` exactly
- **Files modified:** src/lib/github-client.ts
- **Verification:** Test for `https://not-github.com/foo/bar` now returns null as expected
- **Committed in:** f145fee (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minimal -- improved correctness of URL validation. No scope creep.

## Issues Encountered
- Jest fake timers with async retry logic caused unhandled promise rejections -- resolved by using real timers with default short backoff delays

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All data fetching client modules ready for sync route implementation (Plan 02)
- Schema fields ready for scoring algorithm (Plan 02)
- GITHUB_TOKEN in .env is still empty -- sync will work at 60 req/hr unauthenticated but should be populated for production

## Self-Check: PASSED

All 8 created files exist. Both commits (8c99298, f145fee) found in git log.

---
*Phase: 02-data-sync-enrichment-future*
*Completed: 2026-04-08*
