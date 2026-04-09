---
phase: 04-community-features-future
verified: 2026-04-09T02:10:00Z
status: human_needed
score: 19/19 must-haves verified (automated)
re_verification: false

human_verification:
  - test: "GitHub OAuth login flow"
    expected: "Click Sign in -> redirected to GitHub -> session created -> avatar/username shown in header"
    why_human: "Requires running server + GitHub OAuth app credentials (AUTH_GITHUB_ID/AUTH_GITHUB_SECRET not in .env)"
  - test: "Review submission end-to-end"
    expected: "Navigate to tool detail -> Write Review -> select stars -> submit -> review appears in list + avgRating updates"
    why_human: "Requires authenticated session + database + running server"
  - test: "Review upsert behavior"
    expected: "Submit second review for same tool -> existing review updated, not duplicated"
    why_human: "Requires running server with database, verifies @@unique([userId, toolId]) constraint at runtime"
  - test: "Tag voting with 3-vote cap"
    expected: "Click tag pills to vote -> max 3 votes enforced -> 4th click shows limit message -> click voted tag to unvote"
    why_human: "Requires authenticated session + interactive UI testing + animation verification"
  - test: "Tool submission flow"
    expected: "Navigate to /submit -> enter GitHub URL -> validation spinner/checkmark -> submit -> 'pending review' confirmation"
    why_human: "Requires authenticated session + GitHub API access for repo validation"
  - test: "Admin submission review"
    expected: "Navigate to /admin/submissions as admin user -> see PENDING submissions -> approve (Tool created) or reject (status updated) -> inline confirmation for reject"
    why_human: "Requires admin user session + database with PENDING submissions + GitHub API for auto-fetch on approval"
  - test: "Bilingual i18n coverage"
    expected: "Switch to Chinese locale -> all community text (reviews, tags, submit, admin) appears in Chinese"
    why_human: "Visual verification of locale switching across all community features"
  - test: "Unauthenticated user experience"
    expected: "Unsigned-in users see login prompt on review form, get redirected to GitHub on tag click, see login card on submit page"
    why_human: "Requires running server to verify auth gate behavior across all features"
---

# Phase 4: Community Features Verification Report

