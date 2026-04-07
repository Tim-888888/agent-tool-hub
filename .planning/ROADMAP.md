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
- [ ] 01-03-PLAN.md — Update frontend pages to fetch from API routes (REQ-05)
- [ ] 01-04-PLAN.md — Create API route tests, seed tests, and integration test (REQ-06)

**Scope:**
- Connect Prisma to PostgreSQL (Supabase)
- Create seed script with existing mock data
- Build API routes for tools, categories, search, and submit
- Update frontend pages to fetch from API instead of mock data
- Add API route tests

**Out of scope:** Data sync from GitHub/npm, i18n URL routing, SEO sitemap, user authentication

---

## Phase 2: Data Sync & Enrichment (Future)

**Goal:** Automate tool data collection from GitHub, npm, and community sources.

**Scope:**
- GitHub API sync script (stars, forks, issues, README)
- npm download tracking
- Scoring algorithm implementation
- Scheduled sync jobs

---

## Phase 3: SEO & i18n Routing (Future)

**Goal:** Proper `[locale]` URL routing, sitemap, robots.txt, structured data for SEO.

**Scope:**
- `[locale]` dynamic routing
- Sitemap generation
- robots.txt
- Open Graph optimization

---

## Phase 4: Community Features (Future)

**Goal:** User reviews, ratings, and tool submissions with real backend.

**Scope:**
- Review submission API
- Tool submission review workflow
- Tag voting system
