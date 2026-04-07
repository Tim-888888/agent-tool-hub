# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Next.js App Router with client-side rendering and static generation

The application is a single-page-style directory website (AgentToolHub) built on Next.js 16 with the App Router pattern. The current MVP uses mock data exclusively -- there is no active database connection or API layer. All pages are client-rendered (`"use client"`) except for a few server components that handle metadata generation and static param generation.

**Key Characteristics:**
- **Client-heavy architecture**: Almost all components are `"use client"`. Server components are limited to route `page.tsx` files that generate metadata and pass data to client counterparts.
- **Mock data layer**: `src/lib/mock-data.ts` acts as the entire data layer. The Prisma schema exists but `src/lib/db.ts` is fully commented out.
- **Client-side i18n**: Internationalization is handled via React Context (`I18nProvider`) rather than Next.js built-in locale routing. Locale is persisted in `localStorage`.
- **CSS custom properties theming**: Light/dark themes are implemented via CSS variables toggled by a `.dark` class on `<html>`.
- **No API routes**: Despite `docs/TECHNICAL_DESIGN.md` planning for `/api/*` routes, none exist yet.

## Layers

**Presentation Layer (Components):**
- Purpose: Render UI and handle user interaction
- Location: `src/components/`
- Contains: React components organized by domain (home, tools, layout, ui, shared)
- Depends on: `src/lib/` (utilities, i18n context, mock data), `src/types/` (type definitions)
- Used by: `src/app/` route pages

**Routing Layer (Pages):**
- Purpose: Map URL paths to components and provide metadata for SEO
- Location: `src/app/`
- Contains: Next.js App Router page files and their client-side counterparts
- Depends on: `src/components/`, `src/lib/mock-data.ts`, `src/types/`
- Used by: Next.js framework

**Data Layer (Mock):**
- Purpose: Provide tool, category, and platform data with filtering and sorting
- Location: `src/lib/mock-data.ts`
- Contains: Hardcoded arrays (`TOOLS`, `CATEGORIES`, `PLATFORMS`) and query functions (`getTools`, `getToolBySlug`, `getFeaturedTools`, etc.)
- Depends on: `src/types/`
- Used by: All page components and several UI components

**Internationalization Layer:**
- Purpose: Provide bilingual (en/zh) translations
- Location: `src/i18n/` (translation files), `src/lib/i18n-context.tsx` (React Context provider)
- Contains: JSON dictionaries, locale config, context provider with `t()` function
- Depends on: Nothing external
- Used by: Nearly all client components via `useI18n()` hook

**Type Definitions Layer:**
- Purpose: Define shared TypeScript interfaces and type constants
- Location: `src/types/index.ts`
- Contains: `Tool`, `Category`, `Platform`, `InstallGuide`, `Review`, `Submission`, `ToolFilters`, `PaginatedResponse<T>`
- Depends on: Nothing
- Used by: All layers

**Database Schema Layer (Inactive):**
- Purpose: Define the intended production database schema
- Location: `prisma/schema.prisma`
- Contains: Models for `Tool`, `Category`, `Platform`, `ToolCategory`, `ToolPlatform`, `Review`, `Submission` with enums
- Depends on: `@prisma/client` (not connected)
- Used by: Not used in current MVP

## Data Flow

**Home Page:**

1. `src/app/page.tsx` (client) imports mock data directly
2. `HomePage` renders `Header`, `HeroSection`, `FeaturedTools`, `NewestTools`, `CategoryGrid`, `Footer`
3. Tool counts computed inline by iterating `TOOLS` array
4. `useI18n()` provides `t()` for translation lookup

**Tool Detail Page:**

1. `src/app/tools/[slug]/page.tsx` (server) calls `generateStaticParams()` from mock data
2. `generateMetadata()` creates per-tool SEO metadata including Open Graph and JSON-LD
3. Server component passes `Tool` object to `ToolDetailClient` (client component)
4. `ToolDetailClient` renders full detail view with install guides, compatibility matrix, reviews
5. JSON-LD structured data is embedded via `dangerouslySetInnerHTML`

**Tools List Page:**

1. `src/app/tools/page.tsx` (server) wraps `ToolsClient` in `<Suspense>`
2. `ToolsClient` (client) reads URL search params via `useSearchParams()`
3. Filters are managed in local state, tools computed via `useMemo` calling `getTools(filters)`
4. `FilterBar` renders type toggles, platform/category selects, and sort dropdown

