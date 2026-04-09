---
phase: 04-community-features-future
plan: 01
subsystem: auth
tags: [next-auth, auth.js, github-oauth, jwt, prisma, session, tag-presets]

# Dependency graph
requires:
  - phase: 03-api-data-layer
    provides: Prisma schema, db.ts, api-utils.ts
provides:
  - Auth.js v5 GitHub OAuth with JWT session strategy
  - User, Account, Session, VerificationToken, ToolTagVote Prisma models
  - requireAuth and isAdmin helper functions
  - TAG_PRESETS with 10 bilingual tag labels
  - SessionProvider and LoginButton client components
  - Admin submissions page stub with server-side auth guard
affects: [04-02, 04-03, 04-04, 04-05]

# Tech tracking
tech-stack:
  added: [next-auth@5.0.0-beta.30, @auth/prisma-adapter@2.11.1, zod]
  patterns: [jwt-session-with-prisma-adapter, env-var-admin-whitelist, bilingual-tag-presets]

key-files:
  created:
    - src/auth.ts
    - src/lib/auth-helpers.ts
    - src/lib/tag-presets.ts
    - src/components/auth/SessionProvider.tsx
    - src/components/auth/LoginButton.tsx
    - src/app/api/auth/[...nextauth]/route.ts
    - src/app/admin/submissions/page.tsx
  modified:
    - prisma/schema.prisma
    - src/app/layout.tsx
    - package.json

key-decisions:
  - "Added Session and VerificationToken models (required by PrismaAdapter even with JWT strategy)"
  - "Used AUTH_GITHUB_ID/AUTH_GITHUB_SECRET env vars (next-auth v5 auto-infers AUTH_ prefixed vars)"
  - "Used inline SVG for GitHub icon (Github not exported in this lucide-react version)"
  - "Wrapped SessionProvider outside I18nProvider in root layout"

patterns-established:
  - "Auth guard pattern: requireAuth() returns { session, error } tuple for API routes"
  - "Admin check pattern: isAdmin(userId) checks ADMIN_GITHUB_IDS env var whitelist"
  - "Server component auth: direct auth() call with redirect() for page-level guards"

requirements-completed: [D-01, D-02, D-03, D-04, D-10, D-18, D-20, D-23]

# Metrics
duration: 10min
completed: 2026-04-09
---

# Phase 04 Plan 01: Auth Foundation Summary

**GitHub OAuth via Auth.js v5 with JWT sessions, Prisma User/Account models, auth helpers, and 10 bilingual tag presets**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-09T00:52:10Z
- **Completed:** 2026-04-09T01:02:53Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Full Prisma schema with User, Account, Session, VerificationToken, and ToolTagVote models
- Auth.js v5 configured with GitHub provider, PrismaAdapter, and JWT session strategy
- requireAuth and isAdmin helper functions for API route protection and admin identification
- TAG_PRESETS with 10 tags in English and Chinese with getTagLabel utility
- SessionProvider and LoginButton components integrated into root layout
- Admin submissions page stub with server-side auth guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema migration + Auth.js configuration + auth helpers** - `9c6c650` (feat)
2. **Task 2: Tag presets, SessionProvider, LoginButton, and layout integration** - `6e50f4b` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added User, Account, Session, VerificationToken, ToolTagVote models; added userId to Review and Submission
- `src/auth.ts` - Auth.js v5 config with GitHub provider, PrismaAdapter, JWT session, id propagation via callbacks
- `src/lib/auth-helpers.ts` - requireAuth() and isAdmin() helper functions
- `src/lib/tag-presets.ts` - 10 bilingual tag presets with getTagLabel utility
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth route handler exporting GET and POST
- `src/components/auth/SessionProvider.tsx` - Client-side next-auth SessionProvider wrapper
- `src/components/auth/LoginButton.tsx` - GitHub OAuth login/logout button with inline SVG icon
- `src/app/layout.tsx` - Root layout wrapping children with SessionProvider outside I18nProvider
- `src/app/admin/submissions/page.tsx` - Admin page stub with server-side auth and admin check
- `package.json` - Added next-auth@beta, @auth/prisma-adapter, zod dependencies