**Phase Goal:** User reviews, ratings, and tool submissions with real backend -- GitHub OAuth auth, review system, tag voting, tool submission with admin review workflow.
**Verified:** 2026-04-09T02:10:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Users can sign in via GitHub OAuth | VERIFIED | src/auth.ts: GitHub provider configured with PrismaAdapter + JWT; LoginButton.tsx calls signIn("github"); route handler exports GET/POST |
| 2 | Session data is available in client components | VERIFIED | src/app/layout.tsx:58 wraps children in SessionProvider; LoginButton.tsx uses useSession(); ReviewForm.tsx uses useSession() for auth gate |
| 3 | Auth-guarded API endpoints reject unauthenticated requests | VERIFIED | src/lib/auth-helpers.ts:6 requireAuth() returns 401 errorResponse when no session; used in reviews POST, tags POST, submit POST, admin GET/PATCH |
| 4 | Admin users are identified by env var whitelist | VERIFIED | src/lib/auth-helpers.ts:14 isAdmin() checks ADMIN_GITHUB_IDS; admin page server-component checks server-side; admin API checks server-side |
| 5 | Preset tag list is available with bilingual labels | VERIFIED | src/lib/tag-presets.ts: 10 TAG_PRESETS with slug, labelEn, labelZh; getTagLabel() utility function |
| 6 | Authenticated user can submit review with 1-5 star rating | VERIFIED | Review API route: POST handler with Zod validation (rating 1-5, content max 500, platform max 50, useCase max 100); ReviewForm.tsx: interactive StarRating + form submission |
| 7 | Second review for same tool updates existing (upsert) | VERIFIED | Reviews route.ts:96 prisma.review.upsert with userId_toolId unique where clause; @@unique([userId, toolId]) in schema |
| 8 | Tool avgRating and ratingCount update after review | VERIFIED | Reviews route.ts:120-132 prisma.review.aggregate for _avg/_count then prisma.tool.update with recalculated values |
| 9 | Rating distribution bar chart shows percentage per star | VERIFIED | RatingDistribution.tsx: 5 horizontal bars (5 to 1 star), width proportional, aria-meter with percentage, count text |
| 10 | Review list sorted by newest with pagination | VERIFIED | ReviewList.tsx: fetches /api/tools/{slug}/reviews?page=1&limit=10; API orders by createdAt desc; "Load More" pagination button |
| 11 | Unauthenticated users see login prompt instead of review form | VERIFIED | ReviewForm.tsx:72 checks session, renders signIn link with t('community.signInToReview') |
| 12 | Authenticated user can vote up to 3 tags per tool | VERIFIED | Tags route.ts:110-116 count check >= 3 returns 400; TagVoting.tsx:57 client-side cap check |
| 13 | Clicking voted tag removes vote (toggle) | VERIFIED | Tags route.ts:105-107 findUnique then delete if exists; TagVoting.tsx optimistic toggle |
| 14 | 4th tag vote shows limit message | VERIFIED | TagVoting.tsx:58-61 sets message with t('community.tagVoteLimit'), displayed as role="alert" |
| 15 | Tags display with vote counts sorted by popularity | VERIFIED | TagVoting.tsx:112-123 displayTags sorted by count desc, ties by slug alphabetical; each pill shows (count) |
| 16 | Top 2-3 tags appear on ToolCard in browse pages | VERIFIED | ToolCard.tsx:26-36 renders tool.topTags.slice(0,3); api-utils.ts mapToolResponse computes topTags from tagVotes include; tools API route uses TOOL_PRISMA_INCLUDE with tagVotes |
| 17 | Unauthenticated users see login prompt when clicking tags | VERIFIED | TagVoting.tsx:49-52 checks session, calls signIn('github') if not authenticated |
| 18 | Authenticated user can submit tool via GitHub repo URL | VERIFIED | Submit API route: POST handler with Zod validation, parseRepoUrl, fetchRepoData verification; SubmitForm.tsx full form with validation states |
| 19 | System validates repoUrl exists on GitHub | VERIFIED | Submit route.ts:65-72 fetchRepoData call wrapped in try/catch, returns 400 on failure |
| 20 | System rejects duplicate submissions | VERIFIED | Submit route.ts:43-62 dedup against prisma.tool.findFirst (409) and prisma.submission.findFirst for PENDING (409) |
| 21 | Admin can view PENDING submissions with details | VERIFIED | Admin submissions route.ts:24-41 GET handler finds PENDING with user include; page.tsx server-component fetches + passes to AdminSubmissionsClient |
| 22 | Admin approve auto-fetches GitHub data and creates Tool | VERIFIED | Admin route.ts:91-166 approval flow: parseRepoUrl, fetchRepoData+fetchReadme in parallel, extractFeatures+extractInstallGuide, computeScore, prisma.tool.create + submission.update |
| 23 | Admin reject with inline confirmation | VERIFIED | AdminSubmissionsClient.tsx:102-121 rejectingId state toggles confirm/cancel UI; reject PATCH call updates status to REJECTED |
| 24 | Submitter sees pending review confirmation | VERIFIED | SubmitForm.tsx:140-158 submitted state renders success card with t('community.submitConfirmation'); Submit API returns {message: "Submission received, pending review"} |
| 25 | LoginButton appears in Header navigation | VERIFIED | Header.tsx:6 imports LoginButton, line 53 renders it between About link and locale toggle |
| 26 | All community i18n keys present in en.json and zh.json | VERIFIED | en.json:60-94 has 33 keys in "community" namespace; zh.json:60-94 has matching 33 keys with Chinese values |
| 27 | ReviewSection composes form + distribution + list | VERIFIED | ReviewSection.tsx imports and renders RatingDistribution, ReviewForm, ReviewList; computes distribution from reviews |
| 28 | TagVoting integrated in tool detail page | VERIFIED | ToolDetailClient.tsx:13 imports TagVoting, line 114-116 renders in section after Reviews |

