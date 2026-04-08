# Phase 3: SEO & i18n Routing - Research

**Researched:** 2026-04-08
**Domain:** Next.js 16 App Router i18n routing, SEO metadata, structured data
**Confidence:** HIGH

## Summary

This phase migrates the AgentToolHub from client-side-only i18n (localStorage) to URL-based locale routing that is SEO-friendly. The core technical challenge is restructuring all page routes from `src/app/` into `src/app/[locale]/`, implementing locale detection and redirect logic via Next.js 16's `proxy.ts` (the renamed `middleware.ts`), and wiring dynamic metadata generation for each locale.

Next.js 16 has a critical breaking change: `middleware.ts` is deprecated and renamed to `proxy.ts` [VERIFIED: node_modules/next/dist/docs/]. The official i18n guide in Next.js 16 shows the exact pattern needed: `[locale]` dynamic segment, `generateStaticParams` for locales, dictionary-based translations loaded in server components, and locale detection via `Accept-Language` header in proxy [VERIFIED: node_modules/next/dist/docs/01-app/02-guides/internationalization.md].

The existing JSON-LD implementation on tool detail pages (`buildJsonLd` in `src/app/tools/[slug]/page.tsx`) is a solid foundation that needs enhancement per the TECHNICAL_DESIGN.md spec. Sitemap and robots.txt use built-in Next.js file conventions (`sitemap.ts`, `robots.ts`) which are well-documented and require no additional libraries.

**Primary recommendation:** Use the built-in Next.js 16 App Router i18n pattern (no external i18n library). The project already has translation dictionaries and a `t()` function -- extend the server-side `getDictionary` approach per the official guide. Avoid `next-intl` and other libraries to minimize dependencies and align with the official documentation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Only non-default locales get URL prefix -- `/tools/xxx` (English, default) vs `/zh/tools/xxx` (Chinese). Shorter URLs for primary audience, SEO-friendly.
- **D-02:** Use App Router `[locale]` dynamic segment -- all page routes move into `src/app/[locale]/` directory structure
- **D-03:** Language detection via `Accept-Language` header in middleware -- Chinese-speaking users auto-redirected to `/zh/` with 301
- **D-04:** API routes (`/api/tools`, `/api/sync`, etc.) stay outside `[locale]` -- no locale prefix for API endpoints
- **D-05:** Must research Next.js 16 breaking changes for `[locale]` routing before implementation (per AGENTS.md warning)
- **D-06:** Claude decides the best technical approach for i18n data layer -- key constraints: SEO-friendly (server-rendered translations), compatible with Next.js 16 App Router, preserve existing translation JSON data (`src/i18n/en.json`, `zh.json`)
- **D-07:** Dynamic `generateMetadata()` per page -- each tool/category page generates unique title, description, and OG tags based on database data
- **D-08:** Bilingual metadata -- title and description rendered in the page's locale language
- **D-09:** JSON-LD `SoftwareApplication` schema embedded on tool detail pages only -- includes name, install commands, platforms, requirements per TECHNICAL_DESIGN.md spec
- **D-10:** Dynamic sitemap via `sitemap.ts` -- auto-generated from database tools and categories, includes all locale URL variants
- **D-11:** robots.txt via `robots.ts` -- allow all crawlers, disallow `/api/` paths, point to sitemap URL
- **D-12:** 301 redirect old URLs in middleware -- `/tools/xxx` -> `/tools/xxx` (default en) or `/zh/tools/xxx` (based on Accept-Language). Preserves existing SEO equity and external links.

