# Phase 4: Community Features (Future) - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

User reviews, ratings, tool submissions with real backend, and tag voting system. Includes GitHub OAuth authentication via NextAuth.js, review submission API, tool submission review workflow (admin approval), and community tag voting. Out of scope: admin dashboard beyond simple review page, email/notification system, automated tool discovery.

</domain>

<decisions>
## Implementation Decisions

### Authentication
- **D-01:** GitHub OAuth login required for ALL community actions (Review + Submission + Tag Voting)
- **D-02:** Use NextAuth.js (Auth.js) with GitHub Provider — read-only basic info scope (username + avatar only)
- **D-03:** New User model needed in Prisma schema (currently no User model exists) — store GitHub ID, username, avatar, email (optional)
- **D-04:** Session strategy: JWT-based (stateless, no server session storage required)

### Review 体验设计
- **D-05:** Reviews publish immediately — no admin pre-moderation. Can add report/flag mechanism later.
- **D-06:** Required field: rating (1-5 stars). Optional fields: content (text), platform (which platform user uses), useCase
- **D-07:** One review per user per tool — upsert behavior (submitting again updates existing review)
- **D-08:** After review submission, recalculate tool's avgRating and ratingCount in real-time (aggregate all reviews)
- **D-09:** Review display: rating distribution bar chart (5星 %, 4星 %...) + sorted/paginated review list
- **D-10:** Review model already has fields: rating, content, platform, useCase — needs userId added

### Tool Submission 审核流程
- **D-11:** Admin review workflow — submissions start as PENDING, admin approves/rejects via simple web page
- **D-12:** Submit form minimal: only repoUrl required (auto-fill user info from GitHub login). Optional: notes, suggestedTags
- **D-13:** Auto-validate repoUrl on submit (GitHub API check — does repo exist and is it public?)
- **D-14:** Deduplication check — reject if repoUrl already exists in Tool or Submission table
- **D-15:** On approval: auto-fetch GitHub data (stars, forks, description, language, etc.) using Phase 2 sync logic, create Tool record with ACTIVE status
- **D-16:** Simple admin review page: list PENDING submissions with details, approve/reject buttons. Access restricted to admin users.
- **D-17:** Post-submission UX: show "received, pending review" confirmation. No real-time notification to admins.

### Tag Voting 系统
- **D-18:** Preset tag list — universal tags applicable to all tool types (not type-specific). Bilingual (en/zh). Examples: "Easy to use", "Great docs", "High performance", "Well maintained", "Creative & practical"
- **D-19:** Each user can vote up to 3 tags per tool. Click to vote, click again to unvote.
- **D-20:** New ToolTagVote model: toolId, tagSlug, userId, createdAt. Aggregation counts per tag per tool.
- **D-21:** Display top tags on tool detail page with vote counts (e.g., "Easy to use (42)"). Allow voting inline.
- **D-22:** Display top 2-3 tags on ToolCard component for browse-time visibility
- **D-23:** Tag preset list defined in code/config (not user-generated), bilingual labels

### Claude's Discretion
- Exact preset tag list and bilingual labels
- Review list UI layout, pagination style, empty state
- Admin review page layout and routing (/admin/submissions?)
- Tag voting animation and interaction details
- How to identify admin users (env var whitelist? GitHub team membership?)
- Review/Tag sections responsive behavior on mobile
- Error handling for GitHub API calls during submission validation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database & Data Layer
- `prisma/schema.prisma` — Existing Review model (id, toolId, rating, content, platform, useCase, createdAt), Submission model (id, toolId, repoUrl, submitterName, submitterEmail, notes, suggestedTags, status, createdAt, reviewedAt), Tool model (avgRating, ratingCount, tags[])
- `src/lib/db.ts` — Active Prisma client singleton
- `prisma/seed.ts` — Pattern for idempotent data operations

