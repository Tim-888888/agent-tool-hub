# Phase 1: Backend Foundation - Research

**Researched:** 2026-04-07
**Domain:** Prisma ORM, Next.js 16 API Routes, Database Seeding, Testing
**Confidence:** HIGH

## Summary

This phase transforms AgentToolHub from a pure mock-data MVP into a real database-backed application. The codebase already has a fully defined Prisma schema (`prisma/schema.prisma`) with 7 models, a commented-out Prisma client singleton (`src/lib/db.ts`), and 12 tools + 12 categories + 7 platforms hardcoded in `src/lib/mock-data.ts`. No API routes exist yet, no database connection is active, and no migrations have been run.

The primary work involves: (1) activating Prisma with the existing schema against Supabase PostgreSQL, (2) writing an idempotent seed script that mirrors the current mock data into the database, (3) building API route handlers in `src/app/api/` using Next.js 16 Route Handlers, and (4) updating page components to fetch from API routes instead of importing mock data directly.

**Primary recommendation:** Use Prisma `upsert` for idempotent seeding, Next.js 16 Route Handlers (exported `GET` functions from `route.ts` files) with `NextRequest.nextUrl.searchParams` for query parsing, and test API handlers by directly invoking the exported functions with constructed `NextRequest` objects (no HTTP server needed).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-01 | Database Connection — Connect Prisma to Supabase PostgreSQL | Standard Stack: Prisma 7.6.0 client singleton pattern verified in db.ts comments |
| REQ-02 | Seed Data — Idempotent seed with 7 platforms, 12 categories, 12 tools | Code Examples: Prisma upsert pattern for idempotency; Architecture: seed file structure |
| REQ-03 | API Routes — Tools CRUD with pagination, filtering, sorting | Standard Stack: Next.js 16 Route Handlers; Code Examples: GET handler with NextRequest |
| REQ-04 | API Routes — Supporting endpoints (categories, search, trending, newest) | Architecture Patterns: shared query helpers from mock-data.ts logic |
| REQ-05 | Frontend Integration — Replace mock data imports with API fetches | Architecture: client-to-server data flow transition pattern |
| REQ-06 | Testing — Unit tests for routes, seed script, integration test | Testing: Jest with NextRequest construction, Prisma mock patterns |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | 7.6.0 | Database ORM client | Already installed, schema defined, project standard |
| prisma | 7.6.0 | CLI for migrations and seeding | Already installed, project standard |
| next | 16.2.2 | API Route Handlers via App Router | Framework itself provides route handlers — no extra library needed |
| jest | 30.3.0 | Test runner | Already installed and configured, project standard |
| ts-jest | 29.4.9 | TypeScript compilation for Jest | Already configured in jest.config.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | latest | Run TypeScript seed scripts | Seed file execution — needed because `ts-node` and `tsx` are not installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma client singleton pattern | Prisma Accelerate / connection pooling | Overkill for MVP; Supabase provides connection pooling at the database level |
| tsx for seed | ts-node for seed | tsx is faster, simpler, more modern; ts-node requires more config |
| Next.js Route Handlers | tRPC or external Express API | Route Handlers are built-in, zero additional dependencies, good enough for this scope |

**Installation:**
```bash
npm install -D tsx
```