**Score:** 19/19 must-have truths verified (all automated checks pass)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| src/auth.ts | Auth.js v5 config with GitHub + JWT | VERIFIED | 24 lines, exports handlers/signIn/signOut/auth, PrismaAdapter, JWT callbacks |
| src/lib/auth-helpers.ts | requireAuth + isAdmin | VERIFIED | 16 lines, requireAuth returns {session, error}, isAdmin checks ADMIN_GITHUB_IDS |
| src/lib/tag-presets.ts | 10 bilingual tags | VERIFIED | 23 lines, TAG_PRESETS with 10 items, getTagLabel utility |
| prisma/schema.prisma | User, Account, ToolTagVote models | VERIFIED | User (line 127-140), Account (line 142-160), Session (line 162-171), VerificationToken (line 173-179), ToolTagVote (line 216-229), Review with userId + @@unique (line 181-196) |
| src/components/auth/SessionProvider.tsx | Client wrapper | VERIFIED | 7 lines, wraps NextAuthSessionProvider |
| src/components/auth/LoginButton.tsx | GitHub login/logout | VERIFIED | 43 lines, shows avatar+name when signed in, GitHub SVG + "Sign in" when signed out |
| src/app/api/auth/[...nextauth]/route.ts | GET/POST handlers | VERIFIED | 3 lines, exports handlers |
| src/app/layout.tsx | SessionProvider in root | VERIFIED | Line 58-62 wraps SessionProvider > I18nProvider > children |
| src/app/api/tools/[slug]/reviews/route.ts | GET list + POST upsert | VERIFIED | 138 lines, GET with pagination + user include, POST with auth + Zod + upsert + aggregate recalc |
| src/components/tools/ReviewForm.tsx | Star input + auth gate | VERIFIED | 198 lines, interactive StarRating, auth gate, content/platform/useCase fields, collapsible |
| src/components/tools/RatingDistribution.tsx | 5-row bar chart | VERIFIED | 56 lines, 5 rows with percentage bars, aria-meter |
| src/components/tools/ReviewList.tsx | Paginated review cards | VERIFIED | 146 lines, fetches from API, Load More pagination, empty state |
| src/components/tools/ReviewSection.tsx | Composed section | VERIFIED | 80 lines, composes RatingDistribution + ReviewForm + ReviewList |
| src/components/shared/StarRating.tsx | Display + interactive mode | VERIFIED | 91 lines, interactive mode with role="radiogroup", keyboard nav, hover preview |
| src/app/api/tools/[slug]/tags/route.ts | GET counts + POST toggle | VERIFIED | 126 lines, groupBy for counts, toggle with 3-vote cap, TAG_PRESETS validation |
| src/components/tools/TagVoting.tsx | Animated tag pills | VERIFIED | 194 lines, framer-motion animations, optimistic updates, reduced-motion support, auth gate |
| src/components/tools/ToolCard.tsx | Top tags display | VERIFIED | 44 lines, renders tool.topTags.slice(0,3) with getTagLabel |
| src/types/index.ts | Tool type with topTags | VERIFIED | Line 45: topTags?: { tagSlug: string; count: number }[] |
| src/lib/api-utils.ts | mapToolResponse with topTags | VERIFIED | Lines 98-131: tagVotes include + inline top-3 aggregation |
| src/app/api/submit/route.ts | POST submission | VERIFIED | 96 lines, auth + Zod + parseRepoUrl + dedup + fetchRepoData verification + create |
| src/app/api/admin/submissions/route.ts | GET + PATCH admin | VERIFIED | 168 lines, admin-only GET list + PATCH approve (auto-fetch + create Tool) / reject |
| src/components/tools/SubmitForm.tsx | Auth-gated submit form | VERIFIED | 284 lines, blur validation, spinner/checkmark states, tag pills, success card |
| src/app/[locale]/submit/page.tsx | Real submit page | VERIFIED | 34 lines, renders Header + SubmitForm + Footer, no placeholder text |
| src/app/admin/submissions/page.tsx | Server auth + data | VERIFIED | 35 lines, server component with auth gate + admin check + prisma fetch + date serialization |
| src/app/admin/submissions/AdminSubmissionsClient.tsx | Approve/reject UI | VERIFIED | 145 lines, inline reject confirmation, auto-remove on action |
| src/components/layout/Header.tsx | LoginButton in nav | VERIFIED | Line 6 imports, line 53 renders between About link and locale toggle |
| src/i18n/en.json | Community namespace | VERIFIED | 33 keys at lines 60-94 |
| src/i18n/zh.json | Community namespace | VERIFIED | 33 keys at lines 60-94 matching en.json |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/auth.ts | src/lib/db.ts | PrismaAdapter(prisma) | WIRED | Line 3 imports prisma, line 7 PrismaAdapter(prisma) |
| src/lib/auth-helpers.ts | src/auth.ts | import auth | WIRED | Line 1 imports auth from @/auth |
| src/app/layout.tsx | SessionProvider.tsx | JSX wrapper | WIRED | Line 4 imports, line 58 wraps children |
| reviews/route.ts | db.ts | Prisma upsert + aggregate | WIRED | Line 1 imports prisma, lines 96-117 upsert, lines 120-124 aggregate |
| ReviewForm.tsx | /api/tools/[slug]/reviews | fetch POST | WIRED | Line 42 fetch POST to /api/tools/${toolSlug}/reviews |
| ReviewSection.tsx | Review components | Composition | WIRED | Lines 7-9 import RatingDistribution, ReviewList, ReviewForm; all rendered in JSX |
| tags/route.ts | db.ts | Prisma groupBy + CRUD | WIRED | Line 29 groupBy, line 95 findUnique, line 106 delete, line 118 create |
| TagVoting.tsx | /api/tools/[slug]/tags | fetch GET + POST | WIRED | Line 31 GET fetch, line 89 POST fetch |
| api/tools/route.ts | db.ts | tagVotes include | WIRED | Uses TOOL_PRISMA_INCLUDE with tagVotes; mapToolResponse computes topTags |
| ToolCard.tsx | tool.topTags | Prop rendering | WIRED | Line 26 checks tool.topTags, line 28 maps topTags |
| submit/route.ts | github-client.ts | parseRepoUrl + fetchRepoData | WIRED | Line 5 imports, line 37 parseRepoUrl, line 66 fetchRepoData |
| admin/route.ts | github-client.ts + scoring.ts | Auto-fetch on approval | WIRED | Lines 5-11 import all needed functions; approval flow uses them all |
| admin/page.tsx | AdminSubmissionsClient.tsx | Server renders client | WIRED | Line 4 imports, line 34 renders with initialSubmissions prop |
| Header.tsx | LoginButton.tsx | Import + render | WIRED | Line 6 imports, line 53 renders |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ReviewList.tsx | reviews (state) | GET /api/tools/{slug}/reviews | Yes: prisma.review.findMany with user include | FLOWING |
| ReviewForm.tsx | rating, content, platform, useCase | User input + POST /api/tools/{slug}/reviews | Yes: upserts into DB, recalculates aggregates | FLOWING |
| ReviewSection.tsx | distribution (state) | Computed from ReviewList.onReviewsLoaded | Yes: counts per star from fetched reviews | FLOWING |
| TagVoting.tsx | tagCounts, userVotes (state) | GET /api/tools/{slug}/tags | Yes: prisma.toolTagVote.groupBy + findMany | FLOWING |
| ToolCard.tsx | tool.topTags | Props from parent (API data) | Yes: mapToolResponse computes from tagVotes include | FLOWING |
| SubmitForm.tsx | repoUrl, notes, selectedTags | User input + POST /api/submit | Yes: creates PENDING submission in DB | FLOWING |
| AdminSubmissionsClient.tsx | submissions (state) | Props from server component (prisma fetch) | Yes: prisma.submission.findMany PENDING | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compilation | npx tsc --noEmit 2>&1 \| tail -5 | Only pre-existing test file errors (not in phase 04 code) | PASS |
| Tag presets count | node -e "const m=require('./src/lib/tag-presets'); console.log(m.TAG_PRESETS.length)" via pattern match | 10 items verified in source | PASS |
| Prisma schema has all required models | grep -c "model User\|model Account\|model ToolTagVote\|model Session\|model VerificationToken" schema | All 5 models present | PASS |
| i18n key parity | Key count in en.json community vs zh.json | Both 33 keys | PASS |

