---
phase: 01-backend-foundation
plan: 04
subsystem: testing
tags: [jest, api-tests, seed-tests, integration-tests, prisma-mocking]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Prisma client singleton (src/lib/db.ts) and seed script (prisma/seed.ts)"
  - phase: 01-02
    provides: "7 API endpoints with shared utilities (src/lib/api-utils.ts)"
provides:
  - "32 new unit tests covering all 7 API route handlers with mocked Prisma"
  - "6 unit tests for seed script verifying upsert idempotency"
  - "3 integration tests (skipped without DATABASE_URL) for seed->API data flow"
  - "Jest node environment pattern for API route testing (bypasses jsdom limitations)"
affects: [01-01, regression-safety]

# Tech tracking
tech-stack:
  added: []
  patterns: ["@jest-environment node docblock for API route tests", "Prisma mock factory with __mocks export for hoist-safe mocking", "require.main === module guard for testable seed scripts"]

key-files:
  created:
    - "__tests__/api/tools.test.ts"
    - "__tests__/api/tools-slug.test.ts"
    - "__tests__/api/categories.test.ts"
    - "__tests__/api/tools-trending.test.ts"
    - "__tests__/seed.test.ts"
    - "__tests__/integration/seed-api.test.ts"
  modified:
    - "prisma/seed.ts"

key-decisions:
  - "API route tests use @jest-environment node docblock instead of jsdom polyfills (jsdom lacks Request/Response constructors)"
  - "Seed script refactored to export seedMain() with require.main guard to prevent auto-execution on import"
  - "Seed test mocks defined inside jest.mock() factory with __mocks export to avoid Jest hoisting issues"
  - "Integration tests use describe.skip when DATABASE_URL is absent"

patterns-established:
  - "Per-file @jest-environment node docblock for server-side test files"
  - "Mock factory with __mocks export pattern for complex Prisma mocking"
  - "describe.skip / describe.skipIf pattern for environment-dependent tests"

requirements-completed: [REQ-06]

# Metrics
duration: 22min
completed: 2026-04-07
---

# Phase 1 Plan 4: API & Seed Tests Summary

**32 unit tests for 7 API route handlers plus 6 seed script tests and 3 integration tests, all using Prisma mocking with @jest-environment node to bypass jsdom Fetch API gaps**

## Performance

- **Duration:** 22 min
- **Started:** 2026-04-07T15:58:46Z
- **Completed:** 2026-04-07T16:21:06Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created comprehensive unit tests for all API route handlers covering pagination, filtering, sorting, error handling, and response mapping
- Created seed script unit tests verifying upsert counts for platforms (7), categories (12), tools (12), join table entries, and idempotent re-runs
- Created integration test suite that verifies seed -> API -> data flow (auto-skips without database)
- Refactored seed.ts to export seedMain() for testability while preserving direct-run behavior
- All 73 active tests pass (41 existing + 32 new), 3 integration tests skip gracefully

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unit tests for API route handlers** - `a41f86a` (test)
2. **Task 2: Create seed script tests and integration test** - `3050d6d` (test)

## Files Created/Modified
- `__tests__/api/tools.test.ts` - 14 tests: GET /api/tools (pagination, filtering, sorting, errors, flattening)
- `__tests__/api/tools-slug.test.ts` - 4 tests: GET /api/tools/[slug] (detail, 404, flattening, errors)
- `__tests__/api/categories.test.ts` - 3 tests: GET /api/categories (ordering, tool counts, errors)
- `__tests__/api/tools-trending.test.ts` - 9 tests: trending/newest endpoints (ordering, limits, status filters)
- `__tests__/seed.test.ts` - 6 tests: seed upsert counts, join tables, idempotency
- `__tests__/integration/seed-api.test.ts` - 3 tests: full seed->API data flow (skips without DB)
- `prisma/seed.ts` - Exported seedMain(), added require.main guard

## Decisions Made
- Used `@jest-environment node` docblock on API test files instead of trying to polyfill Request/Response into jsdom (jsdom does not provide these constructors and polyfills proved unreliable)
- Refactored seed.ts to export `seedMain()` with `require.main === module` guard so the auto-execute block only runs when invoked directly via `npx tsx prisma/seed.ts`
- Used inline mock factory with `__mocks` export pattern in seed tests to avoid Jest hoisting issues where `const` mock declarations are not yet initialized when `jest.mock()` factories execute
- Integration tests use `describe.skip` when `DATABASE_URL` is not set, following the plan's requirement for zero-config CI safety

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jsdom environment lacks Request/Response constructors**
- **Found during:** Task 1 (API test execution)
- **Issue:** Jest config uses jsdom test environment which does not provide Web Fetch API globals (Request, Response, Headers, FormData). Node.js v24 ships these natively, but jsdom replaces the global scope with its own window object that lacks them.
- **Fix:** Added `@jest-environment node` docblock pragma to all API test files. API route handlers are server-side code with no DOM dependency, so the node environment is the correct choice.
- **Files modified:** All 4 API test files + integration test file
- **Verification:** All tests pass in node environment
- **Committed in:** a41f86a (Task 1 commit)

**2. [Rule 3 - Blocking] Seed script auto-executes on import**
- **Found during:** Task 2 (seed test execution)
- **Issue:** `prisma/seed.ts` calls `seedMain()` at module scope via IIFE, which triggers database operations during `import { seedMain } from '../prisma/seed'` in tests
- **Fix:** Wrapped the auto-execute block with `if (require.main === module)` guard. Renamed `main()` to `seedMain()` and exported it. The script still runs normally via `npx tsx prisma/seed.ts` but does not auto-execute when imported.
- **Files modified:** prisma/seed.ts
- **Verification:** Seed tests import seedMain without side effects, existing seed workflow unchanged
- **Committed in:** 3050d6d (Task 2 commit)

**3. [Rule 3 - Blocking] Jest mock hoisting prevents const-based mock references**
- **Found during:** Task 2 (seed test execution)
- **Issue:** `jest.mock()` calls are hoisted above `const` declarations by Jest's transform, causing "Cannot access before initialization" errors when mock factory references `const mockFn = jest.fn()`
- **Fix:** Defined all mock functions inside the `jest.mock()` factory function and attached them to the module via a `__mocks` property. Tests then extract references via `require('@prisma/client').__mocks`.
- **Files modified:** __tests__/seed.test.ts
- **Verification:** All 6 seed tests pass
- **Committed in:** 3050d6d (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 blocking - environment/tooling configuration)
**Impact on plan:** All fixes were necessary to work with Jest's jsdom limitations and module system. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All API routes and seed logic fully tested with mocked Prisma
- Integration tests ready to run when database is accessible
- Test count increased from 41 to 73 active tests (+32 new)
- All tests green, no database dependency in unit tests
- Phase 01 complete (all 4 plans executed)

---
*Phase: 01-backend-foundation*
*Completed: 2026-04-07*

## Self-Check: PASSED

- FOUND: __tests__/api/tools.test.ts
- FOUND: __tests__/api/tools-slug.test.ts
- FOUND: __tests__/api/categories.test.ts
- FOUND: __tests__/api/tools-trending.test.ts
- FOUND: __tests__/seed.test.ts
- FOUND: __tests__/integration/seed-api.test.ts
- FOUND: a41f86a in git log
- FOUND: 3050d6d in git log
