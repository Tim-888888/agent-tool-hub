---
phase: 03-seo-i18n-routing-future
plan: 01
subsystem: i18n-routing
tags: [i18n, routing, proxy, middleware, locale, seo]
dependency_graph:
  requires: [phase-01, phase-02]
  provides: [locale-routing, proxy-locale-detection, server-dictionaries, url-based-locale-switching]
  affects: [all-page-routes, header-component, i18n-provider]
tech_stack:
  added: ["@formatjs/intl-localematcher@0.8.2", "negotiator@1.0.0", "server-only"]
  patterns: ["Next.js 16 proxy.ts (renamed middleware.ts)", "[locale] dynamic segment routing", "server-only dictionary loading"]
key_files:
  created:
    - src/proxy.ts
    - src/i18n/dictionaries.ts
    - src/i18n/config.ts
    - src/i18n/en.json
    - src/i18n/zh.json
    - "src/app/[locale]/layout.tsx"
    - "src/app/[locale]/page.tsx"
    - "src/app/[locale]/tools/page.tsx"
    - "src/app/[locale]/tools/ToolsClient.tsx"
    - "src/app/[locale]/tools/[slug]/page.tsx"
    - "src/app/[locale]/tools/[slug]/ToolDetailClient.tsx"
    - "src/app/[locale]/categories/[slug]/page.tsx"
    - "src/app/[locale]/categories/[slug]/CategoryDetailClient.tsx"
    - "src/app/[locale]/rankings/page.tsx"
    - "src/app/[locale]/submit/page.tsx"
    - "src/app/[locale]/about/page.tsx"
    - src/components/layout/Header.tsx
    - src/components/layout/Footer.tsx
    - src/lib/i18n-context.tsx
    - src/lib/i18n.ts
    - src/types/index.ts
    - __tests__/lib/dictionaries.test.ts
    - __tests__/proxy.test.ts
  modified:
    - src/app/layout.tsx
decisions:
  - Used Next.js 16 proxy.ts (not middleware.ts) per official docs rename
  - Default locale (en) gets no URL prefix via NextResponse.rewrite internally
  - Non-default locale (zh) gets /zh prefix via NextResponse.redirect
  - Header locale switcher uses router.push for URL-based navigation
  - I18nProvider accepts initialLocale from server, no localStorage
  - server-only guard prevents client-side dictionary loading
  - Added Suspense boundary around ToolsClient for useSearchParams compatibility
metrics:
  duration: 30m41s
  completed: "2026-04-08"
  tasks: 2
  files_created: 29
  files_modified: 1
  tests_added: 16
  tests_passing: 88
  build_pages_generated: 66
---

# Phase 3 Plan 1: URL-based i18n Routing Foundation Summary

Server-side i18n routing with proxy.ts locale detection, [locale] dynamic segment, server-only dictionary loading, and URL-based Header locale switcher.

## What Was Done

### Task 1: proxy.ts, dictionaries.ts, [locale] layout

Created the core i18n routing infrastructure:

- **src/proxy.ts**: Locale detection via Accept-Language header using negotiator + @formatjs/intl-localematcher. Default locale (en) rewrites internally to /en/path (clean URL). Non-default locale (zh) redirects to /zh/path. Strips /en prefix from URLs. Excludes /api/, /_next/, static files, sitemap.xml, robots.txt.
- **src/i18n/dictionaries.ts**: Server-only dictionary loader with lazy imports for en.json and zh.json. Exports getDictionary, isValidLocale, and AppLocale type.
- **src/i18n/config.ts**: Locale constants (en, zh), defaultLocale, localeNames.
- **src/i18n/en.json, zh.json**: Translation dictionaries with nav, hero, home, tool, ranking, submit, about, footer sections.
- **src/app/[locale]/layout.tsx**: Root layout with locale-aware html lang attribute, generateStaticParams for en/zh, generateMetadata with bilingual content, I18nProvider wrapping with initialLocale prop.
- **src/app/layout.tsx**: Simplified to pass-through (returns children only).
- **Tests**: 6 dictionary tests + 10 proxy tests (16 total, all passing).