**State Management:**
- All state is component-local (`useState`)
- No global state management library (Zustand, Redux, etc.)
- I18n state is the closest thing to global state, managed via React Context
- Theme (dark/light) is toggled by manipulating `document.documentElement.classList` directly (not in state)
- URL state: search query passed via `?q=` search params

## Key Abstractions

**Tool (domain model):**
- Purpose: Core entity representing an AI agent tool (MCP Server, Skill, or Rule)
- Examples: `src/types/index.ts` (interface), `prisma/schema.prisma` (database model), `src/lib/mock-data.ts` (mock instances)
- Pattern: Shared TypeScript interface with matching Prisma model

**InstallGuide (structured config):**
- Purpose: Per-platform installation instructions keyed by platform slug
- Examples: `src/types/index.ts` (type definition)
- Pattern: Record type where keys are platform slugs and values contain method, command, targetFile, config, copyText

**I18nProvider (React Context):**
- Purpose: Provide locale, dictionary, and `t()` translation function to all components
- Examples: `src/lib/i18n-context.tsx`
- Pattern: Context + Provider + custom hook (`useI18n()`). Uses `localStorage` for persistence.

**Mock Data Functions:**
- Purpose: Simulate a data access layer with filtering, sorting, and lookups
- Examples: `src/lib/mock-data.ts` -- `getTools()`, `getToolBySlug()`, `getFeaturedTools()`, `getNewestTools()`, `getTrendingTools()`
- Pattern: Pure functions operating on in-memory arrays. Filtering is immutable (spread + filter).

## Entry Points

**Next.js App Router:**
- Location: `src/app/layout.tsx`
- Triggers: HTTP request to any route
- Responsibilities: Root layout with fonts, metadata, `I18nProvider` wrapper, global CSS

**Home Page:**
- Location: `src/app/page.tsx`
- Triggers: `GET /`
- Responsibilities: Renders hero, featured tools, newest tools, category grid

**Tools List:**
- Location: `src/app/tools/page.tsx` -> `src/app/tools/ToolsClient.tsx`
- Triggers: `GET /tools`, `GET /tools?q=search`
- Responsibilities: Filterable, searchable tool grid

**Tool Detail:**
- Location: `src/app/tools/[slug]/page.tsx` -> `src/app/tools/[slug]/ToolDetailClient.tsx`
- Triggers: `GET /tools/{slug}`
- Responsibilities: Full tool detail with SEO metadata, JSON-LD, install guides

**Category Detail:**
- Location: `src/app/categories/[slug]/page.tsx` -> `src/app/categories/[slug]/CategoryDetailClient.tsx`
- Triggers: `GET /categories/{slug}`
- Responsibilities: Tools filtered by category

**Rankings:**
- Location: `src/app/rankings/page.tsx`
- Triggers: `GET /rankings`
- Responsibilities: Overall/weekly/newest tool rankings with tab navigation

**Submit:**
- Location: `src/app/submit/page.tsx`
- Triggers: `GET /submit`
- Responsibilities: Form for submitting new tools (client-side only, no API endpoint)

**About:**
- Location: `src/app/about/page.tsx`
- Triggers: `GET /about`
- Responsibilities: Static about page (server component, no client-side interactivity)

## Error Handling

**Strategy:** Minimal / implicit

**Patterns:**
- Route pages use `notFound()` from `next/navigation` for missing tools/categories
- Client components have no error boundaries
- `CopyButton` uses try/catch with fallback to `document.execCommand('copy')`
- Review section shows hardcoded rating distribution percentages (70/20/7/2/1) since there are no real reviews
- Submit form validates input client-side with inline error messages

## Cross-Cutting Concerns

**Logging:** No logging framework. Console output not used.

**Validation:**
- Submit form: client-side regex validation for GitHub URL and email format
- Tool filters: type-safe via `ToolFilters` interface but validation is implicit in filter functions
- No server-side validation (no API routes exist)

**Authentication:** None. No auth provider, no protected routes, no user accounts.

**Theming:**
- Light/dark mode via CSS custom properties defined in `src/app/globals.css`
- Toggle implemented in `Header` component by manipulating `.dark` class on `<html>`
- Theme state is not persisted (resets to dark on reload since `<html>` has `className="dark"` hardcoded in layout)

**SEO:**
- `generateMetadata()` on tool detail and category pages
- JSON-LD structured data on tool detail pages (`SoftwareApplication` schema)
- Open Graph and Twitter card metadata in root layout
- `generateStaticParams()` for static generation of tool and category pages

---

*Architecture analysis: 2026-04-07*