### Requirements Coverage

All 23 decision IDs (D-01 to D-23) from 04-CONTEXT.md are covered by the plans and their implementations:

| Requirement ID | Description | Plan | Status | Evidence |
|----------------|-------------|------|--------|----------|
| D-01 | GitHub OAuth required for all community actions | 01, 05 | SATISFIED | Auth.js v5 GitHub provider, requireAuth() in all POST endpoints |
| D-02 | NextAuth.js with GitHub Provider | 01, 05 | SATISFIED | src/auth.ts uses next-auth GitHub provider |
| D-03 | New User model in Prisma schema | 01 | SATISFIED | schema.prisma model User with id, name, email, image, relations |
| D-04 | JWT session strategy | 01 | SATISFIED | src/auth.ts session: { strategy: "jwt" }, token.id propagation |
| D-05 | Reviews publish immediately | 02 | SATISFIED | POST /reviews creates/updates and returns immediately |
| D-06 | Rating 1-5 required, content/platform/useCase optional | 02 | SATISFIED | Zod schema: rating z.number().int().min(1).max(5), others .optional() |
| D-07 | One review per user per tool (upsert) | 02 | SATISFIED | prisma.review.upsert with userId_toolId unique constraint |
| D-08 | Real-time avgRating/ratingCount recalculation | 02 | SATISFIED | prisma.review.aggregate + prisma.tool.update after every review |
| D-09 | Rating distribution + paginated review list | 02 | SATISFIED | RatingDistribution.tsx + ReviewList.tsx with Load More |
| D-10 | Review model needs userId | 01 | SATISFIED | schema.prisma Review has userId + user relation + @@unique([userId, toolId]) |
| D-11 | Admin review workflow (PENDING -> APPROVED/REJECTED) | 04 | SATISFIED | PATCH /api/admin/submissions with approve/reject actions |
| D-12 | Submit form minimal: repoUrl required | 04 | SATISFIED | SubmitForm.tsx with repoUrl required, notes/tags optional |
| D-13 | Auto-validate repoUrl (GitHub API check) | 04 | SATISFIED | fetchRepoData call in submit route, 400 on failure |
| D-14 | Dedup check (Tool + Submission tables) | 04 | SATISFIED | prisma.tool.findFirst + prisma.submission.findFirst checks, 409 on duplicate |
| D-15 | Auto-fetch GitHub data on approval | 04 | SATISFIED | parseRepoUrl + fetchRepoData + fetchReadme + computeScore in approval flow |
| D-16 | Admin page restricted to admin users | 04, 05 | SATISFIED | Server-side auth check + isAdmin check in page.tsx and API routes |
| D-17 | Post-submission "pending review" confirmation | 04, 05 | SATISFIED | SubmitForm success card + API message |
| D-18 | Preset tag list, bilingual | 01 | SATISFIED | TAG_PRESETS with 10 items, labelEn + labelZh |
| D-19 | Max 3 tags per user per tool, toggle | 03 | SATISFIED | Tags route: count >= 3 returns 400; toggle via findUnique + create/delete |
| D-20 | ToolTagVote model | 01 | SATISFIED | schema.prisma model with @@unique([toolId, tagSlug, userId]) |
| D-21 | Display top tags with vote counts on detail | 03 | SATISFIED | TagVoting.tsx renders pills with (count) labels |
| D-22 | Top 2-3 tags on ToolCard browse pages | 03 | SATISFIED | ToolCard.tsx renders topTags, mapToolResponse computes from API data |
| D-23 | Tag preset in code, bilingual | 01 | SATISFIED | tag-presets.ts defines TAG_PRESETS, used for whitelist validation in API |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| .env.example | - | Missing AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, ADMIN_GITHUB_IDS | WARNING | New developers will not know which env vars to configure for auth; auth will fail silently without them |
| 04-02-SUMMARY.md | - | File does not exist | INFO | Plan 02 (review system) has no summary file; the code was implemented but the summary was never created |