## Decisions Made
- **Added Session and VerificationToken models** -- PrismaAdapter references p.session and p.verificationToken in its implementation; even with JWT strategy, these models must exist in the schema to prevent runtime errors
- **Used AUTH_GITHUB_ID/AUTH_GITHUB_SECRET** -- next-auth v5 auto-infers environment variables prefixed with AUTH_ (per its documentation), so AUTH_GITHUB_ID/AUTH_GITHUB_SECRET are the correct names rather than GITHUB_ID/GITHUB_SECRET
- **Inline SVG for GitHub icon** -- The installed version of lucide-react does not export a Github icon; used standard GitHub SVG path instead of adding another icon library dependency
- **SessionProvider wraps I18nProvider** -- Session context must be available to all client components including those using i18n, so SessionProvider is the outermost client provider

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced lucide-react Github icon with inline SVG**
- **Found during:** Task 2 (LoginButton component)
- **Issue:** `lucide-react` v1.7.0 does not export a `Github` icon, causing TypeScript error TS2305
- **Fix:** Created GitHubIcon component with standard GitHub SVG path
- **Files modified:** src/components/auth/LoginButton.tsx
- **Verification:** TypeScript compiles without errors
- **Committed in:** 6e50f4b (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added Session and VerificationToken Prisma models**
- **Found during:** Task 1 (auth configuration)
- **Issue:** PrismaAdapter references p.session and p.verificationToken; omitting these models would cause runtime crashes even with JWT strategy
- **Fix:** Added Session model (id, sessionToken, userId, expires) and VerificationToken model (identifier, token, expires) matching Auth.js schema requirements
- **Files modified:** prisma/schema.prisma
- **Verification:** prisma generate and prisma db push succeed; TypeScript compiles
- **Committed in:** 9c6c650 (Task 1 commit)

**3. [Rule 2 - Missing Critical] Corrected env var names for next-auth v5**
- **Found during:** Task 1 (env file setup)
- **Issue:** Plan specified GITHUB_ID/GITHUB_SECRET but next-auth v5 auto-infers AUTH_GITHUB_ID/AUTH_GITHUB_SECRET
- **Fix:** Used AUTH_GITHUB_ID and AUTH_GITHUB_SECRET in .env and .env.example
- **Files modified:** .env, .env.example
- **Verification:** Matches next-auth v5 documentation and auto-inference pattern
- **Committed in:** N/A (env files not tracked)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 missing critical)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in test files (13 errors in __tests__/) unrelated to auth changes; not addressed per scope boundary rules

## User Setup Required

**External services require manual configuration.**
- Create GitHub OAuth App at https://github.com/settings/developers with callback URL `http://localhost:3000/api/auth/callback/github`
- Set environment variables:
  - `AUTH_SECRET` -- generate with `npx auth secret`
  - `AUTH_GITHUB_ID` -- Client ID from GitHub OAuth App
  - `AUTH_GITHUB_SECRET` -- Client Secret from GitHub OAuth App
  - `ADMIN_GITHUB_IDS` -- comma-separated GitHub user IDs for admin access

## Known Stubs
- `src/app/admin/submissions/page.tsx` -- Placeholder text "Admin submission review will be available here." Will be expanded in Plan 05.

## Next Phase Readiness
- Auth foundation complete and ready for all downstream community features
- Plan 02 can use requireAuth() for review submission endpoints
- Plan 03 can use TAG_PRESETS for tag voting UI and API
- Plan 04 can use requireAuth() + isAdmin() for submission management
- Plan 05 can expand the admin submissions page stub

---
*Phase: 04-community-features-future*
*Completed: 2026-04-09*

## Self-Check: PASSED

- All 8 created files verified present
- Both task commits verified in git log (9c6c650, 6e50f4b)
- TypeScript compiles without errors in new files
