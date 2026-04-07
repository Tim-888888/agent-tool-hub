# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `ToolCard.tsx`, `HeroSection.tsx`, `FilterBar.tsx`)
- Utility modules: camelCase (e.g., `mock-data.ts`, `i18n.ts`, `utils.ts`)
- Page files: `page.tsx` (Next.js App Router convention)
- Client component wrappers: `*Client.tsx` suffix (e.g., `ToolsClient.tsx`, `ToolDetailClient.tsx`, `CategoryDetailClient.tsx`)
- Test files: `*.test.ts` co-located in `__tests__/` mirror directory
- i18n locale files: lowercase two-letter code (e.g., `en.json`, `zh.json`)
- CSS files: `globals.css` for global styles

**Functions:**
- Exported utility functions: camelCase (e.g., `formatStars`, `slugify`, `formatDate`, `getToolTypeColor`)
- Data accessor functions: camelCase with `get` prefix (e.g., `getTools`, `getToolBySlug`, `getFeaturedTools`, `getDictionary`)
- React components: PascalCase default exports (e.g., `export default function ToolCard`)
- Translation function: single-letter `t` (e.g., `const { t } = useI18n()`)

**Variables:**
- Constants: UPPER_SNAKE_CASE for config maps (e.g., `PLATFORM_SLUGS`, `TOOL_TYPE_CONFIG`, `ICON_MAP`, `SORT_OPTIONS`)
- Data arrays: UPPER_CASE (e.g., `TOOLS`, `CATEGORIES`, `PLATFORMS`)
- Local state: camelCase via `useState` (e.g., `searchQuery`, `mobileOpen`, `activeTab`)
- Type aliases: PascalCase (e.g., `Locale`, `ToolType`, `ToolStatus`, `PlatformSlug`)

**Types:**
- Interfaces: PascalCase for domain models (e.g., `Tool`, `Category`, `Platform`, `Review`, `Submission`)
- Union types via `type`: PascalCase (e.g., `ToolType`, `ToolStatus`, `SubmissionStatus`, `Locale`, `DictKey`)
- String literal unions instead of enums (e.g., `type ToolType = 'MCP_SERVER' | 'SKILL' | 'RULE'`)
- Props interfaces: named `*Props` (e.g., `CardProps`, `BadgeProps`, `ToolCardProps`, `FilterBarProps`)
- Generic response types: PascalCase with `<T>` (e.g., `PaginatedResponse<T>`)

## Code Style

**Formatting:**
- No dedicated Prettier config file detected
- ESLint provides formatting enforcement via `eslint.config.mjs`
- ESLint config extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Single quotes for string literals in most files; double quotes in some (mixed, not enforced)
- Semicolons present on most lines but not consistently applied
- 2-space indentation

**Linting:**
- ESLint 9 with flat config (`eslint.config.mjs`)
- Extends Next.js core web vitals and TypeScript rules
- Global ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run command: `npm run lint`

**TypeScript Configuration:**
- `strict: true` enabled in `tsconfig.json`
- Target: ES2017, module: esnext, moduleResolution: bundler
- JSX: `react-jsx` (automatic runtime)
- Path alias: `@/*` maps to `./src/*`
- `isolatedModules: true` for compatibility

## Import Organization

**Order (observed consistently across files):**
1. React and framework imports (`useState`, `useEffect`, `useCallback`, `useMemo`, `Link`, `Suspense`)
2. Third-party library imports (`lucide-react` icons, `framer-motion`)
3. Type imports (`import type { ... }`)
4. Internal module imports using `@/` alias (lib, components, types, i18n)
5. Relative imports (`./globals.css`, `./CategoryDetailClient`)
6. JSON imports (`import en from '@/i18n/en.json'`)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in both `tsconfig.json` and `jest.config.ts`)
- Use `@/` for all cross-directory imports
- Use `./` for sibling files in the same directory (e.g., `./ToolsClient`, `./globals.css`)

**Import Style:**
- `import type { ... }` for type-only imports
- Named imports preferred (no `import * as` patterns)
- Default imports for React components and Next.js modules

## Component Conventions

**Component Structure:**
- Functional components only; no class components
- Default exports for components (e.g., `export default function Header()`)
- `"use client"` directive at top of file when using hooks, state, or browser APIs
- Server components omit `"use client"` (e.g., `src/app/tools/[slug]/page.tsx`, `src/app/about/page.tsx`)

**Props Pattern:**
- Named interface for props (e.g., `interface ToolCardProps { tool: Tool }`)
- Destructured in function signature (e.g., `function ToolCard({ tool }: ToolCardProps)`)
- Optional props with `?` and defaults via destructuring (e.g., `size = 'md'`, `className = ''`)

**Client/Server Split:**
- Server components in `page.tsx` files handle data fetching, metadata, and `generateStaticParams`
- Client components in `*Client.tsx` files handle interactivity, state, and user interaction
- Server pages pass data as props to client components (e.g., `<ToolDetailClient tool={tool} />`)
- `Suspense` boundary wraps client components using `useSearchParams` (e.g., `src/app/tools/page.tsx`)

**Layout Pattern:**
- Most pages include `<Header />` and `<Footer />` directly in their JSX
- No shared layout component for page content (Header/Footer are repeated per page)
- The root `layout.tsx` provides `<I18nProvider>` context wrapper

## Styling Conventions

