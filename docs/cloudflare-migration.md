# Cloudflare Workers + D1 Migration

This project is now wired for Cloudflare Workers via OpenNext, Cloudflare D1, and a separate jobs Worker for Cron/Workflow triggers.

## Deployment Shape

- Web Worker: `wrangler.jsonc`
  - OpenNext output: `.open-next/worker.js`
  - Assets binding: `ASSETS`
  - D1 binding: `DB`
  - R2 cache binding: `NEXT_INC_CACHE_R2_BUCKET`
- Jobs Worker: `wrangler.jobs.jsonc`
  - Cron schedules create Workflow instances.
  - Workflows call the existing job API routes using `CRON_SECRET`.

Before the first deploy, replace every `REPLACE_WITH_D1_DATABASE_ID` in the Wrangler configs with the real D1 database id and update `AGENT_TOOL_HUB_APP_URL`.

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
2. Export each table from Postgres as JSON or CSV.
3. Transform the scalar array columns into the relation tables above.
4. Apply `migrations/0001_initial_d1.sql` to staging D1.
5. Import transformed rows into staging D1.
6. Compare counts for every table and sample key relations for tools, users, OAuth accounts, sessions, submissions, comments, favorites, collections, notifications, digest sends, and translation cache.
7. Deploy staging Workers and run every Workflow manually once.
8. Cut DNS/traffic after OAuth callback URLs and email/webhook secrets are confirmed.

## Follow-up Performance Work

The first D1 search implementation uses normalized tag rows plus SQLite-compatible `contains` filters. If search/list P95 becomes the bottleneck, add a D1 FTS5 virtual table or an external search index while preserving the existing `/api/tools/search` response shape.