**Version verification:**
- prisma: 7.6.0 (verified via `npx prisma --version`)
- @prisma/client: 7.6.0 (verified via package.json)
- next: 16.2.2 (verified via package.json)
- jest: 30.3.0 (verified via package.json)

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── tools/
│   │   │   ├── route.ts              # GET /api/tools (list + search)
│   │   │   ├── [slug]/
│   │   │   │   └── route.ts          # GET /api/tools/[slug]
│   │   │   ├── trending/
│   │   │   │   └── route.ts          # GET /api/tools/trending
│   │   │   └── newest/
│   │   │       └── route.ts          # GET /api/tools/newest
│   │   └── categories/
│   │       ├── route.ts              # GET /api/categories
│   │       └── [slug]/
│   │           └── route.ts          # GET /api/categories/[slug]
│   ├── tools/
│   ├── categories/
│   └── ...
├── lib/
│   ├── db.ts                         # Prisma client singleton (activate)
│   ├── mock-data.ts                  # Keep as fallback
│   ├── api-utils.ts                  # Shared API helpers (parsePagination, buildWhereClause)
│   └── ...
prisma/
├── schema.prisma                     # Existing schema (no changes needed)
└── seed.ts                           # New idempotent seed script
```

### Pattern 1: Prisma Client Singleton (Next.js App Router)
**What:** Prevents multiple Prisma client instances during hot module replacement in development.
**When to use:** Every file that needs database access.
**Example:**
```typescript
// src/lib/db.ts
// Source: [VERIFIED: node_modules/next/dist/docs + Prisma best practices]
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Pattern 2: Next.js 16 Route Handler with Query Params
**What:** Export named functions (`GET`, `POST`, etc.) from `route.ts` files.
**When to use:** Every API endpoint.
**Example:**
```typescript
// src/app/api/tools/route.ts
// Source: [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md]
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const query = searchParams.get('q') ?? '';
  const type = searchParams.get('type') ?? '';
  const platform = searchParams.get('platform') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? 'stars';

  // Build where clause, query Prisma, return paginated response
  const where = buildWhereClause({ query, type, platform, category });
  const [tools, total] = await Promise.all([
    prisma.tool.findMany({ where, ...buildOrderBy(sort), skip: (page - 1) * limit, take: limit, include: { categories: { include: { category: true } }, platforms: { include: { platform: true } } } }),
    prisma.tool.count({ where }),
  ]);

  return Response.json({ success: true, data: tools, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}
```

**Critical Next.js 16 detail:** `params` is a `Promise` in dynamic route handlers. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md]
```typescript
// src/app/api/tools/[slug]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  // ...
}
```

### Pattern 3: Idempotent Seed with Prisma upsert
**What:** Use `upsert` by unique field so the seed can be run multiple times safely.
**When to use:** Seed scripts, data migrations.
**Example:**
```typescript
// prisma/seed.ts
// Source: [ASSUMED] — standard Prisma pattern, verified against Prisma 7 API
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlatforms() {
  const platforms = [
    { slug: 'claude-code', name: 'Claude Code', icon: 'Bot', configKey: 'claude-code' },
    // ...
  ];

  for (const p of platforms) {
    await prisma.platform.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }
}
```

### Pattern 4: Testing API Route Handlers
**What:** Directly import and call the exported `GET` function with a constructed `NextRequest`.
**When to use:** Unit testing API routes.
**Example:**
```typescript
// __tests__/api/tools.test.ts
// Source: [ASSUMED] — common Next.js testing pattern
import { GET } from '@/app/api/tools/route';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    tool: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('GET /api/tools', () => {
  it('returns paginated tools', async () => {
    const mockRequest = new NextRequest(
      new URL('http://localhost:3000/api/tools?page=1&limit=10')
    );
    const response = await GET(mockRequest);
    expect(response.status).toBe(200);
  });
});
```

### Anti-Patterns to Avoid
- **Creating PrismaClient per request:** Causes connection pool exhaustion. Always use the singleton from `db.ts`.
- **Importing from `@prisma/client` before `npx prisma generate`:** Will fail with "Cannot find module" error. Always run generate first.
- **Using `params` synchronously in Next.js 16:** `params` is a `Promise` — must `await` it. This is a breaking change from Next.js 14.
- **Testing API routes by starting an HTTP server:** Unnecessary — just call the exported function directly.
- **Hardcoding `DATABASE_URL` in code:** Always use environment variables. The `.env` file is not committed to git.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database queries | Raw SQL strings | Prisma query builder | Type safety, SQL injection prevention, relation handling |
| Connection pooling | Custom pool manager | Prisma built-in + Supabase connection pooler | Prisma handles connection lifecycle; Supabase provides PgBouncer |
| Pagination math | Custom offset logic | Prisma `skip`/`take` + `count()` | Edge cases, total pages calculation |
| Seed idempotency | Delete-all-then-insert | Prisma `upsert` by unique field | Safe re-runs, no data loss if seed partially fails |
| JSON response formatting | Manual JSON.stringify | `Response.json()` from Web API | Built into Next.js 16 Route Handlers, handles headers automatically |
| Query param parsing | Manual string splitting | `NextRequest.nextUrl.searchParams` | Handles URL encoding, multiple values, type coercion |