### Human Verification Required

### 1. GitHub OAuth Login Flow

**Test:** Click "Sign in" button in header. Verify redirect to GitHub OAuth consent screen. After consent, verify avatar + username appears in header.
**Expected:** GitHub login redirects, session creates, avatar visible.
**Why human:** Requires running server with GitHub OAuth app credentials (AUTH_GITHUB_ID/AUTH_GITHUB_SECRET not currently in .env).

### 2. Review Submission End-to-End

**Test:** Navigate to any tool detail page. Click "Write a Review". Select 3-5 stars. Add optional content. Click submit.
**Expected:** Review appears in list below, avgRating updates in sidebar, success message shown.
**Why human:** Requires authenticated session + database with tool records + running server.

### 3. Review Upsert Behavior

**Test:** Submit a second review for the same tool as the same user.
**Expected:** Existing review is updated (rating/content changed), review count does not increase, avgRating recalculates.
**Why human:** Requires running server with database to verify @@unique constraint enforcement and upsert behavior.

### 4. Tag Voting with 3-Vote Cap

**Test:** On a tool detail page, click 4 different tag pills.
**Expected:** First 3 votes succeed (pill turns accent color). 4th click shows "You can vote for up to 3 tags per tool" message. Click a voted tag to unvote (toggle).
**Why human:** Requires authenticated session + interactive UI testing to verify animations and optimistic updates.

