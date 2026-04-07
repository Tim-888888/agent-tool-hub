# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code (`.ts`, `.tsx`), configuration files, tests

**Secondary:**
- CSS (Tailwind v4 syntax) - Styling in `src/app/globals.css` using `@theme inline` and `@import "tailwindcss"`
- JSON - i18n translation files (`src/i18n/en.json`, `src/i18n/zh.json`)
- Prisma Schema - Database models in `prisma/schema.prisma`

## Runtime

**Environment:**
- Node.js (version not pinned; `.nvmrc` or `.node-version` not present)
- React 19.2.4 (React 19 with new features like `use()`)

**Package Manager:**
- npm (lockfile: `package-lock.json` present, lockfileVersion 3)
- No `pnpm` or `yarn` lockfiles detected

## Frameworks

**Core:**
- Next.js 16.2.2 - Full-stack React framework using App Router
  - **CRITICAL:** Per `AGENTS.md`, this is a breaking-change version of Next.js — consult `node_modules/next/dist/docs/` before writing code
- React 19.2.4 - UI library
- Tailwind CSS 4.2.2 - Utility-first CSS via `@tailwindcss/postcss` plugin

**UI Libraries:**
- Framer Motion 12.38.0 - Page transitions and micro-interactions
- Lucide React 1.7.0 - Icon library (used throughout components)

**Testing:**
- Jest 30.3.0 - Test runner
- ts-jest 29.4.9 - TypeScript compilation for Jest
- jest-environment-jsdom 30.3.0 - DOM simulation
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM assertion matchers

**Build/Dev:**
- ESLint 9.39.4 - Linting with `eslint-config-next` (core-web-vitals + typescript configs)
- TypeScript 5.9.3 - Type checking (strict mode enabled in `tsconfig.json`)

## Key Dependencies

**Database/ORM:**
- Prisma 7.6.0 - ORM and migration tool
- @prisma/client 7.6.0 - Generated database client
  - **NOTE:** Prisma client is imported but commented out in `src/lib/db.ts` — not yet active
  - Current data comes from hardcoded mock data in `src/lib/mock-data.ts`

**Fonts:**
- Geist / Geist Mono - loaded via `next/font/google` in `src/app/layout.tsx`

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2017
- Module: esnext with bundler resolution
- JSX: react-jsx
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- Plugins: Next.js plugin

**Tailwind (`postcss.config.mjs`):**
- Uses `@tailwindcss/postcss` plugin (Tailwind v4 approach — no `tailwind.config.ts` file)
- Theme tokens defined inline in `src/app/globals.css` via `@theme inline { ... }`

**ESLint (`eslint.config.mjs`):**
- Flat config format (ESLint 9 style)
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

**Jest (`jest.config.ts`):**
- Environment: jsdom
- Transform: ts-jest with react-jsx
- Module alias: `@/*` maps to `<rootDir>/src/$1`
- Setup: `jest.setup.ts` imports `@testing-library/jest-dom`

**Environment:**
- `DATABASE_URL` - PostgreSQL connection string (required for Prisma)
- `GITHUB_TOKEN` - Optional GitHub API token for higher rate limits

**Build:**
- `next.config.ts` - Minimal config, no custom options set yet

## Platform Requirements

**Development:**
- Node.js (version compatible with Next.js 16)
- PostgreSQL database (for Prisma; not yet connected)
- npm for package management

**Production:**
- Deployment target: Vercel (per `docs/TECHNICAL_DESIGN.md`)
- Database: Supabase (PostgreSQL, per design doc)
- No CI/CD pipeline configured yet (no `.github/` directory)

---

*Stack analysis: 2026-04-07*
