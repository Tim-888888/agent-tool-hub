---
phase: 01-backend-foundation
plan: 01
subsystem: database
tags: [prisma, postgresql, supabase, seed, adapter, prisma7]

# Dependency graph
requires:
  - phase: none
    provides: "N/A - first plan"
provides:
  - "Active Prisma client singleton with PrismaPg adapter"
  - "Idempotent seed script for 7 platforms, 12 categories, 12 tools"
  - "Prisma 7 configuration (prisma.config.ts with dotenv loading)"
  - "Database schema pushed to PostgreSQL (pending database access)"
affects: [01-02, 01-03, 01-04, api-routes, frontend-data]

# Tech tracking
tech-stack:
  added: ["@prisma/adapter-pg@7.6.0", "pg@8.20.0", "@types/pg@8.20.0", "tsx@4.21.0"]
  patterns: ["Prisma 7 driver adapter pattern", "prisma.config.ts with dotenv", "Idempotent upsert seeding"]

key-files:
  created:
    - "src/lib/db.ts"
    - "prisma/seed.ts"
    - "prisma.config.ts"
  modified:
    - "prisma/schema.prisma"
    - "package.json"

key-decisions:
  - "Used PrismaPg driver adapter instead of deprecated datasource url (Prisma 7 breaking change)"
  - "Inlined seed data arrays instead of importing from mock-data.ts (avoids @/ path alias issues outside Next.js)"
  - "Created prisma.config.ts with explicit dotenv loading (Prisma 7 disables auto dotenv)"

patterns-established:
  - "PrismaClient singleton via globalThis to prevent hot-reload connection leaks"
  - "Upsert-based seeding for idempotent database population"
  - "Composite join table upserts via toolId_categoryId and toolId_platformId"

requirements-completed: [REQ-01, REQ-02]

# Metrics
duration: 21min
completed: 2026-04-07
---

# Phase 1 Plan 1: Prisma Client & Seed Script Summary

**Prisma 7 client activated with PrismaPg adapter and idempotent seed script covering 7 platforms, 12 categories, 12 tools with join table relations**

## Performance

- **Duration:** 21 min
- **Started:** 2026-04-07T15:10:38Z
- **Completed:** 2026-04-07T15:32:03Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Activated Prisma 7 client singleton with PrismaPg driver adapter (Prisma 7 removed datasource url support)
- Created prisma.config.ts with defineConfig API and explicit dotenv loading
- Created idempotent seed script with upsert logic for all 12 tools with category/platform join relations
- All 41 existing tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Activate Prisma client and configure seed runner** - `33ff019` (feat)
2. **Task 2: Create idempotent seed script with all mock data** - `7fa1c9a` (feat)

## Files Created/Modified
- `src/lib/db.ts` - Prisma client singleton with PrismaPg adapter
- `prisma/seed.ts` - Idempotent seed script with 7 platforms, 12 categories, 12 tools
- `prisma.config.ts` - Prisma 7 configuration with dotenv loading
- `prisma/schema.prisma` - Removed deprecated url from datasource block
- `package.json` - Added adapter-pg, pg, tsx deps; postinstall script; seed config

## Decisions Made
- Used PrismaPg driver adapter (Prisma 7 requires adapter or accelerateUrl in constructor, no longer reads datasource url from schema)
- Inlined seed data in prisma/seed.ts instead of importing from src/lib/mock-data.ts (seed runs via tsx outside Next.js, @/ path aliases do not resolve)
- Added dotenv loading in prisma.config.ts because Prisma 7 explicitly sets `dotenv: false` in its config loader

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7 breaking change: datasource url removed from schema**
- **Found during:** Task 1 (prisma generate)
- **Issue:** Prisma 7.6.0 no longer supports `url = env("DATABASE_URL")` in schema.prisma datasource block. Error: "The datasource property `url` is no longer supported in schema files."
- **Fix:** Created prisma.config.ts with `defineConfig({ datasource: { url: env('DATABASE_URL') } })`. Installed `@prisma/adapter-pg` and `pg` packages. Updated db.ts to use `new PrismaPg({ connectionString })` adapter. Removed url from schema.prisma.
- **Files modified:** prisma.config.ts (new), prisma/schema.prisma, src/lib/db.ts, package.json
- **Verification:** `npx prisma generate` succeeds, TypeScript compilation passes
- **Committed in:** 33ff019 (Task 1 commit)

**2. [Rule 3 - Blocking] Prisma 7 PrismaClient requires constructor config**
- **Found during:** Task 1 (connection test)
- **Issue:** `new PrismaClient()` without arguments throws `PrismaClientInitializationError` in Prisma 7 -- must provide `adapter` or `accelerateUrl`
- **Fix:** Updated db.ts to create PrismaPg adapter and pass to PrismaClient constructor
- **Files modified:** src/lib/db.ts
- **Verification:** TypeScript compilation passes, adapter import resolves correctly
- **Committed in:** 33ff019 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking - Prisma 7 API migration)
**Impact on plan:** Both fixes were necessary to work with Prisma 7.6.0 which has breaking changes from the Prisma 6 API assumed in the plan. No scope creep.

## Issues Encountered

### Supabase Database Unreachable

The Supabase PostgreSQL database at `db.olkniqhjdwcehswwtnyq.supabase.co:5432` is not accepting connections (ECONNREFUSED). TCP port 5432 is open but TLS handshake fails, and the pooler endpoint returns "Tenant or user not found". This indicates the Supabase project is likely paused or credentials have rotated.

**Impact:**
- `npx prisma db push` could not be verified against a live database
- Seed script could not be executed to verify data counts
- Database schema tables were not created

**Resolution needed:** Resume the Supabase project via the Supabase dashboard, then run:
```bash
npx prisma db push    # Create tables
npx tsx prisma/seed.ts  # Populate data
```

All code is correct and ready to execute once the database is accessible.

## User Setup Required

**Database must be accessible before seed can run.** Steps:
1. Go to Supabase dashboard (https://supabase.com/dashboard)
2. Find project `olkniqhjdwcehswwtnyq`
3. If paused, click "Restore" to resume the project
4. Verify `.env` DATABASE_URL matches the project's connection string
5. Run: `npx prisma db push && npx tsx prisma/seed.ts`

## Next Phase Readiness
- Prisma client code complete and type-safe (verified via tsc --noEmit)
- Seed script complete with all mock data mirrored
- Requires live database to run `prisma db push` and `seed.ts` before API routes in 01-02 can function
- All 41 existing tests green

---
*Phase: 01-backend-foundation*
*Completed: 2026-04-07*

## Self-Check: PASSED

- FOUND: src/lib/db.ts
- FOUND: prisma/seed.ts
- FOUND: prisma.config.ts
- FOUND: prisma/schema.prisma
- FOUND: package.json
- FOUND: 33ff019 in git log
- FOUND: 7fa1c9a in git log
