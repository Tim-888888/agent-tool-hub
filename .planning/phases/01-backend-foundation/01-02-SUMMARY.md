---
phase: 01-backend-foundation
plan: 02
subsystem: api
tags: [nextjs, route-handlers, rest, pagination, filtering, prisma]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Active Prisma client singleton (src/lib/db.ts) and database schema"
provides:
  - "7 GET API endpoints for tools and categories with pagination, filtering, sorting"
  - "Shared API utilities module (parsePagination, buildWhereClause, buildOrderBy, mapToolResponse)"
  - "Consistent { success, data, meta } response envelope across all endpoints"
affects: [01-03, 01-04, frontend-data]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Route Handler pattern with shared utilities", "Prisma join-table flattening via mapToolResponse", "Promise-based dynamic params (Next.js 16)", "Consistent API envelope pattern"]

key-files:
  created:
    - "src/lib/api-utils.ts"
    - "src/app/api/tools/route.ts"
    - "src/app/api/tools/[slug]/route.ts"
    - "src/app/api/tools/search/route.ts"
    - "src/app/api/tools/trending/route.ts"
    - "src/app/api/tools/newest/route.ts"
    - "src/app/api/categories/route.ts"
    - "src/app/api/categories/[slug]/route.ts"
  modified: []

key-decisions:
  - "Search endpoint duplicates tools list logic (shared via same helper functions) rather than importing from tools route to avoid circular dependency risk"
  - "mapToolResponse uses explicit destructuring to flatten join tables rather than object spread mutation"

patterns-established:
  - "All API routes import shared helpers from @/lib/api-utils"
  - "All responses use successResponse/errorResponse envelope wrappers"
  - "Dynamic routes use Promise params pattern with await (Next.js 16)"
  - "Tool queries always use TOOL_PRISMA_INCLUDE constant for consistent relation loading"
  - "Error responses never expose stack traces (generic messages only)"

requirements-completed: [REQ-03, REQ-04]

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 1 Plan 2: API Route Handlers Summary

**7 RESTful API endpoints with pagination, filtering, sorting, and join-table flattening using shared utility layer and Next.js 16 Route Handler conventions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-07T15:37:11Z
- **Completed:** 2026-04-07T15:40:11Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created shared API utilities module with pagination parsing, Prisma where/order builders, join-table flattening, and response envelope helpers
- Implemented 7 GET API endpoints: tools list (paginated/filtered/sorted), tool detail, search, trending, newest, categories list with counts, category detail with tools
- All endpoints use Next.js 16 conventions (Promise params, Response.json, no NextResponse)
- TypeScript compilation passes, Next.js build succeeds, all 41 existing tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared API utilities and mapping layer** - `136185f` (feat)
2. **Task 2: Create all API route handlers** - `d1a271f` (feat)

## Files Created/Modified
- `src/lib/api-utils.ts` - Shared helpers: parsePagination, buildWhereClause, buildOrderBy, mapToolResponse, TOOL_PRISMA_INCLUDE, successResponse, errorResponse
- `src/app/api/tools/route.ts` - GET /api/tools: paginated list with filtering and sorting
- `src/app/api/tools/[slug]/route.ts` - GET /api/tools/[slug]: tool detail with flattened categories/platforms (404 if missing)
- `src/app/api/tools/search/route.ts` - GET /api/tools/search: filtered search with same query params as tools list
- `src/app/api/tools/trending/route.ts` - GET /api/tools/trending: 6 tools sorted by lastCommitAt desc
- `src/app/api/tools/newest/route.ts` - GET /api/tools/newest: 6 tools sorted by createdAt desc
- `src/app/api/categories/route.ts` - GET /api/categories: all categories with tool counts
- `src/app/api/categories/[slug]/route.ts` - GET /api/categories/[slug]: category detail with associated tools

## Decisions Made
- Search endpoint uses the same helper functions as tools list (parsePagination, buildWhereClause, buildOrderBy) rather than importing the GET handler directly, to avoid coupling between route modules
- mapToolResponse defensively handles null/undefined categories and platforms arrays with fallback to empty arrays
- TOOL_PRISMA_INCLUDE exported as const for consistent relation loading across all tool queries
- Error responses use generic messages ("Failed to fetch tools") to avoid leaking internal details (per threat model T-02-04)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Database must be accessible before API routes return data. See 01-01-SUMMARY.md for Supabase project restoration steps. All code is correct and will function once the database is reachable.

## Next Phase Readiness
- All 7 API endpoints ready for frontend consumption
- Shared utility layer (api-utils.ts) available for reuse in future routes
- Requires live database (from 01-01) to return actual data
- All 41 existing tests green, Next.js build passes

---
*Phase: 01-backend-foundation*
*Completed: 2026-04-07*

## Self-Check: PASSED

- FOUND: src/lib/api-utils.ts
- FOUND: src/app/api/tools/route.ts
- FOUND: src/app/api/tools/[slug]/route.ts
- FOUND: src/app/api/tools/search/route.ts
- FOUND: src/app/api/tools/trending/route.ts
- FOUND: src/app/api/tools/newest/route.ts
- FOUND: src/app/api/categories/route.ts
- FOUND: src/app/api/categories/[slug]/route.ts
- FOUND: 136185f in git log
- FOUND: d1a271f in git log
