# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**GitHub API:**
- Purpose: Fetch repository metadata (stars, forks, issues, language, license, last commit)
- SDK/Client: No GitHub SDK installed; planned as custom wrapper in `src/lib/github.ts` (file not yet created)
- Auth: `GITHUB_TOKEN` env var (optional, for higher rate limits)
- Status: **Not yet implemented** — design doc specifies REST + GraphQL integration
- Referenced in: `docs/TECHNICAL_DESIGN.md` section 1.3 (Data Sources)

**npm Registry:**
- Purpose: Fetch package download counts and version info
- SDK/Client: Direct REST API calls (planned, not implemented)
- Auth: None required for public packages
- Status: **Not yet implemented**

**PyPI:**
- Purpose: Fetch Python package metadata (downloads, versions)
- SDK/Client: Direct JSON API calls (planned, not implemented)
- Auth: None required
- Status: **Not yet implemented**

## Data Storage

**Databases:**
- PostgreSQL (via Supabase, planned)
  - Connection: `DATABASE_URL` env var
  - ORM: Prisma 7.6.0 (`prisma/schema.prisma`)
  - Client: `@prisma/client` (installed but commented out in `src/lib/db.ts`)
  - Status: **Schema defined but not yet connected** — all data is mock/hardcoded

**Prisma Schema Models:**
- `Tool` - Main tool entity with GitHub metrics, tags, install guides, ratings
- `Category` - Tool categories (Database, Development, API, etc.)
- `Platform` - Supported AI agent platforms (Claude Code, Cursor, Cline, etc.)
- `ToolCategory` - Many-to-many join between Tool and Category
- `ToolPlatform` - Many-to-many join between Tool and Platform
- `Review` - User reviews with ratings
- `Submission` - Community tool submissions with approval workflow

**File Storage:**
- Local filesystem only (`public/images/` directory)
- Screenshot URLs stored as string arrays in Tool model

**Caching:**
- None implemented yet
- Design doc plans: Next.js ISR + SWR for static pages and client-side caching

## Authentication & Identity

**Auth Provider:**
- None implemented
- No authentication or authorization system in place
- Submit form (`src/app/submit/page.tsx`) accepts submissions without auth (client-side only, no backend)

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Console only (no logging library)

## CI/CD & Deployment

**Hosting:**
- Planned: Vercel (`.vercel/` directory not present, no deployment configured)
- Design doc specifies Vercel as hosting platform

**CI Pipeline:**
- None configured (no `.github/workflows/` directory)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:password@localhost:5432/agenttoolhub`)

**Optional env vars:**
- `GITHUB_TOKEN` - GitHub personal access token for API rate limit increase

**Secrets location:**
- `.env.example` present with placeholder values
- `.env` files are gitignored (per `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## JSON-LD Structured Data

**SEO Integration:**
- Tool detail pages (`src/app/tools/[slug]/page.tsx`) emit `SoftwareApplication` JSON-LD schema in `<head>`
- Agent install component (`src/components/tools/AgentInstallSection.tsx`) emits additional JSON-LD with install instructions
- HTML comment markers `<!-- agent-install-start -->` / `<!-- agent-install-end -->` embed agent-readable plain text

## i18n System

**Implementation:**
- Custom React Context-based i18n (no library dependency)
- `src/lib/i18n-context.tsx` - Client-side `I18nProvider` with `useI18n()` hook
- `src/lib/i18n.ts` - Server-side `getDictionary()` function
- `src/i18n/config.ts` - Locale definitions (`en`, `zh`)
- `src/i18n/en.json` - English translations (103 lines)
- `src/i18n/zh.json` - Chinese translations (103 lines)
- Locale persisted in `localStorage` under key `agenttoolhub-locale`
- **NOTE:** URL-based locale routing (`/en/*`, `/zh/*`) is designed but not yet implemented — current routing has no `[locale]` segment

## Planned But Not Yet Implemented

The following integrations are specified in `docs/TECHNICAL_DESIGN.md` but have no code:

| Integration | Purpose | Planned Location |
|-------------|---------|------------------|
| GitHub REST + GraphQL API | Sync repo metrics (stars, forks, issues) | `src/lib/github.ts` |
| npm Registry API | Sync package download counts | `src/lib/sync.ts` |
| PyPI JSON API | Sync Python package metadata | `src/lib/sync.ts` |
| FlexSearch (client) | Client-side full-text search | `src/lib/search.ts` |
| Algolia | Server-side search (post-MVP) | Not yet specified |
| Data sync scripts | Periodic data refresh | `scripts/sync-tools.ts`, `scripts/sync-skills.ts` |
| Seed data script | Initial data population | `prisma/seed.ts` |

---

*Integration audit: 2026-04-07*
