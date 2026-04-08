# AgentToolHub — Project Roadmap

## Overview

AgentToolHub is an AI tool discovery platform. This roadmap covers the backend foundation phase to transition from mock data to a real database-driven application.

---

## Phase 1: Backend Foundation

**Goal:** Replace mock data with real database, seed data, and API routes so the frontend works with actual data.

**Requirements:** REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06

**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Activate Prisma + create idempotent seed script (REQ-01, REQ-02)
- [x] 01-02-PLAN.md — Create all API route handlers for tools and categories (REQ-03, REQ-04)
- [x] 01-03-PLAN.md — Update frontend pages to fetch from API routes (REQ-05)
- [x] 01-04-PLAN.md — Create API route tests, seed tests, and integration test (REQ-06)

**Scope:**
- Connect Prisma to PostgreSQL (Supabase)
- Create seed script with existing mock data
- Build API routes for tools, categories, search, and submit
- Update frontend pages to fetch from API instead of mock data
- Add API route tests

**Out of scope:** Data sync from GitHub/npm, i18n URL routing, SEO sitemap, user authentication

---

## Phase 2: Data Sync & Enrichment

**Goal:** Automate tool data collection from GitHub and npm — sync existing 12 tools' metadata daily, compute weighted ranking scores, and wire scores into the API sort system.

**Requirements:** ROADMAP-02

**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Schema migration + data fetching clients (GitHub, npm, README parser, retry) with unit tests
- [x] 02-02-PLAN.md — Scoring algorithm + wire score into API sort (D-05, D-06, D-07)
- [x] 02-03-PLAN.md — Sync API endpoint + Vercel Cron config + integration tests (D-09, D-10, D-11, D-12)

**Scope:**
- Add score, syncedAt, npmDownloads fields to Tool model
- GitHub API client (stars, forks, issues, lastCommitAt, language, license)
- npm Registry client (weekly download counts)
- README parser (extract features and install guide)
- Retry utility with exponential backoff
- Weighted scoring algorithm (stars 0-40 + activity 0-20 + npm 0-20 + forks 0-20)
- Wire score into buildOrderBy for API ranking
- Strip score from API responses (ranking-only, per D-06)
- /api/sync endpoint with per-tool error isolation
- Vercel Cron for daily sync

**Out of scope:** Auto-discovery of new tools, GitHub App auth, webhook-based real-time sync, user-submitted tools, historical score tracking

---

## Phase 3: SEO & i18n Routing

**Goal:** Migrate from client-side-only i18n (localStorage) to URL-based locale routing that is SEO-friendly. Add dynamic metadata, JSON-LD structured data, sitemap, and robots.txt.

**Plans:** 3 plans

Plans:
- [ ] 03-01-PLAN.md — Proxy + dictionaries + [locale] page restructuring + Header locale switcher (D-01, D-02, D-03, D-04, D-05, D-06, D-12)
- [ ] 03-02-PLAN.md — Dynamic generateMetadata + bilingual content + enhanced JSON-LD (D-07, D-08, D-09)
- [ ] 03-03-PLAN.md — Dynamic sitemap.ts + robots.ts with locale alternates (D-10, D-11)

**Scope:**
- `[locale]` dynamic segment routing (en default, zh prefixed)
- Next.js 16 proxy.ts for locale detection and redirects
- Server-side dictionary loading (no external i18n library)
- Dynamic generateMetadata with bilingual content per page
- JSON-LD SoftwareApplication schema with installInstructions per TECHNICAL_DESIGN.md 2.3
- Dynamic sitemap from database with hreflang alternates
- robots.txt disallowing /api/ and pointing to sitemap

**Out of scope:** Auto-discovery of new tools, user authentication, community features, additional locales beyond en/zh

---

## Phase 4: Community Features (Future)

**Goal:** User reviews, ratings, and tool submissions with real backend.

**Scope:**
- Review submission API
- Tool submission review workflow
- Tag voting system

