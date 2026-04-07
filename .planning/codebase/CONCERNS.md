# Codebase Concerns

**Analysis Date:** 2026-04-07

## Tech Debt

### Entire Application Runs on Hardcoded Mock Data

- Issue: Every page imports directly from `src/lib/mock-data.ts`. The database layer (`src/lib/db.ts`) is entirely commented out. Prisma schema exists but no client has been generated. The application has no data persistence and no API routes.
- Files: `src/lib/mock-data.ts`, `src/lib/db.ts`, `prisma/schema.prisma`
- Impact: Zero dynamic content. No way to add tools, reviews, or submissions beyond editing source code. Submit form (`src/app/submit/page.tsx`) fakes submission and resets state. All analytics and reviews are static fabrication.
- Fix approach: Implement API routes in `src/app/api/`, uncomment `src/lib/db.ts`, run `npx prisma generate` and `npx prisma db push`, then replace mock-data imports with fetch calls or server actions. This is a major migration touching every page.

### Duplicate i18n Lookup Logic

- Issue: Translation key lookup function `t()` is implemented twice -- once in `src/lib/i18n.ts` (standalone) and once inside `src/lib/i18n-context.tsx` (React context). They have identical logic.
- Files: `src/lib/i18n.ts`, `src/lib/i18n-context.tsx`
- Impact: Maintenance burden. Any bug fix or feature (e.g., interpolation, pluralization) must be applied in two places.
- Fix approach: Have `i18n-context.tsx` re-export or delegate to the standalone `t()` function from `i18n.ts`, passing the active dictionary. Remove the duplicated implementation.

### Inline i18n Strings Bypass the Dictionary System

- Issue: Many components use `locale === 'zh' ? 'Chinese' : 'English'` ternaries inline instead of using the `t()` function with dictionary keys. These strings are invisible to the i18n completeness test in `__tests__/lib/i18n.test.ts`.
- Files: `src/components/ui/FilterBar.tsx` (lines 29, 66, 79, 82, 96), `src/components/home/CategoryGrid.tsx` (line 52), `src/app/tools/ToolsClient.tsx` (lines 38-64), `src/app/tools/[slug]/ToolDetailClient.tsx` (lines 138, 190), `src/app/submit/page.tsx` (multiple inline ternaries)
- Impact: Translation drift. Adding a third locale would require finding and updating dozens of scattered ternaries. Current i18n test gives false confidence by only checking dictionary completeness, not runtime string coverage.
- Fix approach: Move all inline strings to `src/i18n/en.json` and `src/i18n/zh.json`, then use `t('key')` everywhere.

### Duplicate getToolTypeColor Function

- Issue: `getToolTypeColor` exists both in `src/lib/utils.ts` (using CSS variables) and in `src/app/rankings/page.tsx` (lines 179-190) with hardcoded hex values.
- Files: `src/lib/utils.ts`, `src/app/rankings/page.tsx`
- Impact: Color mismatch risk. The rankings page uses `#3b82f6` while the rest of the app uses `var(--color-mcp)`. They happen to match now but will diverge if theme tokens change.
- Fix approach: Import `getToolTypeColor` from `src/lib/utils.ts` in the rankings page. Update the rankings page to use CSS variables instead of raw hex, or use `TOOL_TYPE_CONFIG` from `src/types/index.ts`.

### Redundant Category Serialization

- Issue: `src/app/categories/[slug]/page.tsx` manually serializes every field of Category and Tool objects into plain objects before passing to the client component. This is fragile and must be updated whenever the types change.
- Files: `src/app/categories/[slug]/page.tsx` (lines 42-86)
- Impact: If a new field is added to the `Tool` type, this serialization code will silently omit it, causing subtle bugs in the category detail page.
- Fix approach: Use `JSON.parse(JSON.stringify(data))` for serialization, or restructure to avoid the client/server boundary issue (e.g., fetch data client-side, or use a shared serialization utility).

### ReviewSection Uses Hardcoded Rating Distribution

- Issue: The rating distribution bar chart in `src/components/tools/ReviewSection.tsx` uses hardcoded percentages (70%, 20%, 7%, 2%, 1%) that have no relation to actual tool data. The reviews array is always empty.
- Files: `src/components/tools/ReviewSection.tsx` (lines 32-43)
- Impact: Users see a fake distribution that does not match the tool's actual rating. Misleading UI.
- Fix approach: Calculate distribution from actual review data when the database layer is implemented. For MVP, either remove the distribution bar or derive it from `avgRating` as a rough estimate.

## Security Considerations

### Submit Form Has No Backend Processing

- Risk: The submit form in `src/app/submit/page.tsx` validates client-side only and then sets `submitted = true` in React state. No data is sent anywhere. When a backend is added, the form currently lacks CSRF protection, rate limiting, and server-side validation.
- Files: `src/app/submit/page.tsx`
- Current mitigation: No backend exists, so no actual vulnerability yet.
- Recommendations: When implementing the backend, add CSRF tokens, rate limiting on the submission endpoint, server-side validation with a library like Zod, and sanitize all user input before database storage.