### Claude's Discretion
- Exact i18n library/approach (keep JSON+t() vs migrate to next-intl vs custom)
- How to restructure existing components to work with server-side locale
- JSON-LD schema field mapping from database model
- Sitemap change frequency and priority values
- Middleware implementation details for locale detection and redirects
- How to handle the root `/` route for locale routing

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.2 | Framework with App Router `[locale]` support | Already installed, built-in i18n routing pattern [VERIFIED: node_modules/next/dist/docs/] |
| `@formatjs/intl-localematcher` | 0.8.2 | Match Accept-Language header to supported locales | Recommended by official Next.js i18n guide [VERIFIED: node_modules/next/dist/docs/01-app/02-guides/internationalization.md, npm registry] |
| `negotiator` | 1.0.0 | Parse Accept-Language header into language array | Paired with @formatjs/intl-localematcher in official guide [VERIFIED: node_modules/next/dist/docs/01-app/02-guides/internationalization.md, npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `schema-dts` | 2.0.0 | TypeScript types for JSON-LD schema.org | Optional -- adds type safety to `SoftwareApplication` schema [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in dictionary approach | `next-intl` | next-intl adds middleware integration, ICU message format, namespace support. Overkill for 2 locales with existing flat JSON dictionaries. Built-in approach matches official guide exactly. |
| Built-in dictionary approach | `next-international` | Lighter than next-intl but still unnecessary for 2 locales. Extra dependency with no clear benefit over the server dictionary pattern. |
| `schema-dts` types | Plain JSON objects | schema-dts adds compile-time type checking for JSON-LD but is not strictly necessary. The existing `buildJsonLd` function works without it. Use for type safety if desired. |

**Installation:**
```bash
npm install @formatjs/intl-localematcher negotiator
# Optional:
npm install schema-dts
```

**Version verification:**
- `next` 16.2.2 -- already installed [VERIFIED: package.json]
- `@formatjs/intl-localematcher` 0.8.2 [VERIFIED: npm registry, 2026-04-08]
- `negotiator` 1.0.0 [VERIFIED: npm registry, 2026-04-08]
- `schema-dts` 2.0.0 [VERIFIED: npm registry, 2026-04-08]

## Architecture Patterns

### Recommended Project Structure (After Phase 3)
```
src/
├── app/
│   ├── [locale]/                 # All page routes move here
│   │   ├── layout.tsx            # Root layout with locale-aware metadata + lang attribute
│   │   ├── page.tsx              # Home page
│   │   ├── tools/
│   │   │   ├── page.tsx          # Tools list
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Tool detail (JSON-LD here)
│   │   ├── categories/
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Category detail
│   │   ├── rankings/
│   │   │   └── page.tsx
│   │   ├── submit/
│   │   │   └── page.tsx
│   │   └── about/
│   │       └── page.tsx
│   ├── api/                      # API routes stay OUTSIDE [locale]
│   │   ├── tools/
│   │   ├── categories/
│   │   └── sync/
│   ├── sitemap.ts                # Dynamic sitemap generation
│   ├── robots.ts                 # robots.txt generation
│   └── globals.css               # Stays at app root
├── i18n/
│   ├── config.ts                 # Locale list (unchanged)
│   ├── dictionaries.ts           # NEW: server-side dictionary loader
│   ├── en.json                   # English translations (unchanged)
│   └── zh.json                   # Chinese translations (unchanged)
├── lib/
│   ├── i18n.ts                   # Existing t() and getDictionary (keep for server use)
│   ├── i18n-context.tsx          # Client-side provider (simplified to consume locale from URL)
│   └── db.ts
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # Locale switcher changes URL instead of localStorage
│   │   └── ...
│   └── ...
├── proxy.ts                      # NEW: replaces middleware.ts (Next.js 16 naming)
└── next.config.ts                # May need redirect rules for old URLs
```

### Pattern 1: Server-Side Dictionary Loading (Recommended)
**What:** Load translations in server components based on `[locale]` param
**When to use:** All server components that need translated text
**Example:**
```typescript
// src/i18n/dictionaries.ts
import 'server-only'
import type { Locale } from '@/i18n/config'
import { defaultLocale } from '@/i18n/config'

const dictionaries = {
  en: () => import('@/i18n/en.json').then((module) => module.default),
  zh: () => import('@/i18n/zh.json').then((module) => module.default),
} as const

export type AppLocale = keyof typeof dictionaries

export const isValidLocale = (locale: string): locale is AppLocale =>
  locale in dictionaries

export const getDictionary = async (locale: AppLocale) => dictionaries[locale]()

// Usage in server component:
// const dict = await getDictionary(locale)
// dict.nav.home -> "Home" or "首页"
```
[Source: node_modules/next/dist/docs/01-app/02-guides/internationalization.md]

### Pattern 2: Proxy-Based Locale Detection and Redirect
**What:** Next.js 16 `proxy.ts` detects locale from Accept-Language and redirects
**When to use:** First visit without locale prefix in URL
**Example:**
```typescript
// src/proxy.ts (NOT middleware.ts -- renamed in Next.js 16)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['en', 'zh']
const defaultLocale = 'en'

function getLocale(request: NextRequest): string {
  // Use Accept-Language header to detect preferred locale
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0].split('-')[0].toLowerCase()
    if (locales.includes(preferred)) return preferred
  }
  return defaultLocale
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes, static files, etc.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return
  }

  // Check if pathname already has a locale prefix
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) return

  // For the default locale (en), do NOT add prefix -- rewrite internally
  const locale = getLocale(request)

  if (locale === defaultLocale) {
    // Rewrite to /en/path so the [locale] segment matches
    request.nextUrl.pathname = `/${defaultLocale}${pathname}`
    return NextResponse.rewrite(request.nextUrl)
  }

  // For non-default locales, redirect to /zh/path
  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
}
```
[Source: node_modules/next/dist/docs/01-app/02-guides/internationalization.md + node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md]

### Pattern 3: Locale-Aware generateMetadata
**What:** Dynamic metadata per page based on locale
**When to use:** Every page under `[locale]/`
**Example:**
```typescript
// src/app/[locale]/tools/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { locale, slug } = await params
  const tool = await fetchTool(slug)

  return {
    title: locale === 'zh' && tool.descriptionZh
      ? `${tool.name} — AgentToolHub`
      : `${tool.name} — AgentToolHub`,
    description: locale === 'zh' && tool.descriptionZh
      ? tool.descriptionZh
      : tool.description,
    openGraph: {
      title: tool.name,
      description: locale === 'zh' && tool.descriptionZh
        ? tool.descriptionZh
        : tool.description,
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      alternateLocale: locale === 'zh' ? 'en' : 'zh',
    },
  }
}
```
[Source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md]

### Pattern 4: JSON-LD SoftwareApplication Schema
**What:** Structured data for tool detail pages per TECHNICAL_DESIGN.md 2.3
**When to use:** Tool detail pages only
**Example:**
```typescript
function buildJsonLd(tool: Tool, locale: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: locale === 'zh' && tool.descriptionZh
      ? tool.descriptionZh
      : tool.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: `https://agenttoolhub.com/${locale === 'en' ? '' : 'zh/'}tools/${tool.slug}`,
    installInstructions: buildInstallInstructions(tool),
    requirements: extractRequirements(tool),
    homepage: tool.repoUrl,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: tool.avgRating.toFixed(1),
      reviewCount: tool.ratingCount,
      bestRating: '5',
      worstRating: '1',
    },
    programmingLanguage: tool.language ?? undefined,
    license: tool.license ?? undefined,
    author: tool.author
      ? { '@type': 'Organization', name: tool.author }
      : undefined,
    codeRepository: tool.repoUrl,
  }
}