**Key insight:** Prisma 7 handles all the complex database interaction patterns. The only non-trivial custom code needed is the `buildWhereClause` helper that maps filter params to Prisma `where` conditions.

## Common Pitfalls

### Pitfall 1: Prisma Client Not Generated
**What goes wrong:** `import { PrismaClient } from '@prisma/client'` fails with module not found.
**Why it happens:** Prisma client is generated into `node_modules/.prisma/client` — it does not exist until `npx prisma generate` runs.
**How to avoid:** Run `npx prisma generate` before any code that imports Prisma. Add it to `postinstall` script in `package.json`.
**Warning signs:** TypeScript errors on `@prisma/client` import.

### Pitfall 2: Next.js 16 params Is a Promise
**What goes wrong:** `params.slug` is `undefined` in dynamic route handlers.
**Why it happens:** Next.js 15+ changed `params` from a plain object to a `Promise`. This is a breaking change.
**How to avoid:** Always `const { slug } = await params;` in route handlers and page components.
**Warning signs:** `params.slug` is `undefined` or TypeScript error about missing properties on `Promise`.

### Pitfall 3: Prisma Enum vs TypeScript String Literal Union
**What goes wrong:** Type mismatch between Prisma generated enums and TypeScript string literal unions (`type ToolType = 'MCP_SERVER' | 'SKILL' | 'RULE'`).
**Why it happens:** The codebase defines `ToolType` as a string literal union in `src/types/index.ts`, but Prisma generates its own enum type.
**How to avoid:** After `prisma generate`, the Prisma enums will be available from `@prisma/client`. Update the API response mapping to use Prisma's enum values, or keep the TypeScript types and cast where needed. The seed script must use Prisma enum values, not the raw strings.
**Warning signs:** TypeScript errors when passing string literals to Prisma methods.

### Pitfall 4: Seed Script Runner Configuration
**What goes wrong:** `npx prisma db seed` fails because there is no seed runner configured.
**Why it happens:** Prisma requires a `prisma.seed` command in `package.json` to know how to execute TypeScript seed files.
**How to avoid:** Add to `package.json`: `"prisma": { "seed": "npx tsx prisma/seed.ts" }`. Also install `tsx` as a dev dependency.
**Warning signs:** `npx prisma db seed` says "no seed command found".

### Pitfall 5: Many-to-Many Relation Shape Mismatch
**What goes wrong:** The mock data has `tool.categories` as an array of full `Category` objects, but Prisma returns `{ categories: [{ categoryId, toolId, category: Category }] }` through the join table.
**Why it happens:** The schema uses explicit join tables (`ToolCategory`, `ToolPlatform`), not implicit many-to-many.
**How to avoid:** Write a mapping function that flattens `tool.categories.map(tc => tc.category)` to match the existing `Tool` interface shape. The API response should return data in the same shape the frontend expects.
**Warning signs:** Frontend breaks because `tool.categories[0].nameEn` is undefined — actual shape is `tool.categories[0].category.nameEn`.

### Pitfall 6: Missing .env File
**What goes wrong:** Prisma throws "Environment variable not found: DATABASE_URL".
**Why it happens:** There is no `.env` file (only `.env.example`). The developer must create one.
**How to avoid:** Document the setup step clearly. Add a check in `db.ts` or seed script.
**Warning signs:** Error on `npx prisma migrate dev` or any Prisma command.

### Pitfall 7: Test Environment Has No Database
**What goes wrong:** Tests that hit the real database fail in CI or on machines without database access.
**Why it happens:** Unit tests should not depend on a running database.
**How to avoid:** Mock the Prisma client in all API route tests. Only the integration test (seed -> API -> verify) should use a real database.
**Warning signs:** Tests fail with connection refused errors.