### Deprecated execCommand Fallback in CopyButton

- Risk: `document.execCommand('copy')` is deprecated and can be removed from browsers. It is also a potential vector for certain attacks in older browsers.
- Files: `src/components/shared/CopyButton.tsx` (line 27)
- Current mitigation: Used only as a fallback after `navigator.clipboard.writeText` fails.
- Recommendations: Remove the `execCommand` fallback. Modern browsers all support the Clipboard API. If fallback is needed, use a more secure approach or show an error message.

### dangerouslySetInnerHTML for JSON-LD

- Risk: Two places inject JSON-LD structured data using `dangerouslySetInnerHTML`. If any tool field (name, description, author) contains malicious content like `</script><script>alert(1)</script>`, it could break out of the JSON-LD block.
- Files: `src/app/tools/[slug]/page.tsx` (line 67), `src/components/tools/AgentInstallSection.tsx` (line 93)
- Current mitigation: The data is currently hardcoded in mock-data.ts, so no injection is possible. But when user-generated data flows in (tool submissions), this becomes exploitable.
- Recommendations: Sanitize tool fields before embedding in JSON-LD, or use Next.js built-in `script` tag with `JSON.stringify` after sanitizing against `</script>` sequences.

### No Content Security Policy

- Risk: No CSP headers are configured. `next.config.ts` is empty.
- Files: `next.config.ts`
- Current mitigation: None.
- Recommendations: Add CSP headers via `next.config.ts` or middleware. At minimum, set `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` headers.

### Theme Preference Not Persisted

- Risk: The dark/light theme toggle in `src/components/layout/Header.tsx` manipulates `document.documentElement.classList` directly but does not persist the choice. On page reload, the theme resets to dark (hardcoded class in `layout.tsx`).
- Files: `src/components/layout/Header.tsx` (lines 31-39), `src/app/layout.tsx` (line 53)
- Current mitigation: None.
- Recommendations: Persist theme choice to `localStorage` (similar to how locale is persisted). Consider using a `data-theme` attribute and avoid the flash of wrong theme (FOIT) with a blocking script in `<head>`.

## Performance Bottlenecks

### Full Mock Data Imported Into Every Client Component Bundle

- Problem: `src/lib/mock-data.ts` is 378 lines of large inline JSON objects with deeply nested install guides. Every component that imports from it (9 files) pulls the entire dataset into its client bundle.
- Files: `src/lib/mock-data.ts` and all 9 importing files
- Cause: No code splitting or data fetching layer. Mock data is a module-level constant.
- Improvement path: Move data fetching to server components or API routes. Only send the data each page needs. This will become natural when migrating away from mock data to the database.

### No Image Optimization

- Problem: `public/images/` directory is empty. The site uses SVG icons from lucide-react but has no image assets currently. When real tool screenshots or logos are added, they will need optimization.
- Files: `public/images/` (empty)
- Improvement path: Use Next.js `<Image>` component with proper `width`, `height`, and `loading` attributes when adding screenshots.

### About Page is a Server Component Without i18n

- Problem: `src/app/about/page.tsx` is a server component (no `"use client"` directive) but contains hardcoded English strings. It cannot use `useI18n()` since that requires client context. All other pages use the i18n system.
- Files: `src/app/about/page.tsx`
- Cause: The i18n system is client-side only (React context + localStorage). Server components have no access to the user's locale preference.
- Improvement path: Either convert the about page to a client component and use the i18n system, or implement server-side locale detection (e.g., from cookie or URL prefix) and pass translations as props.

## Fragile Areas

### Category Emoji Mapping is a Fragile Switch

- Files: `src/app/categories/[slug]/CategoryDetailClient.tsx` (lines 49-60)
- Why fragile: Category icons are mapped to emojis via 12 consecutive conditional renders (`{category.icon === 'Database' && '\u{1F5C4}\u{FE0F}'}`). If a new category is added without updating this mapping, it silently renders no icon.
- Safe modification: Replace with a `Record<string, string>` lookup map similar to `ICON_MAP` in `CategoryGrid.tsx`, and log a warning for missing mappings.
- Test coverage: No test exists for this component.

### Tool Type to i18n Key Mapping Uses toLowerCase()

- Files: `src/components/tools/ToolCard.tsx` (line 20), `src/app/tools/[slug]/ToolDetailClient.tsx` (line 27)
- Why fragile: `t(\`tool.type.${tool.type.toLowerCase()}\`)` converts `MCP_SERVER` to `mcp_server`, which happens to match the dictionary key. But this implicit contract between the TypeScript enum value and the JSON dictionary key structure is undocumented and easy to break.
- Safe modification: Create an explicit mapping constant, e.g., `const TOOL_TYPE_I18N_KEY: Record<ToolType, string> = { MCP_SERVER: 'tool.type.mcp_server', SKILL: 'tool.type.skill', RULE: 'tool.type.rule' }`.
- Test coverage: Not directly tested.

