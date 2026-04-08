# Phase 2: Data Sync & Enrichment - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Automate tool data collection from GitHub and npm. Sync existing 12 tools' metadata (stars, forks, issues, README, downloads) on a daily schedule. Implement a scoring algorithm for ranking. New tool discovery is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Data Source & Sync Scope
- **D-01:** Only sync data for existing 12 tools — no auto-discovery of new tools
- **D-02:** Fetch from GitHub: stars, forks, openIssues, lastCommitAt, language, license, description update
- **D-03:** Parse README to extract features and installGuide fields, auto-fill featuresZh/featuresEn and installGuide
- **D-04:** Also fetch from npm registry: download counts, version info for tools with npmPackage field

### Scoring Algorithm
- **D-05:** Weighted total score: stars normalized (0-40) + recent activity (0-20) + npm downloads (0-20) + community interaction/forks (0-20)
- **D-06:** Score used for ranking/sorting only — not displayed to users
- **D-07:** Activity measured by lastCommitAt recency: full marks within 30 days, zero after 1 year
- **D-08:** Score stored in Tool model (avgRating or new score field) and updated on each sync

### Scheduled Jobs
- **D-09:** Vercel Cron Jobs — /api/sync endpoint as cron trigger, zero infra config
- **D-10:** Sync once per day (sufficient for GitHub data cadence, conserves API quota)
- **D-11:** Failed sync tasks retry 3 times before giving up, with logging per tool
- **D-12:** Individual tool failures don't block other tools — continue with remaining

### GitHub API Strategy
- **D-13:** Personal access token (GITHUB_TOKEN from .env) — 5000 requests/hour, sufficient for 12 tools
- **D-14:** Check remaining rate limit quota before requests, delay execution when approaching limit
- **D-15:** Fetch repo info via GitHub REST API (GET /repos/{owner}/{repo})
- **D-16:** Fetch README via GitHub REST API (GET /repos/{owner}/{repo}/readme)

### Claude's Discretion
- README parsing logic (how to extract features and installGuide from markdown)
- Exact score field name and storage in Prisma schema
- npm API integration details (which endpoint, what fields)
- Sync endpoint route structure and response format
- Logging implementation (console vs structured logger)
- How to handle tools without GitHub repos or npm packages

</decisions>

<canonical_refs>
## Canonical References

### Database & Data Layer
- `prisma/schema.prisma` — Tool model fields (stars, forks, openIssues, lastCommitAt, avgRating, installGuide Json?, featuresZh/featuresEn String[])
- `src/lib/db.ts` — Active Prisma client singleton
- `src/lib/mock-data.ts` — Reference for tool data structure (12 tools with repoUrl and npmPackage fields)

### API Layer
- `src/lib/api-utils.ts` — Shared API helpers (successResponse, errorResponse patterns)
- `src/app/api/tools/trending/route.ts` — Existing trending endpoint (uses lastCommitAt for sorting)
- `src/app/api/tools/route.ts` — Existing tools list (sort by stars/rating — scoring should integrate here)

### Configuration
- `.env` — GITHUB_TOKEN (currently empty), DATABASE_URL (Supabase pooler)
- `docs/TECHNICAL_DESIGN.md` — Original technical design reference
- `docs/PRD.md` — Product requirements reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db.ts`: Prisma singleton — sync scripts can import and use directly
- `src/lib/api-utils.ts`: successResponse/errorResponse — sync API endpoint can reuse these
- `prisma/seed.ts`: Pattern for upserting tool data — sync can follow same upsert approach
- Tool model has `repoUrl` and `npmPackage` fields already populated in seed data

### Established Patterns
- Prisma upsert for idempotent data writes (from seed.ts)
- API route pattern: GET handler with try/catch, Response.json() returns
- Next.js 16 route handlers in `src/app/api/` directory
- Pooler connection required (not direct Supabase connection)

### Integration Points
- New `/api/sync` route for Vercel Cron trigger
- Update `src/app/api/tools/route.ts` sort options to use new score field
- Tool model may need new field for calculated score (check if avgRating can be repurposed or add `score` field)
- README content needs parsing logic — likely a new utility in `src/lib/readme-parser.ts`
- npm API client — likely a new utility in `src/lib/npm-client.ts`

</code_context>

<specifics>
## Specific Ideas

- Sync should feel like "update in place" — existing tool data gets enriched, not replaced wholesale
- README parsing should handle both standard GitHub README format and common MCP server documentation patterns
- npm download stats add credibility — users want to know if a tool is actually being used

</specifics>

<deferred>
## Deferred Ideas

- Auto-discovery of new tools from GitHub topics or awesome-lists — future phase
- GitHub App authentication — only needed if expanding to community submissions
- Webhook-based real-time sync (instead of polling) — overkill for current scale

</deferred>

---

*Phase: 02-data-sync-enrichment-future*
*Context gathered: 2026-04-08*