### API Layer
- `src/lib/api-utils.ts` — Shared API helpers (successResponse, errorResponse patterns)
- `src/app/api/tools/route.ts` — Existing tools API (review endpoints will follow same pattern)
- `src/app/api/sync/route.ts` — GitHub data fetching logic to reuse on submission approval

### Frontend Components
- `src/components/tools/ReviewSection.tsx` — Existing review display skeleton (shows avgRating, ratingCount, "No reviews yet")
- `src/components/shared/StarRating.tsx` — Star display component (half-star support)
- `src/components/tools/ToolCard.tsx` — Tool card for browse pages (needs tag display)
- `src/app/[locale]/submit/page.tsx` — Current placeholder submit page
- `src/app/[locale]/tools/[slug]/ToolDetailClient.tsx` — Tool detail page (needs review submission + tag voting sections)

### Authentication
- `src/app/[locale]/` — All pages under locale routing (from Phase 3)
- `src/app/layout.tsx` — Root layout (needs SessionProvider wrapper)
- `next.config.ts` — May need NextAuth configuration

### Technical Design
- `docs/TECHNICAL_DESIGN.md` §4 — Planned API endpoints including POST /api/tools/submit and review endpoints
- `docs/TECHNICAL_DESIGN.md` §2.1 — Data model with Review and Submission schemas

### Next.js 16 Compatibility
- `AGENTS.md` — Warning about Next.js 16 breaking changes, consult `node_modules/next/dist/docs/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prisma/schema.prisma`: Review and Submission models already defined with all needed fields — just need userId added
- `src/lib/api-utils.ts`: successResponse/errorResponse — all new API endpoints can reuse these
- `src/components/tools/ReviewSection.tsx`: Skeleton exists, can be expanded with rating distribution + review list
- `src/components/shared/StarRating.tsx`: Star display with half-star support — can be used for review input
- `src/app/api/sync/route.ts`: GitHub API client logic — reuse for repoUrl validation and auto-fetch on submission approval
- `src/lib/db.ts`: Prisma singleton — all new routes use this directly
- Review model's `platform` field: aligns with Platform model slugs for filtering reviews by platform

### Established Patterns
- API route pattern: GET/POST handler with try/catch + Response.json() in `src/app/api/`
- Server/client component split: page.tsx (server) → *Client.tsx (client)
- Prisma upsert for idempotent writes (from seed.ts and sync logic)
- Bilingual data pattern: nameEn/nameZh, featuresEn/featuresZh — tag labels should follow same pattern
- Locale routing: all pages under `src/app/[locale]/` with server-side dictionary loading

### Integration Points
- New `src/app/api/auth/[...nextauth]/route.ts` — NextAuth.js API route
- New `src/app/api/tools/[slug]/reviews/route.ts` — GET (list) + POST (submit) reviews
- New `src/app/api/submit/route.ts` — POST tool submission
- New `src/app/api/admin/submissions/route.ts` — GET (list pending) + PATCH (approve/reject)
- New `src/app/api/tools/[slug]/tags/route.ts` — GET (tag vote counts) + POST (vote/unvote)
- New `src/app/admin/submissions/page.tsx` — Admin review page
- Update `src/app/[locale]/submit/page.tsx` — Replace placeholder with real form
- Update `src/app/[locale]/tools/[slug]/ToolDetailClient.tsx` — Add review submission + tag voting sections
- Update `src/components/tools/ToolCard.tsx` — Add top tags display
- Update `prisma/schema.prisma` — Add User model, ToolTagVote model, add userId to Review
- Update `src/app/layout.tsx` — Wrap with SessionProvider

</code_context>

<specifics>
## Specific Ideas

- Review display should show "verified user" badge since all users authenticate via GitHub
- Tag voting should feel like Product Hunt's tag system — quick click, satisfying feedback
- Admin review page should show repo preview (name, stars, description) fetched from GitHub before approval
- Submission approval auto-fetch should reuse the same GitHub client from Phase 2 sync

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-community-features-future*
*Context gathered: 2026-04-08*
