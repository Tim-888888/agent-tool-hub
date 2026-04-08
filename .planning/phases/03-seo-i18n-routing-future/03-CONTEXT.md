# Phase 3: SEO & i18n Routing - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement `[locale]` URL routing for i18n, dynamic SEO metadata generation, JSON-LD structured data for tool pages, sitemap, and robots.txt. Migrate from current client-side-only i18n (localStorage) to URL-based locale routing that is SEO-friendly. New tool discovery, user auth, and community features are out of scope.

</domain>

<decisions>
## Implementation Decisions

### i18n Routing Strategy
- **D-01:** Only non-default locales get URL prefix — `/tools/xxx` (English, default) vs `/zh/tools/xxx` (Chinese). Shorter URLs for primary audience, SEO-friendly.
- **D-02:** Use App Router `[locale]` dynamic segment — all page routes move into `src/app/[locale]/` directory structure
- **D-03:** Language detection via `Accept-Language` header in middleware — Chinese-speaking users auto-redirected to `/zh/` with 301
- **D-04:** API routes (`/api/tools`, `/api/sync`, etc.) stay outside `[locale]` — no locale prefix for API endpoints
- **D-05:** Must research Next.js 16 breaking changes for `[locale]` routing before implementation (per AGENTS.md warning)

### i18n Data Source
- **D-06:** Claude decides the best technical approach for i18n data layer — key constraints: SEO-friendly (server-rendered translations), compatible with Next.js 16 App Router, preserve existing translation JSON data (`src/i18n/en.json`, `zh.json`)

### SEO Metadata
- **D-07:** Dynamic `generateMetadata()` per page — each tool/category page generates unique title, description, and OG tags based on database data
- **D-08:** Bilingual metadata — title and description rendered in the page's locale language
- **D-09:** JSON-LD `SoftwareApplication` schema embedded on tool detail pages only — includes name, install commands, platforms, requirements per TECHNICAL_DESIGN.md spec

### Sitemap & robots.txt
- **D-10:** Dynamic sitemap via `sitemap.ts` — auto-generated from database tools and categories, includes all locale URL variants
- **D-11:** robots.txt via `robots.ts` — allow all crawlers, disallow `/api/` paths, point to sitemap URL

### Migration & Compatibility
- **D-12:** 301 redirect old URLs in middleware — `/tools/xxx` → `/tools/xxx` (default en) or `/zh/tools/xxx` (based on Accept-Language). Preserves existing SEO equity and external links.

### Claude's Discretion
- Exact i18n library/approach (keep JSON+t() vs migrate to next-intl vs custom)
- How to restructure existing components to work with server-side locale
- JSON-LD schema field mapping from database model
- Sitemap change frequency and priority values
- Middleware implementation details for locale detection and redirects
- How to handle the root `/` route for locale routing

</decisions>

<canonical_refs>
## Canonical References

### i18n & Routing
- `src/i18n/config.ts` — Locale list and defaults (en, zh)
- `src/lib/i18n-context.tsx` — Current client-side i18n provider (to be refactored)
- `src/i18n/en.json` — English translation dictionary
- `src/i18n/zh.json` — Chinese translation dictionary
- `src/app/layout.tsx` — Root layout with I18nProvider wrapper and static metadata
- `next.config.ts` — Currently empty config (i18n settings may go here)

### SEO & Structured Data
- `docs/TECHNICAL_DESIGN.md` 6.1-6.3 — SEO strategy, URL structure, keyword strategy
- `docs/TECHNICAL_DESIGN.md` 2.3 — JSON-LD SoftwareApplication schema definition with install instructions
- `docs/TECHNICAL_DESIGN.md` 3 — Planned project structure with `[locale]/` routing

### Database & Data Layer
- `prisma/schema.prisma` — Tool model with bilingual fields (nameEn/nameZh, description/descriptionZh, featuresEn/featuresZh)
- `src/lib/db.ts` — Active Prisma client singleton
- `src/app/api/tools/route.ts` — Existing tools API (metadata generation needs tool data)

### Next.js 16 Compatibility
- `AGENTS.md` — Warning about Next.js 16 breaking changes, consult `node_modules/next/dist/docs/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/i18n/en.json` + `zh.json`: Full translation dictionaries — can be reused regardless of i18n approach
- `src/i18n/config.ts`: Locale list and defaults — already defines `locales`, `defaultLocale`, `localeNames`
- `prisma/schema.prisma`: Tool model already has bilingual fields (nameEn, nameZh, descriptionZh, featuresEn, featuresZh)
- `src/app/layout.tsx`: Has basic metadata (title template, OG, twitter) — will need to become locale-aware
- `docs/TECHNICAL_DESIGN.md`: Detailed JSON-LD schema spec and URL structure plan already written

### Established Patterns
- Server/client component split: `page.tsx` (server) → `*Client.tsx` (client) pattern
- API routes in `src/app/api/` — stay outside `[locale]` routing
- Static metadata export in layout.tsx — needs conversion to `generateMetadata()` for dynamic locale
- `generateStaticParams` already used in some pages (e.g., `[slug]` routes) — pattern extends to `[locale]`

### Integration Points
- All pages in `src/app/` need to move into `src/app/[locale]/` subdirectory
- Root `layout.tsx` needs locale-aware metadata and lang attribute
- Header component has locale switcher — needs to change URLs instead of localStorage
- `I18nProvider` context may need to become server-compatible or be replaced
- `next.config.ts` likely needs i18n domain/locale configuration

</code_context>

<specifics>
## Specific Ideas

- URL structure from TECHNICAL_DESIGN.md: `/en/tools/brave-search-mcp`, `/zh/tools/brave-search-mcp`
- Accept-Language redirect should only happen on first visit, not override explicit URL choices
- JSON-LD should match the schema already defined in TECHNICAL_DESIGN.md section 2.3 (with installInstructions array)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-seo-i18n-routing-future*
*Context gathered: 2026-04-08*
