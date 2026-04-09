---
phase: 04-community-features-future
plan: 04
subsystem: submission
tags: [tool-submission, admin-review, github-validation, dedup, i18n]

# Dependency graph
requires:
  - phase: 04-community-features-future
    plan: 01
    provides: "Auth helpers (requireAuth, isAdmin), Prisma schema (Submission, Tool), TAG_PRESETS, SessionProvider"
  - phase: 03-api-data-layer
    provides: "GitHub client (parseRepoUrl, fetchRepoData, fetchReadme), scoring (computeScore), readme-parser (extractFeatures, extractInstallGuide)"
provides:
  - POST /api/submit endpoint with auth, validation, dedup
  - GET/PATCH /api/admin/submissions endpoints with admin gating
  - SubmitForm component with auth gate, URL validation, tag pills
  - Admin review page with server/client split and inline reject confirmation
  - 12 bilingual i18n keys for submit flow
affects: [04-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-client-component-split, inline-destructive-confirmation, slug-uniqueness-fallback]

key-files:
  created:
    - src/app/api/submit/route.ts
    - src/app/api/admin/submissions/route.ts
    - src/components/tools/SubmitForm.tsx
    - src/app/admin/submissions/AdminSubmissionsClient.tsx
  modified:
    - src/app/[locale]/submit/page.tsx
    - src/app/admin/submissions/page.tsx
    - src/i18n/en.json
    - src/i18n/zh.json

key-decisions:
  - "Used Response.json directly for 201 status (successResponse helper only returns 200)"
  - "Slug uniqueness: try repo name, then owner-repo, then owner-repo-timestamp"
  - "Admin page uses server component for auth+data, client component for interactivity"
  - "SubmitForm validates URL via blur + POST pre-flight rather than separate validation endpoint"

patterns-established:
  - "Admin page pattern: server component (auth gate + data fetch + serialize dates) renders client component (interactivity)"
  - "Inline destructive confirmation: rejectingId state toggles confirm/cancel UI within the card"

requirements-completed: [D-11, D-12, D-13, D-14, D-15, D-16, D-17]

# Metrics
duration: 11min
completed: 2026-04-09
---

# Phase 04 Plan 04: Tool Submission and Admin Review Summary

**GitHub-validated tool submission with dedup checks, admin approve/reject workflow, auto-fetch on approval, and bilingual i18n**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-09T01:23:21Z
- **Completed:** 2026-04-09T01:34:25Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- POST /api/submit: auth-gated submission with Zod schema, GitHub URL parsing, dedup against Tool + Submission tables, and repo existence verification via fetchRepoData
- GET /api/admin/submissions: admin-only list of PENDING submissions with user info
- PATCH /api/admin/submissions: admin approve (auto-fetches GitHub data, creates Tool with score, links Submission) and reject (updates status with reviewedAt)
- Slug uniqueness guaranteed with three-tier fallback: repo name, owner-repo, owner-repo-timestamp
- SubmitForm: client component with auth gate, blur-based URL validation with spinner/checkmark/error states, optional notes with char count, suggested tag pill checkboxes, success confirmation card
- Submit page: replaced placeholder with real SubmitForm in centered layout
- Admin submissions page: refactored to server component (server-side auth + admin check + data fetch + date serialization) rendering AdminSubmissionsClient
- AdminSubmissionsClient: interactive approve/reject with inline destructive confirmation for reject, auto-removal from list on action
- 12 bilingual i18n keys added to en.json and zh.json for the entire submit flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Submission API + Admin API endpoints** - `1f64a26` (feat)
2. **Task 2: SubmitForm component + Submit page + Admin review page** - `e8ab3e6` (feat)

## Files Created/Modified
- `src/app/api/submit/route.ts` - POST handler: auth, Zod validation, parseRepoUrl, dedup checks, fetchRepoData verification, create PENDING submission
- `src/app/api/admin/submissions/route.ts` - GET (list PENDING) + PATCH (approve with auto-fetch/create Tool, reject) handlers with admin gating
- `src/components/tools/SubmitForm.tsx` - Client component: auth gate, URL validation on blur, notes textarea, tag pill checkboxes, submit, success/error states
- `src/app/admin/submissions/AdminSubmissionsClient.tsx` - Client component: approve/reject buttons with inline confirmation, auto-remove on action
- `src/app/[locale]/submit/page.tsx` - Replaced placeholder with real SubmitForm in hero + form layout
- `src/app/admin/submissions/page.tsx` - Refactored from stub to server component: auth gate, admin check, data fetch, date serialization, renders AdminSubmissionsClient
- `src/i18n/en.json` - Added 12 community.* keys for submit flow
- `src/i18n/zh.json` - Added 12 community.* keys for submit flow (Chinese)

## Decisions Made
- **Used Response.json directly for 201 status** -- The existing successResponse helper always returns status 200 and does not accept a status code parameter. For the submission creation endpoint which should return 201, used Response.json directly with { status: 201 }.
- **Three-tier slug uniqueness** -- When creating a Tool on approval, the slug is tried as repo name first. If that collides, owner-repo is tried. If that also collides, owner-repo-timestamp guarantees uniqueness. This avoids transaction failures without requiring a separate slug generation service.
- **Server/client component split for admin page** -- Server component handles auth gate, admin check, and data fetch (no client-side bypass possible, no loading spinner on initial render). Client component handles interactive approve/reject with local state management.
- **SubmitForm validates via blur + submit-time POST** -- Rather than creating a separate validation-only endpoint, the form validates URL format on blur locally, then relies on the POST endpoint for full server-side validation. This keeps the API surface minimal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed session.user.id TypeScript narrowing**
- **Found during:** Task 1 (admin submissions route)
- **Issue:** TypeScript cannot narrow `session.user.id` from `string | undefined` even with non-null assertion on session and user objects
- **Fix:** Extracted userId with explicit cast: `const userId = session!.user!.id as string` after the requireAuth null check
- **Files modified:** src/app/api/admin/submissions/route.ts
- **Verification:** TypeScript compiles without errors in new files
- **Committed in:** 1f64a26 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed nullable installGuide JSON field**
- **Found during:** Task 1 (approval flow)
- **Issue:** Prisma Json? field does not accept null literal, only undefined
- **Fix:** Changed `installGuide: ... : null` to `installGuide: ... : undefined`
- **Files modified:** src/app/api/admin/submissions/route.ts
- **Verification:** TypeScript compiles
- **Committed in:** 1f64a26 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Minor type-safety fixes. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in src/app/api/tools/[slug]/reviews/route.ts (2 errors) and test files (13 errors) unrelated to submission changes; not addressed per scope boundary rules

## Next Phase Readiness
- Submission system complete and ready for Plan 05 (which may expand admin features or add notifications)
- SubmitForm can be reused if additional submission types are needed
- AdminSubmissionsClient pattern (server+client split) can be replicated for other admin pages

---
*Phase: 04-community-features-future*
*Completed: 2026-04-09*

## Self-Check: PASSED

- All 4 created files verified present: src/app/api/submit/route.ts, src/app/api/admin/submissions/route.ts, src/components/tools/SubmitForm.tsx, src/app/admin/submissions/AdminSubmissionsClient.tsx
- All 4 modified files verified changed: src/app/[locale]/submit/page.tsx, src/app/admin/submissions/page.tsx, src/i18n/en.json, src/i18n/zh.json
- Both task commits verified in git log (1f64a26, e8ab3e6)
- TypeScript compiles without errors in new files (only pre-existing errors remain)