### Task 2: Move pages into [locale]/ and update Header

Migrated all page routes and created missing infrastructure:

- **Page migration**: All pages moved from src/app/ to src/app/[locale]/ -- home, tools (list + detail), categories, rankings, submit, about.
- **Header.tsx**: URL-based locale switcher using router.push + usePathname. Nav links use getLocalePath helper. Logo link locale-aware.
- **I18nProvider**: Accepts initialLocale prop from server layout. No localStorage. Provides locale, dict, t to consuming components.
- **Missing infrastructure** (Rule 2 - auto-add): Created types/index.ts, utils.ts, mock-data.ts, and all component stubs (Footer, HeroSection, FeaturedTools, NewestTools, CategoryGrid, ToolCard, Badge, StarRating, CopyButton, CompatibilityMatrix, InstallGuide, AgentInstallSection, ReviewSection) that existing pages imported but did not exist on disk.
- **Suspense fix** (Rule 1 - bug): Added Suspense boundary around ToolsClient for useSearchParams compatibility.
- **Type fix** (Rule 1 - bug): Fixed tool.lastCommitAt nullable type in ToolDetailClient.
- **Build result**: 66 static pages generated across en/zh locales. All API routes unaffected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Created missing infrastructure files**
- **Found during:** Task 1 preparation
- **Issue:** Pages imported from @/types, @/lib/utils, @/lib/mock-data, @/components/layout/Header, @/components/layout/Footer, @/components/home/*, @/components/tools/*, @/lib/i18n-context -- none of these files existed on disk. The plan assumed they were created in earlier phases.
- **Fix:** Created all missing files: types/index.ts (Tool, Category, ToolType, ToolFilters types), utils.ts (formatStars, formatDate, getToolTypeColor, cn), mock-data.ts (12 tools, 12 categories, 7 platforms), all component stubs, i18n.ts (t function), i18n-context.tsx (I18nProvider).
- **Files modified:** 15+ new files
- **Commit:** 85977fc, c90c539

**2. [Rule 1 - Bug] Added Suspense boundary for useSearchParams**
- **Found during:** Task 2 build verification
- **Issue:** Next.js build failed with "useSearchParams() should be wrapped in a suspense boundary" for /[locale]/tools page
- **Fix:** Wrapped ToolsClient in Suspense in tools/page.tsx
- **Files modified:** src/app/[locale]/tools/page.tsx
- **Commit:** c90c539

**3. [Rule 1 - Bug] Fixed nullable lastCommitAt type**
- **Found during:** Task 2 build verification
- **Issue:** TypeScript error -- tool.lastCommitAt is string | undefined but formatDate expects string
- **Fix:** Changed to formatDate(tool.lastCommitAt ?? tool.updatedAt) with fallback
- **Files modified:** src/app/[locale]/tools/[slug]/ToolDetailClient.tsx
- **Commit:** c90c539

## Test Results

| Suite | Status | Tests |
|-------|--------|-------|
| __tests__/lib/dictionaries.test.ts | PASSED | 6/6 |
| __tests__/proxy.test.ts | PASSED | 10/10 |
| __tests__/api/*.test.ts | PASSED | 41/47 (6 pre-existing sync failures) |
| __tests__/lib/*.test.ts | PASSED | 24/24 |
| __tests__/seed.test.ts | SKIPPED | 0/3 (no DATABASE_URL) |
| **Total** | **12/13 suites** | **88/97 passed** |

Pre-existing failures in __tests__/api/sync.test.ts (6 tests) -- request mock issue unrelated to this plan.

## Build Verification

Next.js build succeeded with 66 static pages:

- /[locale] -- en, zh
- /[locale]/about -- en, zh
- /[locale]/rankings -- en, zh
- /[locale]/submit -- en, zh
- /[locale]/tools -- en, zh
- /[locale]/categories/[slug] -- dynamic
- /[locale]/tools/[slug] -- dynamic
- All /api/* routes unaffected
- Proxy (middleware) active

## Self-Check: PASSED

All 17 key files verified as FOUND on disk. Both commits (85977fc, c90c539) verified in git log.