### 5. Tool Submission Flow

**Test:** Navigate to /submit page. Enter a valid GitHub repo URL (e.g., https://github.com/facebook/react). Wait for validation. Submit.
**Expected:** Green checkmark on valid URL, "Thank you! Your submission is pending review." confirmation card.
**Why human:** Requires authenticated session + GitHub API access for repo validation.

### 6. Admin Submission Review

**Test:** Navigate to /admin/submissions while logged in as admin user (ADMIN_GITHUB_IDS configured). Verify pending submissions appear. Click Approve on one.
**Expected:** Submission removed from list. New Tool record created with GitHub metadata (stars, forks, description, language). Verify in database.
**Why human:** Requires admin user session + database with PENDING submissions + GitHub API for auto-fetch.

### 7. Bilingual i18n Coverage

**Test:** Switch to Chinese locale (click "zhong wen" in header). Navigate through all community features.
**Expected:** All review form labels, tag labels, submit form text, and confirmation messages appear in Chinese.
**Why human:** Visual verification of locale switching across all community feature surfaces.

### 8. Unauthenticated User Experience

**Test:** While signed out, try to write a review, vote on a tag, and submit a tool.
**Expected:** Review form shows "Sign in with GitHub to write a review". Tag click redirects to GitHub login. Submit page shows "Sign in to submit a tool" card.
**Why human:** Requires running server to verify all auth gates work consistently.

### Gaps Summary

No code gaps were found. All 28 artifacts exist, are substantive (no stubs), and are wired end-to-end. All 23 decision IDs (D-01 to D-23) are satisfied by the implementation. Data flows correctly from database through API to UI components.

Two minor issues noted:
1. **Missing .env.example auth vars** (WARNING): The .env.example file does not include AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, or ADMIN_GITHUB_IDS. New developers will not know which environment variables to configure. The SUMMARY for Plan 01 says they were added, but the file was not updated.
2. **Missing 04-02-SUMMARY.md** (INFO): Plan 02 (review system) has no summary file. The code is implemented correctly, but the documentation gap should be noted.

All automated verification passes. Human testing is required for the 8 interactive flows listed above because they require a running server with GitHub OAuth credentials and database access.

---

_Verified: 2026-04-09T02:10:00Z_
_Verifier: Claude (gsd-verifier)_