// Render with XSS protection:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
  }}
/>
```
[Source: node_modules/next/dist/docs/01-app/02-guides/json-ld.md + docs/TECHNICAL_DESIGN.md 2.3]

### Pattern 5: Localized Sitemap with alternates
**What:** Sitemap entries with `alternates.languages` for SEO hreflang
**When to use:** `src/app/sitemap.ts`
**Example:**
```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tools = await fetchAllToolSlugs()
  const categories = await fetchAllCategorySlugs()
  const BASE = 'https://agenttoolhub.com'

  const toolUrls = tools.flatMap((tool) => [
    {
      url: `${BASE}/tools/${tool.slug}`,
      lastModified: tool.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: { zh: `${BASE}/zh/tools/${tool.slug}` },
      },
    },
  ])

  // ... categories, static pages, etc.
  return [...toolUrls, ...categoryUrls, ...staticUrls]
}
```
[Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md]

### Anti-Patterns to Avoid
- **Using `middleware.ts` instead of `proxy.ts`:** Deprecated in Next.js 16. Must use `proxy.ts`. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md]
- **Putting API routes inside `[locale]/`:** API routes must stay at `src/app/api/` -- they have no locale context. [LOCKED: D-04]
- **Mutating `params` synchronously:** In Next.js 16, `params` is a `Promise` -- must `await` it. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md]
- **Loading translation JSON on the client side:** Defeats SEO purpose. All translations for server components stay on the server. Only pass translated strings to client components via props. [VERIFIED: node_modules/next/dist/docs/01-app/02-guides/internationalization.md]
- **Using `next.config.ts` i18n config:** The `i18n` config key from Pages Router does not apply to App Router. App Router i18n is purely file-based. [VERIFIED: No i18n config option exists in Next.js 16 App Router config reference]
- **Unprotected JSON.stringify in JSON-LD:** Must sanitize `<` characters to prevent XSS injection. [VERIFIED: node_modules/next/dist/docs/01-app/02-guides/json-ld.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accept-Language parsing | Custom header parser | `negotiator` + `@formatjs/intl-localematcher` | Spec-compliant, handles quality values, edge cases |
| Sitemap XML generation | Custom XML builder | Next.js `sitemap.ts` convention | Built-in XML formatting, auto-served, supports alternates |
| robots.txt generation | Manual text file | Next.js `robots.ts` convention | Type-safe, auto-served |
| HTML lang attribute | Manual attribute setting | `params.locale` in root layout | Next.js passes locale param to all nested layouts/pages |

**Key insight:** The Next.js 16 App Router has first-class support for i18n routing, sitemap, robots, and metadata. There is no need for any external i18n library for 2 locales with flat JSON dictionaries.

## Common Pitfalls

### Pitfall 1: Default Locale Prefix Handling
**What goes wrong:** With D-01 (no prefix for default locale), URLs like `/tools/xxx` must be internally rewritten to `/en/tools/xxx` so the `[locale]` segment matches, but the user sees `/tools/xxx` in their browser.
**Why it happens:** The `[locale]` dynamic segment requires a value. Without a rewrite, `/tools/xxx` would not match `src/app/[locale]/tools/page.tsx`.
**How to avoid:** In `proxy.ts`, use `NextResponse.rewrite()` (not redirect) for the default locale, so the URL bar stays clean but the route segment resolves. For non-default locales, use `NextResponse.redirect()` to add the `/zh/` prefix.
**Warning signs:** 404 errors on pages that previously worked, or the locale param is undefined.

### Pitfall 2: Client Components Losing Locale Context
**What goes wrong:** After moving to `[locale]` routing, client components that used `useI18n()` context can no longer get locale from localStorage.
**Why it happens:** The `I18nProvider` reads from localStorage, but the server-rendered page needs locale from the URL.
**How to avoid:** Pass `locale` from the server component to the client component via props. The client `I18nProvider` should accept an `initialLocale` prop from the server. Alternatively, client components can read locale from `useParams()` (via `next/navigation`) since `[locale]` is a URL segment.
**Warning signs:** Client components render in the wrong language, or hydration mismatches.

### Pitfall 3: Static Params Not Including Locale
**What goes wrong:** `generateStaticParams()` in nested routes does not account for locale, causing build errors or missing pages.
**Why it happens:** Each route segment with a dynamic parameter must return its params. When `[locale]` is a parent segment, child routes like `[slug]` need to generate combinations of `{locale, slug}`.
**How to avoid:** Define `generateStaticParams` in the root `[locale]/layout.tsx` to return `[{locale: 'en'}, {locale: 'zh'}]`. Child routes like `[slug]` will automatically receive the parent locale context and only need to generate slug params.
**Warning signs:** Build produces only English pages, or `generateStaticParams` errors about missing locale.

### Pitfall 4: Sitemap Missing hreflang Annotations
**What goes wrong:** Search engines cannot associate English and Chinese versions of the same page, leading to duplicate content issues or wrong locale shown to users.
**Why it happens:** Sitemap entries generated without `alternates.languages` property.
**How to avoid:** Every sitemap URL entry must include `alternates: { languages: { zh: '...' } }` for English URLs and vice versa. Also add `<link rel="alternate" hreflang="..." />` tags in metadata via `alternates.canonical` and language alternates.
**Warning signs:** Google Search Console reports duplicate content without hreflang.

### Pitfall 5: Proxy Matcher Excluding Sitemap/robots
**What goes wrong:** The proxy intercepts requests to `/sitemap.xml` and `/robots.txt`, treating them as locale-less paths and rewriting them.
**Why it happens:** Matcher pattern is too broad.
**How to avoid:** The proxy matcher must explicitly exclude `sitemap.xml` and `robots.txt`. Use the negative lookahead pattern from the official docs: `'/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'`.
**Warning signs:** Sitemap returns 404 or redirect loop.

### Pitfall 6: Old URLs Breaking After Migration
**What goes wrong:** External links to `/tools/xxx` stop working after routes move to `[locale]/tools/xxx`.
**Why it happens:** The route structure changes but no redirects are configured.
**How to avoid:** The proxy handles this: `/tools/xxx` gets rewritten to `/en/tools/xxx` (default locale) or redirected to `/zh/tools/xxx`. This preserves all existing URL equity.
**Warning signs:** 404 on previously working URLs.

## Code Examples

### Complete `src/i18n/dictionaries.ts` (Server-Side)
```typescript
// Source: Adapted from node_modules/next/dist/docs/01-app/02-guides/internationalization.md
import 'server-only'
import type { Locale } from '@/i18n/config'
import { defaultLocale, locales } from '@/i18n/config'

