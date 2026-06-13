# Cloudflare Workers + D1 Migration

This project is now wired for Cloudflare Workers via OpenNext, Cloudflare D1, and a separate jobs Worker for Cron/Workflow triggers.

## Deployment Shape

- Web Worker: `wrangler.jsonc`
  - OpenNext output: `.open-next/worker.js`
  - Assets binding: `ASSETS`
  - D1 binding: `DB`
  - OpenNext incremental cache disabled with `incrementalCache: "dummy"` so R2 is not required for the first deployment.
- Jobs Worker: `wrangler.jobs.jsonc`
  - Cron schedules create Workflow instances.
  - Workflows call the existing job API routes using `CRON_SECRET`.

Before the first deploy, replace every `REPLACE_WITH_D1_DATABASE_ID` in the Wrangler configs with the real D1 database id and update `AGENT_TOOL_HUB_APP_URL`. If R2 is enabled later, add a `NEXT_INC_CACHE_R2_BUCKET` binding and switch `open-next.config.ts` to the R2 incremental cache override.

## Commands

```bash
npm install
npm run cf-typegen
npm run db:migrate:local
npm run preview
npm run deploy
npm run jobs:deploy
```

Secrets should be set with Wrangler or the Cloudflare dashboard:

```bash
wrangler secret put AUTH_SECRET
wrangler secret put AUTH_GITHUB_ID
wrangler secret put AUTH_GITHUB_SECRET
wrangler secret put GITHUB_TOKEN
wrangler secret put GLM_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put CRON_SECRET
```

Repeat the relevant secrets for `wrangler.jobs.jsonc` where needed, especially `CRON_SECRET`.

## Data Migration Outline

The Prisma schema now uses D1-compatible relation tables instead of PostgreSQL scalar arrays.

Map old fields into the new tables:

- `Tool.tags[]` -> `ToolTag(toolId, value, sortOrder)`
- `Tool.transports[]` -> `ToolTransport(toolId, value, sortOrder)`
- `Tool.featuresEn[]` -> `ToolFeature(toolId, locale='en', value, sortOrder)`
- `Tool.featuresZh[]` -> `ToolFeature(toolId, locale='zh', value, sortOrder)`
- `Tool.screenshots[]` -> `ToolScreenshot(toolId, url, sortOrder)`
- `Submission.suggestedTags[]` -> `SubmissionSuggestedTag(submissionId, value, sortOrder)`
- `TranslationCache.featuresZh[]` -> `TranslationCacheFeature(translationCacheId, value, sortOrder)`

Recommended production flow:

1. Freeze writes on the Vercel/Postgres deployment.
2. Copy the source Postgres connection string from the current Vercel deployment into `POSTGRES_DATABASE_URL`. The Vercel project dashboard URL is not enough; the exporter needs the database URL used by the existing production app.
3. Generate D1-compatible import SQL:

   ```bash
   POSTGRES_DATABASE_URL="postgres://..." npm run db:export:postgres -- --with-delete --chunk-size 1000
   ```

   This writes:

   - `exports/postgres-to-d1.sql`
   - `exports/postgres-to-d1-counts.json`
   - optional chunk files such as `exports/postgres-to-d1.001.sql`

4. Apply `migrations/0001_initial_d1.sql` to staging D1.
5. Import transformed rows into staging D1:

   ```bash
   npm run db:import:local
   npm run db:import:remote
   ```

   Use local import first for validation. Only run the remote import after checking the generated SQL and staging target. For production-sized imports, apply the chunk files in order instead of the single large SQL file.
   Wrangler manages remote D1 import execution, so generated SQL does not include explicit `BEGIN`/`COMMIT` statements.

6. Compare `exports/postgres-to-d1-counts.json` with D1 table counts and sample key relations for tools, users, OAuth accounts, sessions, submissions, reviews, favorites, collections, notifications, digest sends, and translation cache.
7. Deploy staging Workers and run every Workflow manually once.
8. Cut DNS/traffic after OAuth callback URLs and email/webhook secrets are confirmed.

The exporter does not delete D1 rows by default. If importing into a deliberately disposable staging database that already contains data, pass `--with-delete` to `scripts/export-postgres-to-d1.mjs` to prepend deletes in foreign-key-safe order. The generated inserts are retry-safe so a failed chunk can be run again before continuing.

### Public API fallback

If the direct Vercel/Postgres connection string is unavailable, use the public Vercel deployment API to seed the public directory data:

```bash
npm run db:export:vercel-public
npm run db:import:public:local
npm run db:import:public:remote
```

This writes `exports/vercel-public-to-d1.sql` and `exports/vercel-public-to-d1-counts.json`. It reads from `https://agent-tool-hub.vercel.app` by default and migrates public tools, categories, platforms, tags, transports, features, screenshots, and relationships. It does not include private auth/session/user/favorite/review data, so a full production cutover still needs the source Postgres connection string.

For large remote D1 imports, generate smaller files with:

```bash
npm run db:export:vercel-public -- --chunk-size 5000
```

## Follow-up Performance Work

The first D1 search implementation uses normalized tag rows plus SQLite-compatible `contains` filters. If search/list P95 becomes the bottleneck, add a D1 FTS5 virtual table or an external search index while preserving the existing `/api/tools/search` response shape.
