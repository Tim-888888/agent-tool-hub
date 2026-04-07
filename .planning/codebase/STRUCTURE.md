# Codebase Structure

**Analysis Date:** 2026-04-07

## Directory Layout

```
agent-tool-hub/
├── __tests__/                  # Jest unit tests (co-located by module)
├── docs/                       # Product and technical documentation
├── prisma/                     # Database schema (inactive in MVP)
├── public/                     # Static assets served at root
│   └── images/                 # (empty) Image assets directory
├── scripts/                    # (empty) Build and data sync scripts
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── about/              # About page
│   │   ├── categories/         # Category detail routes
│   │   │   └── [slug]/         # Dynamic category pages
│   │   ├── rankings/           # Rankings page
│   │   ├── submit/             # Tool submission page
│   │   └── tools/              # Tool list and detail routes
│   │       └── [slug]/         # Dynamic tool detail pages
│   ├── components/             # React components organized by domain
│   │   ├── home/               # Homepage-specific components
│   │   ├── layout/             # Shared layout components (Header, Footer)
│   │   ├── shared/             # Reusable cross-cutting components
│   │   ├── tools/              # Tool-specific components
│   │   └── ui/                 # Generic UI primitives
│   ├── i18n/                   # Translation files and config
│   ├── lib/                    # Utilities, data access, i18n context
│   └── types/                  # Shared TypeScript type definitions
├── .env.example                # Environment variable template
├── eslint.config.mjs           # ESLint flat config
├── jest.config.ts              # Jest test configuration
├── jest.setup.ts               # Jest setup (minimal)
├── next.config.ts              # Next.js configuration (minimal)
├── package.json                # Dependencies and scripts
├── postcss.config.mjs          # PostCSS with Tailwind plugin
└── tsconfig.json               # TypeScript configuration
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and layouts
- Contains: `page.tsx` files per route, paired `*Client.tsx` files for client-rendered logic
- Key files: `src/app/layout.tsx` (root layout), `src/app/page.tsx` (home), `src/app/tools/page.tsx` (tools list), `src/app/tools/[slug]/page.tsx` (tool detail)
- Pattern: Server component `page.tsx` handles metadata + static params, delegates rendering to a co-located `*Client.tsx` component

**`src/components/home/`:**
- Purpose: Components used only on the homepage
- Contains: `HeroSection.tsx`, `FeaturedTools.tsx`, `NewestTools.tsx`, `CategoryGrid.tsx`
- Key files: `src/components/home/HeroSection.tsx` (hero with stats), `src/components/home/CategoryGrid.tsx` (category cards with Lucide icon map)

**`src/components/layout/`:**
- Purpose: Shared layout elements wrapping every page
- Contains: `Header.tsx`, `Footer.tsx`
- Key files: `src/components/layout/Header.tsx` (nav, search, locale toggle, theme toggle, mobile menu)

**`src/components/tools/`:**
- Purpose: Components for tool display and detail views
- Contains: `ToolCard.tsx`, `InstallGuide.tsx`, `AgentInstallSection.tsx`, `ReviewSection.tsx`, `CompatibilityMatrix.tsx`
- Key files: `src/components/tools/ToolCard.tsx` (reusable card for tool grids), `src/components/tools/InstallGuide.tsx` (tabbed per-platform install instructions)

**`src/components/ui/`:**
- Purpose: Generic, domain-agnostic UI primitives
- Contains: `Badge.tsx`, `Card.tsx`, `SearchInput.tsx`, `FilterBar.tsx`
- Key files: `src/components/ui/Card.tsx` (linkable card wrapper), `src/components/ui/FilterBar.tsx` (type/platform/category/sort filters)

**`src/components/shared/`:**
- Purpose: Reusable components used across multiple domains
- Contains: `StarRating.tsx`, `CopyButton.tsx`, `PlatformBadge.tsx`
- Key files: `src/components/shared/StarRating.tsx` (star display with half-star support), `src/components/shared/CopyButton.tsx` (clipboard copy with fallback)

**`src/lib/`:**
- Purpose: Utility functions, data access layer, and React context providers
- Contains: `utils.ts`, `mock-data.ts`, `i18n.ts`, `i18n-context.tsx`, `db.ts`
- Key files: `src/lib/mock-data.ts` (entire data layer -- 379 lines of mock tools/categories/platforms + query functions), `src/lib/i18n-context.tsx` (I18nProvider + useI18n hook), `src/lib/utils.ts` (cn, formatStars, slugify, formatDate, getToolTypeColor, getPlatformColor)

**`src/i18n/`:**
- Purpose: Translation dictionaries and locale configuration
- Contains: `config.ts`, `en.json`, `zh.json`
- Key files: `src/i18n/en.json` (English translations with nested keys), `src/i18n/config.ts` (locale list and defaults)

**`src/types/`:**
- Purpose: Shared TypeScript interfaces and type constants
- Contains: `index.ts` (all types in one file)
- Key files: `src/types/index.ts` -- exports `Tool`, `Category`, `Platform`, `InstallGuide`, `Review`, `Submission`, `ToolFilters`, `PaginatedResponse<T>`, `PLATFORM_SLUGS`, `TOOL_TYPE_CONFIG`

**`prisma/`:**
- Purpose: Database schema definition for future production use
- Contains: `schema.prisma`
- Key files: `prisma/schema.prisma` (7 models: Tool, Category, Platform, ToolCategory, ToolPlatform, Review, Submission + 3 enums)
- Status: Schema defined but not connected. No migrations, no seed file.

**`__tests__/`:**
- Purpose: Unit tests mirroring `src/lib/` structure
- Contains: `lib/utils.test.ts`, `lib/mock-data.test.ts`, `lib/i18n.test.ts`
- Pattern: Tests are in a separate `__tests__/` directory (not co-located with source files)

**`docs/`:**
- Purpose: Product requirements and technical architecture documentation
- Contains: `PRD.md` (product spec in Chinese), `TECHNICAL_DESIGN.md` (architecture spec in Chinese)
- Key files: `docs/PRD.md` (full product spec), `docs/TECHNICAL_DESIGN.md` (planned architecture with API design, data sync, SEO strategy)

**`scripts/`:** Empty directory. Planned for data sync scripts (`sync-tools.ts`, `sync-skills.ts`, `seed-featured.ts` per technical design).

**`public/images/`:** Empty directory. Planned for screenshot and image assets.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout -- fonts, metadata, I18nProvider wrapper
- `src/app/page.tsx`: Home page (client component)
- `src/app/tools/page.tsx`: Tools list (server wrapper) -> `src/app/tools/ToolsClient.tsx` (client logic)
- `src/app/tools/[slug]/page.tsx`: Tool detail (server) -> `src/app/tools/[slug]/ToolDetailClient.tsx` (client)
- `src/app/categories/[slug]/page.tsx`: Category detail (server) -> `src/app/categories/[slug]/CategoryDetailClient.tsx` (client)
- `src/app/rankings/page.tsx`: Rankings (client)
- `src/app/submit/page.tsx`: Submission form (client)
- `src/app/about/page.tsx`: About page (server component, no client counterpart)

**Configuration:**
- `package.json`: Dependencies and scripts (dev, build, start, lint, test, test:watch, test:coverage)
- `tsconfig.json`: TypeScript config with `@/*` path alias mapping to `./src/*`
- `next.config.ts`: Next.js config (currently empty options)
- `eslint.config.mjs`: ESLint flat config with next/core-web-vitals + next/typescript
- `jest.config.ts`: Jest config with ts-jest, jsdom environment, `@/` module mapping
- `postcss.config.mjs`: PostCSS with `@tailwindcss/postcss` plugin
- `.env.example`: Template for DATABASE_URL and GITHUB_TOKEN

**Core Logic:**
- `src/lib/mock-data.ts`: All data (12 tools, 12 categories, 7 platforms) + query functions
- `src/types/index.ts`: All TypeScript interfaces and type constants
- `src/lib/i18n-context.tsx`: I18n React Context provider
- `src/lib/utils.ts`: Utility functions (cn, formatStars, slugify, formatDate, color helpers)
- `src/app/globals.css`: CSS custom properties for theming, glass effect, scrollbar, code blocks

**Testing:**
- `__tests__/lib/utils.test.ts`: Tests for utility functions
- `__tests__/lib/mock-data.test.ts`: Tests for mock data query functions
- `__tests__/lib/i18n.test.ts`: Tests for i18n translation lookup
- `jest.config.ts`: Jest configuration
- `jest.setup.ts`: Minimal setup (imports `@testing-library/jest-dom`)

**Database Schema:**
- `prisma/schema.prisma`: Full schema with Tool, Category, Platform, Review, Submission models
- `src/lib/db.ts`: Commented-out Prisma client singleton (placeholder)

## Naming Conventions

**Files:**
- React components: PascalCase -- `ToolCard.tsx`, `HeroSection.tsx`, `Badge.tsx`
- Page files: `page.tsx` (Next.js convention) with co-located PascalCase client components -- `ToolsClient.tsx`, `ToolDetailClient.tsx`, `CategoryDetailClient.tsx`
- Utility modules: camelCase -- `utils.ts`, `mock-data.ts`, `i18n.ts`
- Context files: kebab-case with `-context` suffix -- `i18n-context.tsx`
- Config files: kebab-case -- `jest.config.ts`, `next.config.ts`, `eslint.config.mjs`
- CSS files: `globals.css`

**Directories:**
- App routes: lowercase, kebab-case for multi-word -- `categories/`, `rankings/`
- Component groups: lowercase -- `home/`, `layout/`, `shared/`, `tools/`, `ui/`
- Dynamic routes: `[slug]` bracket notation -- `[slug]/`

**Exports:**
- Components: default exports -- `export default function ToolCard()`
- Utilities: named exports -- `export function cn()`, `export function formatStars()`
- Types: named exports -- `export interface Tool`, `export type ToolType`
- Constants: named exports -- `export const PLATFORMS`, `export const CATEGORIES`

## Where to Add New Code

**New Page:**
- Route directory: `src/app/{route-name}/page.tsx`
- If client-side interactivity needed: co-locate `*Client.tsx` in same directory
- Example pattern: `src/app/tools/page.tsx` + `src/app/tools/ToolsClient.tsx`

**New Component:**
- Homepage-specific: `src/components/home/{ComponentName}.tsx`
- Tool-related: `src/components/tools/{ComponentName}.tsx`
- Layout: `src/components/layout/{ComponentName}.tsx`
- Reusable UI primitive: `src/components/ui/{ComponentName}.tsx`
- Shared utility component: `src/components/shared/{ComponentName}.tsx`

**New Tool in Mock Data:**
- Add to `TOOLS` array in `src/lib/mock-data.ts`
- Follow the `Tool` interface from `src/types/index.ts`
- Reference `PLATFORMS` and `CATEGORIES` from the same file for relations

**New Translation Key:**
- Add to both `src/i18n/en.json` and `src/i18n/zh.json`
- Use dot notation for nesting: `"tool.type.mcp_server"`
- Access via `t('tool.type.mcp_server')` from `useI18n()`

**New Database Model:**
- Add to `prisma/schema.prisma`
- Add matching TypeScript interface to `src/types/index.ts`
- Update `src/lib/db.ts` when activating Prisma connection

**New API Route (planned but not yet implemented):**
- Create `src/app/api/{route}/route.ts` following Next.js App Router API route convention
- See `docs/TECHNICAL_DESIGN.md` section 4 for planned API endpoints

**New Utility Function:**
- Add to `src/lib/utils.ts` for general-purpose helpers
- Keep domain-specific logic in relevant component or create a new module in `src/lib/`

**New Test:**
- Add to `__tests__/lib/{module}.test.ts` for lib tests
- Add to `__tests__/components/{component}.test.ts` for component tests
- Follow existing Jest + ts-jest setup

**New CSS Custom Property:**
- Add to `src/app/globals.css` in both `:root` (light) and `.dark` (dark) blocks
- Use via `var(--property-name)` in component styles

## Special Directories

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes (by `next build` and `next dev`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: Package dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in `.gitignore`)

**`.planning/`:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes (part of the project)

**`scripts/`:**
- Purpose: Planned for data synchronization and seeding scripts
- Generated: No
- Committed: Yes (currently empty)

**`public/images/`:**
- Purpose: Static image assets for tool screenshots, logos, etc.
- Generated: No
- Committed: Yes (currently empty)

---

*Structure analysis: 2026-04-07*