const dictionaries = {
  en: () => import('@/i18n/en.json').then((module) => module.default),
  zh: () => import('@/i18n/zh.json').then((module) => module.default),
} as const

export type AppLocale = keyof typeof dictionaries

export const isValidLocale = (locale: string): locale is AppLocale =>
  locale in dictionaries

export const getDictionary = async (locale: AppLocale) => dictionaries[locale]()
```

### `[locale]/layout.tsx` Root Layout
```tsx
// Source: node_modules/next/dist/docs/01-app/02-guides/internationalization.md
import { notFound } from 'next/navigation'
import { isValidLocale, type AppLocale } from '@/i18n/dictionaries'
import { locales } from '@/i18n/config'

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!isValidLocale(locale)) notFound()

  return (
    <html lang={locale} className="h-full antialiased dark">
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLocale={locale}>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
```

### `src/app/robots.ts`
```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://agenttoolhub.com/sitemap.xml',
  }
}
```

### Locale Switcher (Client Component Update)
```tsx
// Header locale toggle changes URL instead of localStorage
'use client'
import { usePathname, useRouter } from 'next/navigation'

function LocaleSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const switchLocale = () => {
    if (locale === 'en') {
      // Add /zh prefix
      router.push(`/zh${pathname}`)
    } else {
      // Remove /zh prefix (default locale has no prefix)
      router.push(pathname.replace(/^\/zh/, '') || '/')
    }
  }

  return <button onClick={switchLocale}>{locale === 'en' ? '中文' : 'EN'}</button>
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16.0.0 | File and function renamed. `middleware` is deprecated. [VERIFIED: node_modules/next/dist/docs/] |
| Pages Router `i18n` config | App Router `[locale]` dynamic segment | Next.js 13+ | No `i18n` key in `next.config.ts`. i18n is purely file-based. [VERIFIED: no i18n config in Next.js 16 config reference] |
| `params` as sync object | `params` as `Promise` | Next.js 15+ | Must `await params` before use. [VERIFIED: node_modules/next/dist/docs/] |
| Static `metadata` export | `generateMetadata()` function | Next.js 13+ | Dynamic metadata per route for SEO. Already used partially in project. |

