---
phase: 04-community-features-future
plan: 03
subsystem: community
tags: [tag-voting, framer-motion, prisma, groupBy, optimistic-updates, i18n]

# Dependency graph
requires:
  - phase: 04-community-features-future
    plan: 01
    provides: "Auth helpers (requireAuth), Prisma schema (ToolTagVote), TAG_PRESETS, SessionProvider"
  - phase: 04-community-features-future
    plan: 02
    provides: "ReviewSection pattern for component integration in ToolDetailClient"
provides:
  - GET /api/tools/[slug]/tags endpoint returning tag vote counts with user's current votes
  - POST /api/tools/[slug]/tags endpoint with vote/unvote toggle and 3-vote cap
  - TagVoting client component with framer-motion animations and optimistic updates
  - Top 3 tags aggregated in tools listing API via mapToolResponse
  - Tag pills on ToolCard browse pages with locale-aware labels
  - 4 bilingual i18n keys for tag voting UI
affects: [04-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [optimistic-update-with-rollback, inline-tag-aggregation-from-include]

key-files:
  created:
    - src/app/api/tools/[slug]/tags/route.ts
    - src/components/tools/TagVoting.tsx
  modified:
    - src/types/index.ts
    - src/lib/api-utils.ts
    - src/components/tools/ToolCard.tsx
    - src/app/[locale]/tools/[slug]/ToolDetailClient.tsx
    - src/i18n/en.json
    - src/i18n/zh.json

key-decisions:
  - "GET /tags includes userVotes in response to avoid separate auth call in TagVoting component"
  - "Top tags computed inline in mapToolResponse from tagVotes include (no extra per-tool query)"
  - "Optimistic UI updates with rollback on API error for instant tag vote feedback"
  - "TagVoting filters display to tags with votes or user votes, sorted by count desc"

patterns-established:
  - "Optimistic update pattern: update state immediately, call API, revert on error"
  - "Inline aggregation pattern: compute derived data from Prisma include results in mapToolResponse"

requirements-completed: [D-19, D-21, D-22]

# Metrics
duration: 9min
completed: 2026-04-09
---

# Phase 04 Plan 03: Tag Voting System Summary

**Tag voting API with 3-vote cap toggle, animated TagVoting component with framer-motion, and top-3 tag pills on browse page ToolCards wired from tools listing API**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-09T01:38:32Z
- **Completed:** 2026-04-09T01:47:39Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- GET /api/tools/[slug]/tags returns grouped vote counts with authenticated user's current votes
- POST /api/tools/[slug]/tags toggles votes with whitelist validation, uniqueness constraint, and 3-vote cap
- TagVoting component with framer-motion scale animations, optimistic updates, auth gate, and reduced-motion support
- Top 3 tags aggregated inline in mapToolResponse from tagVotes include (zero extra queries)
- ToolCard renders locale-aware tag pills from API-provided topTags data
- ToolDetailClient integrates TagVoting section below Reviews

## Task Commits

Each task was committed atomically:

1. **Task 1: Tag voting API endpoints (GET counts + POST vote/unvote toggle)** - `7a309f3` (feat)
2. **Task 2: TagVoting component + topTags on ToolCard + ToolDetail integration + i18n** - `ade1111` (feat)

## Files Created/Modified
- `src/app/api/tools/[slug]/tags/route.ts` - GET (tag vote counts + user votes) and POST (vote/unvote toggle with 3-vote cap)
- `src/components/tools/TagVoting.tsx` - Client component with framer-motion animations, optimistic updates, auth gate, reduced-motion support
- `src/types/index.ts` - Added optional `topTags` field to Tool interface
- `src/lib/api-utils.ts` - Added tagVotes to TOOL_PRISMA_INCLUDE; mapToolResponse computes top 3 tags inline
- `src/components/tools/ToolCard.tsx` - Renders top 2-3 tag pills below description with locale-aware labels
- `src/app/[locale]/tools/[slug]/ToolDetailClient.tsx` - Added TagVoting section below Reviews
- `src/i18n/en.json` - Added 4 community.* keys for tag voting (tags, signInToVote, tagVoteLimit, votedCount)
- `src/i18n/zh.json` - Added 4 community.* keys for tag voting (Chinese translations)

## Decisions Made
- **GET /tags includes userVotes in response** -- Rather than requiring a separate authenticated call, the GET endpoint attempts requireAuth (catches silently if unauthenticated) and returns userVotes alongside tag counts. This reduces network requests from the TagVoting component.
- **Top tags computed inline in mapToolResponse** -- The tagVotes relation is included via TOOL_PRISMA_INCLUDE and aggregated in-memory. For ~100 tools with ~10 votes each this is negligible. A materialized view can replace this if performance becomes a concern.
- **Optimistic UI with rollback** -- Tag clicks update state immediately for instant feedback. If the API call fails, the previous state is restored. This provides a snappy user experience without waiting for server round-trip.
- **Display filtering: only show tags with votes** -- The TagVoting component shows only tags that have at least one vote or are voted by the current user. This avoids a wall of zero-count pills on tools with no community engagement yet.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in test files and next-auth module resolution (same as prior plans) -- not addressed per scope boundary rules.

## Next Phase Readiness
- Tag voting system complete and ready for Plan 05 (if it expands community features)
- Top tags on ToolCard automatically appear on all browse pages (ToolsClient, CategoryDetailClient) via API data
- TAG_PRESETS whitelist validation in POST endpoint prevents tag injection

---
*Phase: 04-community-features-future*
*Completed: 2026-04-09*

## Self-Check: PASSED

- Both created files verified present: src/app/api/tools/[slug]/tags/route.ts, src/components/tools/TagVoting.tsx
- All 6 modified files verified changed: src/types/index.ts, src/lib/api-utils.ts, src/components/tools/ToolCard.tsx, src/app/[locale]/tools/[slug]/ToolDetailClient.tsx, src/i18n/en.json, src/i18n/zh.json
- Both task commits verified in git log (7a309f3, ade1111)
- TypeScript compiles without new errors (only pre-existing next-auth module resolution and test file errors)