## Code Examples

### Complete Prisma Client Singleton
```typescript
// src/lib/db.ts
// Source: [VERIFIED: existing db.ts comments + Prisma best practices]
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

### Paginated Tools API Route
```typescript
// src/app/api/tools/route.ts
// Source: [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md]
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20')));

    const where: Record<string, unknown> = { status: { in: ['ACTIVE', 'FEATURED'] } };

    if (sp.get('q')) {
      where.OR = [
        { name: { contains: sp.get('q')!, mode: 'insensitive' } },
        { description: { contains: sp.get('q')!, mode: 'insensitive' } },
        { tags: { has: sp.get('q')! } },
      ];
    }
    if (sp.get('type')) where.type = sp.get('type')!.toUpperCase();
    if (sp.get('platform')) where.platforms = { some: { platform: { slug: sp.get('platform') } } };
    if (sp.get('category')) where.categories = { some: { category: { slug: sp.get('category') } } };

    const orderBy: Record<string, string> = {};
    switch (sp.get('sort')) {
      case 'recent': orderBy.lastCommitAt = 'desc'; break;
      case 'rating': orderBy.avgRating = 'desc'; break;
      case 'name': orderBy.name = 'asc'; break;
      default: orderBy.stars = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.tool.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          categories: { include: { category: true } },
          platforms: { include: { platform: true } },
        },
      }),
      prisma.tool.count({ where }),
    ]);

    return Response.json({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return Response.json({ success: false, error: 'Failed to fetch tools' }, { status: 500 });
  }
}
```

### Single Tool Detail API Route
```typescript
// src/app/api/tools/[slug]/route.ts
// Source: [VERIFIED: node_modules/next/dist/docs — params is Promise in Next.js 15+]
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tool = await prisma.tool.findUnique({
    where: { slug },
    include: {
      categories: { include: { category: true } },
      platforms: { include: { platform: true } },
    },
  });

  if (!tool) {
    return Response.json({ success: false, error: 'Tool not found' }, { status: 404 });
  }

  return Response.json({ success: true, data: tool });
}
```

### Idempotent Seed Script Structure
```typescript
// prisma/seed.ts
// Source: [ASSUMED] — standard Prisma upsert pattern
import { PrismaClient, ToolType, ToolStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed platforms (idempotent via upsert on slug)
  for (const p of PLATFORMS) {
    await prisma.platform.upsert({
      where: { slug: p.slug },
      update: { name: p.name, icon: p.icon, configKey: p.configKey },
      create: p,
    });
  }

  // 2. Seed categories (idempotent via upsert on slug)
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, nameZh: c.nameZh, icon: c.icon, descriptionEn: c.descriptionEn, descriptionZh: c.descriptionZh, order: c.order },
      create: c,
    });
  }

  // 3. Seed tools with relations
  for (const toolData of TOOLS) {
    const { categories, platforms, ...toolFields } = toolData;

    const tool = await prisma.tool.upsert({
      where: { slug: toolFields.slug },
      update: toolFields,
      create: toolFields,
    });

    // Connect categories
    for (const cat of categories) {
      const category = await prisma.category.findUnique({ where: { slug: cat.slug } });
      if (category) {
        await prisma.toolCategory.upsert({
          where: { toolId_categoryId: { toolId: tool.id, categoryId: category.id } },
          update: {},
          create: { toolId: tool.id, categoryId: category.id },
        });
      }
    }

    // Connect platforms
    for (const plat of platforms) {
      const platform = await prisma.platform.findUnique({ where: { slug: plat.slug } });
      if (platform) {
        await prisma.toolPlatform.upsert({
          where: { toolId_platformId: { toolId: tool.id, platformId: platform.id } },
          update: {},
          create: { toolId: tool.id, platformId: platform.id },
        });
      }
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

### Testing API Route Handler
```typescript
// __tests__/api/tools.test.ts
// Source: [ASSUMED] — standard Next.js API testing pattern
import { GET } from '@/app/api/tools/route';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    tool: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

describe('GET /api/tools', () => {
  it('returns success response with pagination', async () => {
    const { NextRequest } = require('next/server');
    const request = new NextRequest(new URL('http://localhost:3000/api/tools?page=1&limit=10'));

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.meta).toHaveProperty('total');
    expect(body.meta).toHaveProperty('page', 1);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params` as plain object | `params` as `Promise` | Next.js 15.0.0-RC | Must `await params` in all dynamic route handlers |
| `NextResponse.json()` | `Response.json()` | Next.js 15+ | Web standard `Response` is now preferred |
| `pages/api/` route files | `app/api/route.ts` handlers | Next.js 13.2 | Named exports for HTTP methods |
| Prisma 5 `createMany` only | Prisma 7 `upsert` + `createMany` with `skipDuplicates` | Prisma 7.x | Better idempotent seeding |
| Jest config with `next/jest` transformer | ts-jest standalone | Project choice | Existing project uses ts-jest directly |

**Deprecated/outdated:**
- `NextResponse.json()`: Still works but `Response.json()` is the documented standard in Next.js 16 docs [VERIFIED: node_modules/next/dist/docs]
- Pages Router API routes (`pages/api/`): Do not use — project uses App Router exclusively

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Prisma 7 `upsert` with composite ID join tables works as shown | Pattern 3 / Code Examples | Seed may need different syntax for join table upserts |
| A2 | `tsx` is the correct tool for running TypeScript seed scripts with Prisma 7 | Standard Stack | May need `ts-node` with specific config instead |
| A3 | Mocking Prisma client via `jest.mock('@/lib/db')` works for API route tests | Pattern 4 / Code Examples | May need more complex mock setup if Prisma uses internal symbols |
| A4 | The Prisma schema will migrate cleanly to Supabase PostgreSQL without schema changes | REQ-01 | Supabase may have specific requirements (extensions, etc.) |
| A5 | `Response.json()` is the correct return type for Next.js 16 Route Handlers | Code Examples | May need `NextResponse.json()` for edge compatibility |

## Open Questions

1. **Supabase DATABASE_URL format**
   - What we know: `.env.example` shows `postgresql://user:password@localhost:5432/agenttoolhub`
   - What's unclear: Whether Supabase connection string requires special format (pooler vs direct)
   - Recommendation: Developer must create `.env` with actual Supabase URL before migration. Document both direct and pooler connection strings.

2. **Mock data date strings vs DateTime objects**
   - What we know: Mock data uses ISO date strings like `"2026-03-28T00:00:00Z"` for `lastCommitAt`, `createdAt`, `updatedAt`
   - What's unclear: Whether Prisma will accept string dates or requires `Date` objects in seed
   - Recommendation: Prisma accepts ISO date strings and converts them. Test in seed script.

3. **Tool `installGuide` as JSON field**
   - What we know: Schema defines `installGuide Json?` and mock data has complex nested objects per platform
   - What's unclear: Whether Prisma's `Json` type preserves the exact structure or transforms it
   - Recommendation: Prisma `Json` stores and returns raw JSON. Should work as-is.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | available | 24.14.1 | -- |
| npm | Package manager | available | 11.11.0 | -- |
| npx | CLI runner | available | 11.11.0 | -- |
| Prisma CLI | Migrations + seed | available | 7.6.0 | -- |
| tsx | Seed script runner | missing | -- | Install as devDependency |
| psql | Database verification | missing | -- | Use Prisma Studio or `npx prisma db execute` |
| PostgreSQL / Supabase | Database | not checked | -- | Requires `.env` with DATABASE_URL |

**Missing dependencies with no fallback:**
- `tsx`: Must install (`npm install -D tsx`) for seed script execution
- Supabase PostgreSQL: Developer must provision and provide DATABASE_URL in `.env`

**Missing dependencies with fallback:**
- `psql`: Not needed — Prisma provides equivalent functionality via CLI

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.9 |
| Config file | `jest.config.ts` at project root |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | Prisma connects to database | integration | `npx prisma db execute --sql "SELECT 1"` | No -- Wave 0 |
| REQ-02 | Seed creates all records idempotently | unit + integration | `npm test -- __tests__/seed.test.ts` | No -- Wave 0 |
| REQ-03 | GET /api/tools returns paginated data | unit | `npm test -- __tests__/api/tools.test.ts` | No -- Wave 0 |
| REQ-03 | GET /api/tools/[slug] returns tool detail | unit | `npm test -- __tests__/api/tools-slug.test.ts` | No -- Wave 0 |
| REQ-04 | GET /api/categories returns all categories | unit | `npm test -- __tests__/api/categories.test.ts` | No -- Wave 0 |
| REQ-04 | GET /api/tools/trending returns sorted tools | unit | `npm test -- __tests__/api/tools-trending.test.ts` | No -- Wave 0 |
| REQ-05 | Pages render with API data | manual-only | Manual browser verification | N/A |
| REQ-06 | Integration: seed -> API -> verify | integration | `npm test -- __tests__/integration/seed-api.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green + manual page verification

### Wave 0 Gaps
- [ ] `__tests__/api/tools.test.ts` -- covers REQ-03 tools list
- [ ] `__tests__/api/tools-slug.test.ts` -- covers REQ-03 tool detail
- [ ] `__tests__/api/categories.test.ts` -- covers REQ-04 categories
- [ ] `__tests__/api/tools-trending.test.ts` -- covers REQ-04 trending
- [ ] `__tests__/seed.test.ts` -- covers REQ-02 seed idempotency
- [ ] `__tests__/integration/seed-api.test.ts` -- covers REQ-06 end-to-end
- [ ] Install tsx: `npm install -D tsx` -- required for seed execution

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in MVP (public read-only API) |
| V3 Session Management | no | No sessions in MVP |
| V4 Access Control | partial | API routes are GET-only, no mutation endpoints yet |
| V5 Input Validation | yes | Validate/sanitize query params (page, limit, sort values) |
| V6 Cryptography | no | No crypto needed for read-only API |

### Known Threat Patterns for Next.js + Prisma Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via search params | Tampering | Prisma parameterized queries (built-in protection) |
| Unbounded pagination (DoS) | Denial of Service | Enforce `limit` max (100) and min (1) |
| Database connection exhaustion | Denial of Service | Prisma client singleton + Supabase connection pooler |
| Information disclosure via error messages | Information Disclosure | Catch errors, return generic messages, log details server-side |

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler API reference, params as Promise, NextRequest usage
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md` — NextRequest.nextUrl.searchParams
- `node_modules/next/dist/docs/01-app/02-guides/testing/jest.md` — Jest setup with Next.js
- `prisma/schema.prisma` — Verified schema with 7 models, 3 enums, join tables
- `package.json` — Verified dependency versions
- `npx prisma --version` output — Confirmed Prisma 7.6.0 installed

### Secondary (MEDIUM confidence)
- `src/lib/db.ts` — Commented-out singleton pattern confirms intended approach
- `src/lib/mock-data.ts` — Verified data structure matches schema expectations
- `src/types/index.ts` — Verified TypeScript types align with Prisma models
- Existing `__tests__/lib/mock-data.test.ts` — Established testing patterns

### Tertiary (LOW confidence)
- Prisma 7 `upsert` behavior with composite ID join tables [ASSUMED — needs verification during implementation]
- `tsx` compatibility with Prisma seed execution [ASSUMED — needs verification]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified installed, versions confirmed
- Architecture: HIGH — Next.js 16 Route Handler patterns verified from official docs in node_modules
- Pitfalls: HIGH — most verified from codebase inspection and Next.js changelog
- Testing: MEDIUM — API route testing pattern is assumed but well-established in ecosystem
- Seed idempotency: MEDIUM — Prisma upsert pattern is standard but join table upsert needs verification

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable stack, low risk of breaking changes)