**Deprecated/outdated:**
- `middleware.ts` -- renamed to `proxy.ts` in Next.js 16 [VERIFIED]
- Pages Router `i18n` config -- does not work with App Router [VERIFIED]
- `getStaticPaths` -- replaced by `generateStaticParams` [VERIFIED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The production domain will be `agenttoolhub.com` | Sitemap, robots | Sitemap URLs would be wrong; must use env var for base URL |
| A2 | Default locale rewrite pattern (`NextResponse.rewrite` for `/en/tools/xxx` shown as `/tools/xxx`) works correctly with Next.js 16 App Router `[locale]` segment | Architecture Patterns | If rewrite does not populate `[locale]` param correctly, all pages 404. Needs verification during implementation. |
| A3 | `generateStaticParams` in `[locale]/layout.tsx` is sufficient for locale generation; child `[slug]` routes do not need to also generate locale params | Common Pitfalls | May need to also return locale in child route `generateStaticParams` depending on Next.js 16 behavior. |
| A4 | `src/i18n/en.json` and `zh.json` are already complete and matching in structure | i18n Data Layer | If translations are incomplete, pages may show raw keys. Existing test (`__tests__/lib/i18n.test.ts`) verifies completeness. |

## Open Questions

1. **Production domain name**
   - What we know: Sitemap and canonical URLs need an absolute domain
   - What's unclear: The actual production domain (TECHNICAL_DESIGN.md mentions "TBD")
   - Recommendation: Use an environment variable `NEXT_PUBLIC_APP_URL` (already partially used in `src/app/tools/[slug]/page.tsx`) as the base URL. Default to `https://agenttoolhub.com`.

2. **Default locale rewrite vs. route group**
   - What we know: D-01 says English has no URL prefix. The `[locale]` segment requires a value.
   - What's unclear: Whether using `NextResponse.rewrite()` for default locale or using Next.js route groups `(locale)` pattern would be cleaner.
   - Recommendation: Use `NextResponse.rewrite()` in proxy for default locale. This is the standard approach documented in the official i18n guide and works with `[locale]` segment.

3. **Cookie-based locale persistence**
   - What we know: D-03 says "first visit only, not override explicit URL choices"
   - What's unclear: How to detect "first visit" vs. "explicit URL choice"
   - Recommendation: Use a cookie (`NEXT_LOCALE`). If cookie is set, respect it. If not, check Accept-Language and set cookie. If user navigates to a locale-prefixed URL, update the cookie. This is a common pattern.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build & dev | Yes | 24.14.1 | -- |
| npm | Package management | Yes | 11.11.0 | -- |
| Next.js | Framework | Yes | 16.2.2 | -- |
| PostgreSQL (Supabase) | Sitemap data, tool metadata | Yes (remote) | -- | -- |
| `@formatjs/intl-localematcher` | Locale detection | No (needs install) | -- | -- |
| `negotiator` | Accept-Language parsing | No (needs install) | -- | -- |

**Missing dependencies with no fallback:**
- `@formatjs/intl-localematcher` and `negotiator` -- must install before implementation begins.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 with ts-jest |
| Config file | `jest.config.ts` |
| Quick run command | `npm test -- --testPathPattern="i18n\|sitemap\|robots\|proxy" --no-coverage` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| Locale detection from Accept-Language | Unit | `npm test -- --testPathPattern="proxy" -t "detects locale"` | Test proxy logic in isolation |
| Dictionary loading for each locale | Unit | `npm test -- __tests__/lib/i18n.test.ts` | Already exists |
| Invalid locale returns 404 | Integration | Manual -- test dev server with `/fr/tools/xxx` | |
| Sitemap includes both locale variants | Integration | `curl /sitemap.xml` after build | |
| robots.txt disallows /api/ | Integration | `curl /robots.txt` after build | |
| JSON-LD valid on tool detail pages | Integration | Schema.org validator | |
| generateMetadata returns correct locale | Unit | `npm test -- --testPathPattern="metadata"` | |
| Locale switcher changes URL | E2E (Playwright) | Future consideration | |
| Old URLs redirect correctly | Integration | `curl -v /tools/xxx` check rewrite/redirect | |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern="<related>"`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + manual sitemap/robots verification

### Wave 0 Gaps
- [ ] `__tests__/lib/dictionaries.test.ts` -- server dictionary loader tests
- [ ] `__tests__/proxy.test.ts` -- locale detection and redirect logic
- [ ] No Playwright setup exists for E2E locale tests -- defer to future phase

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | Yes | Validate `locale` param against allowed list (`en`, `zh`) before use |
| V6 Cryptography | No | No sensitive data in i18n/SEO layer |

### Known Threat Patterns for Next.js i18n

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JSON-LD XSS injection | Tampering | Sanitize `<` to `\u003c` in JSON.stringify output |
| Path traversal via locale param | Tampering | Validate locale against allowlist; use `notFound()` for invalid |
| Open redirect via locale | Spoofing | Only accept exact values from `[locale]` segment, never from query params |

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/02-guides/internationalization.md` -- Next.js 16 official i18n guide
- `node_modules/next/dist/docs/01-app/02-guides/json-ld.md` -- JSON-LD implementation guide
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` -- proxy.ts API reference (middleware renamed)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md` -- sitemap.ts reference
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md` -- robots.ts reference
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` -- generateMetadata API
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md` -- generateStaticParams API

### Secondary (MEDIUM confidence)
- `docs/TECHNICAL_DESIGN.md` sections 2.3, 3, 6.1-6.3 -- JSON-LD schema spec, planned structure, SEO strategy
- Existing codebase files: `src/i18n/config.ts`, `src/lib/i18n.ts`, `src/lib/i18n-context.tsx`, `src/app/layout.tsx`, `src/app/tools/[slug]/page.tsx`

### Tertiary (LOW confidence)
- npm registry version checks for `@formatjs/intl-localematcher` (0.8.2), `negotiator` (1.0.0), `schema-dts` (2.0.0) -- verified current as of 2026-04-08

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all patterns verified against Next.js 16 bundled documentation
- Architecture: HIGH -- official Next.js 16 i18n guide provides the exact pattern needed
- Pitfalls: HIGH -- proxy rename, params-as-promise, and default locale rewrite are documented breaking changes
- i18n data layer: HIGH -- existing dictionaries and `t()` function already work; just need server-side loading wrapper

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable -- Next.js 16 patterns unlikely to change)
