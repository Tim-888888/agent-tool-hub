---
phase: 02-data-sync-enrichment-future
plan: 03
subsystem: api, infra
tags: [vercel-cron, sync, github-api, npm-registry, scoring, prisma]

# Dependency graph
requires:
  - phase: 02-data-sync-enrichment-future
    provides: "github-client, npm-client, readme-parser, retry modules and score/syncedAt/npmDownloads schema fields"
provides:
  - "GET /api/sync endpoint orchestrating GitHub/npm data sync for all tools"
  - "vercel.json with daily cron config (0 2 * * * UTC)"
  - "scoring.ts placeholder with computeScore implementation"
  - "6 integration tests for sync endpoint"
affects: [02-data-sync-enrichment-future]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Per-tool error isolation via try/catch in sync loop", "Promise.allSettled for parallel external fetches", "Vercel Cron configuration in vercel.json"]

key-files:
  created:
    - src/app/api/sync/route.ts
    - vercel.json
    - src/lib/scoring.ts
    - __tests__/api/sync.test.ts
  modified: []

key-decisions:
  - "scoring.ts created as placeholder with full computeScore implementation (Plan 02-02 may provide its own version)"
  - "Promise.allSettled used for parallel GitHub/README/npm fetches within each tool to avoid one failed fetch blocking others"
  - "withRetry mock simply delegates to fn() to test sync logic without retry delays"

patterns-established:
  - "Sync route: sequential tool loop with per-tool try/catch, parallel external fetches within each tool"
  - "Integration test pattern: mock all external modules via jest.mock, import mocked functions for mock setup"

requirements-completed: [ROADMAP-02]

# Metrics
duration: 10min
completed: 2026-04-08
---

# Phase 2 Plan 03: Sync API Endpoint & Vercel Cron Summary

**GET /api/sync endpoint with per-tool error isolation, parallel GitHub/npm/README fetching, score computation, and Vercel Cron daily trigger at 2 AM UTC**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-08T04:14:05Z
- **Completed:** 2026-04-08T04:24:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Sync endpoint orchestrates all data clients (GitHub, npm, README parser, scoring) into a unified sync flow
- Per-tool error isolation ensures one broken repo does not abort the batch (D-12)
- Vercel Cron configured for daily automatic sync (D-09, D-10)
- 6 integration tests covering success, invalid URL, no npmPackage, per-tool isolation, empty list, fatal error

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sync API endpoint with per-tool isolation** - `0546a3c` (feat)
2. **Task 2: Create sync route integration tests** - `2fd45ad` (test)

**Infra commit:** `86522ec` (chore: jest config in worktree)

## Files Created/Modified
- `src/app/api/sync/route.ts` - GET handler: fetches all ACTIVE/FEATURED tools, syncs each with GitHub/npm data, computes score, updates DB
- `vercel.json` - Vercel Cron config: /api/sync daily at 0 2 * * *
- `src/lib/scoring.ts` - Placeholder computeScore with full D-05 implementation (Plan 02-02 may replace)
- `__tests__/api/sync.test.ts` - 6 integration tests with all external deps mocked

## Decisions Made
- Created scoring.ts as a complete implementation since Plan 02-02 (parallel agent) had not yet written it -- the full computeScore formula is included rather than a stub
- Used Promise.allSettled (not Promise.all) so that a failed README or npm fetch does not prevent repo data from being used
- withRetry mock in tests delegates directly to the callback function to avoid retry delay overhead

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created scoring.ts placeholder for missing dependency**
- **Found during:** Task 1 (compilation dependency)
- **Issue:** scoring.ts did not exist yet -- Plan 02-02 (parallel agent) creates it
- **Fix:** Created src/lib/scoring.ts with full computeScore implementation matching Plan 02-02 specification
- **Files modified:** src/lib/scoring.ts
- **Verification:** All 6 sync tests pass, full suite passes (66 tests)
- **Committed in:** 0546a3c (Task 1 commit)

**2. [Rule 3 - Blocking] Copied jest.config.ts to worktree**
- **Found during:** Task 2 (test infrastructure)
- **Issue:** Worktree lacked jest.config.ts, causing Jest to use babel-jest instead of ts-jest
- **Fix:** Copied jest.config.ts and jest.setup.ts from main repo to worktree
- **Files modified:** jest.config.ts, jest.setup.ts
- **Verification:** Tests run with ts-jest transform, all pass
- **Committed in:** 86522ec

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were infrastructure necessities. No scope creep.

## Issues Encountered
- Worktree lacked jest.config.ts, causing Babel parsing errors on TypeScript syntax in test files -- resolved by copying config from main repo

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sync endpoint ready for production deployment
- Vercel Cron will auto-trigger daily once deployed
- GITHUB_TOKEN in .env is still empty -- sync works at 60 req/hr unauthenticated but should be populated for production (5000 req/hr)
- Scoring algorithm wired in -- tools will be ranked by composite score after first sync

## Self-Check: PASSED

All 5 created files found. All 3 commits (0546a3c, 2fd45ad, 86522ec) found in git log.

---
*Phase: 02-data-sync-enrichment-future*
*Completed: 2026-04-08*