### Dates are Raw Strings Without Validation

- Files: `src/lib/mock-data.ts`, `src/types/index.ts`
- Why fragile: All date fields (`lastCommitAt`, `createdAt`, `updatedAt`) are typed as `string` with no format enforcement. The `formatDate` utility in `src/lib/utils.ts` silently returns `Invalid Date` if the string is malformed. The `new Date()` constructor is called in sorting functions without error handling.
- Safe modification: Define a date validation utility or use a date library. At minimum, add type branding for ISO date strings.
- Test coverage: `formatDate` is tested with valid input only; no negative cases.

## Scaling Limits

### Static Site Generation With Only 12 Tools

- Current capacity: 12 hardcoded tools, 12 categories, 7 platforms
- Limit: `generateStaticParams` in `src/app/tools/[slug]/page.tsx` and `src/app/categories/[slug]/page.tsx` pre-render all tool and category pages at build time. This works for 12 tools but will slow builds significantly at hundreds or thousands of tools.
- Scaling path: Switch to incremental static regeneration (ISR) with `revalidate` or dynamic rendering with `dynamicParams = true` when moving to database-backed data.

### No Pagination in Tools List

- Current capacity: All 12 tools render in a single grid
- Limit: With hundreds of tools, the tools page (`src/app/tools/ToolsClient.tsx`) will become unusable. No pagination or infinite scroll exists.
- Scaling path: Implement pagination using the `PaginatedResponse<T>` type already defined in `src/types/index.ts`. The `ToolFilters` type already has `page` and `limit` fields that are unused.

### Client-Side Filtering Does Not Scale

- Current capacity: All filtering and sorting happens client-side via `getTools()` in `src/lib/mock-data.ts`
- Limit: Once tools move to a database, client-side filtering will require downloading all tool data first.
- Scaling path: Move filtering logic to server-side API routes or database queries. The filter function signature in `getTools()` can be preserved as a server-side interface.

## Missing Critical Features

### No Search Indexing

- Problem: No search engine exists. The "search" in the tools page is a simple `String.includes()` over the 12-item mock array.
- Files: `src/lib/mock-data.ts` (lines 318-325)
- Blocks: Real search with relevance ranking, typo tolerance, or autocomplete.

### No User Authentication

- Problem: No auth system exists. Reviews cannot be attributed to users. Submissions have no identity verification.
- Blocks: User accounts, verified reviews, admin moderation, spam prevention.

### No Admin Interface

- Problem: No way to manage tools, categories, platforms, or review submissions without directly editing the database.
- Blocks: Content moderation, tool approval workflow, data management.

### Empty Directories With No Implementation

- Problem: `scripts/` directory is empty. `public/images/` directory is empty. No seed script, no deployment scripts, no image assets.
- Files: `scripts/`, `public/images/`
- Blocks: Database seeding, automated screenshots, deployment automation.

## Test Coverage Gaps

### Zero Component Tests

- What's not tested: None of the 20+ React components have any tests. No rendering tests, no interaction tests, no accessibility tests.
- Files: All files under `src/components/`, all page files under `src/app/`
- Risk: UI regressions go undetected. Refactoring components may break visual or interactive behavior.
- Priority: High -- components contain significant logic (filtering, localization switching, form validation, theme toggling)

### Zero E2E Tests

- What's not tested: No end-to-end tests exist. Critical user flows (browsing tools, searching, switching language, toggling theme, submitting a tool) are completely untested.
- Files: No Playwright or Cypress configuration files exist
- Risk: Page-level navigation and cross-component interactions break silently.
- Priority: Medium -- the app is small enough to cover the main flows quickly

### About Page Not i18n-Tested

- What's not tested: The about page has hardcoded English strings that are not in the i18n dictionaries. The i18n completeness test in `__tests__/lib/i18n.test.ts` only verifies dictionary key parity between `en.json` and `zh.json`, not whether all rendered strings come from dictionaries.
- Files: `src/app/about/page.tsx`
- Risk: The about page will remain partially or fully in English when a Chinese user visits.
- Priority: Medium

### Submit Form Validation Not Tested

- What's not tested: The submit form has client-side validation logic (URL pattern, email pattern) that has no test coverage.
- Files: `src/app/submit/page.tsx` (lines 34-48)
- Risk: Validation regressions or edge cases (e.g., unusual GitHub URL formats) go undetected.
- Priority: Medium

### No Test for CopyButton Fallback Behavior

- What's not tested: The `execCommand` fallback path in `CopyButton` is untested.
- Files: `src/components/shared/CopyButton.tsx`
- Risk: The deprecated fallback may break without detection.
- Priority: Low

---

*Concerns audit: 2026-04-07*