**Approach:**
- Tailwind CSS v4 with `@tailwindcss/postcss` plugin
- CSS custom properties defined in `src/app/globals.css` using `@theme inline` directive
- No separate CSS modules or styled-components

**Design Token System:**
- Semantic tokens in `:root` and `.dark` selector (e.g., `--bg-primary`, `--text-secondary`, `--border`)
- Color tokens for tool types and platforms (e.g., `--color-mcp`, `--color-claude`)
- Dark mode via `.dark` class on `<html>` element
- Tokens referenced in Tailwind classes as `var(--token-name)` (e.g., `text-[var(--text-primary)]`)

**Tailwind Patterns:**
- Use `var()` references inside arbitrary value brackets (e.g., `bg-[var(--bg-secondary)]`)
- Responsive prefixes: `sm:`, `md:`, `lg:` for breakpoints
- Dark mode via explicit `dark:` prefix classes (e.g., `dark:bg-[var(--bg-secondary)]`)
- Spacing and sizing use Tailwind scale values (e.g., `p-4`, `gap-3`, `max-w-6xl`)
- `transition-all duration-200` for standard hover transitions

**Glass Effect:**
- Custom `.glass` CSS class with `backdrop-filter: blur(20px)` for header
- Defined in `src/app/globals.css`

## Internationalization (i18n)

**Approach:**
- Client-side i18n via React Context (`I18nProvider` in `src/lib/i18n-context.tsx`)
- JSON-based dictionaries in `src/i18n/en.json` and `src/i18n/zh.json`
- Dot-notation key lookup via `t()` function (e.g., `t('home.hero.title')`)
- Fallback to key string if translation missing (e.g., `t('nonexistent.key')` returns `'nonexistent.key'`)
- Locale persisted in `localStorage` under key `agenttoolhub-locale`
- Default locale: `en` (configured in `src/i18n/config.ts`)

**Bilingual Content in Data:**
- Domain data objects carry both `en` and `zh` fields (e.g., `nameEn`/`nameZh`, `description`/`descriptionZh`, `featuresEn`/`featuresZh`)
- Components select language inline: `locale === 'zh' ? tool.descriptionZh : tool.description`
- Some inline bilingual strings without `t()` (e.g., in `src/app/rankings/page.tsx`)

## Error Handling

**Patterns:**
- Context hooks throw if used outside provider (e.g., `useI18n()` throws `Error` if no `I18nProvider`)
- `notFound()` from Next.js for missing pages (e.g., `src/app/tools/[slug]/page.tsx`)
- No try-catch blocks in current codebase (MVP stage)
- Validation in forms via local `validate()` function returning boolean (e.g., `src/app/submit/page.tsx`)
- CopyButton has clipboard fallback via `document.execCommand('copy')` with empty `catch` block

**Error State in UI:**
- Error messages stored in state via `Record<string, string>` (e.g., `errors.repoUrl`)
- Conditional rendering of error text below form fields
- Empty state displays for no results (e.g., "No tools found" in `ToolsClient.tsx`)

## Logging

**Framework:** Console (no structured logging library)

**Patterns:**
- No `console.log` statements in production code
- No logging library configured

## Comments

**When to Comment:**
- Comments are sparse throughout the codebase
- Section headers used to delineate JSX regions (e.g., `{/* Breadcrumb */}`, `{/* Mobile menu */}`)
- `dangerouslySetInnerHTML` used for JSON-LD structured data without sanitization comments
- `db.ts` contains commented-out Prisma setup with instructions

**JSDoc/TSDoc:**
- Not used in the codebase
- No function documentation comments

## Function Design

**Size:**
- Utility functions are small and focused (under 20 lines each in `src/lib/utils.ts`)
- Component functions range from 10 to 280 lines; larger ones like `ToolDetailClient.tsx` (~216 lines) and `SubmitPage.tsx` (~284 lines) could benefit from extraction
- Data filter/sort logic kept in dedicated functions (e.g., `getTools()` in `mock-data.ts`)

**Parameters:**
- Props interfaces with typed parameters
- Optional parameters via `?` with defaults
- Filter functions accept a single options object (e.g., `getTools(filters?)`)

**Return Values:**
- Utility functions return primitives or arrays
- Data accessors return typed arrays or `undefined` for single lookups (e.g., `getToolBySlug` returns `Tool | undefined`)
- Components return JSX directly

## Module Design

**Exports:**
- Default exports for React components
- Named exports for utilities, types, constants, and data arrays
- No barrel files (`index.ts` re-exports) except `src/types/index.ts`

**Barrel Files:**
- `src/types/index.ts` is the only barrel file, re-exporting all types and constants
- Other modules import directly from source files

## Data Access Patterns

**Current State (MVP):**
- All data is hardcoded in `src/lib/mock-data.ts`
- Functions like `getTools()`, `getToolBySlug()`, `getFeaturedTools()`, `getTrendingTools()`, `getNewestTools()` provide data access
- Filtering and sorting done client-side via spread + filter + sort chains (immutable pattern)
- `src/lib/db.ts` is a stub with commented-out Prisma client setup

**Database Schema:**
- Prisma schema defined in `prisma/schema.prisma` for PostgreSQL
- Models: `Tool`, `Category`, `Platform`, `ToolCategory`, `ToolPlatform`, `Review`, `Submission`
- Enums: `ToolType`, `ToolStatus`, `SubmissionStatus`
- Join tables: `ToolCategory`, `ToolPlatform` with composite IDs

---

*Convention analysis: 2026-04-07*
