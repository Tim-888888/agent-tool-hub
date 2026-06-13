# AgentToolHub

AgentToolHub is a directory for discovering, reviewing, and managing AI agent tools such as MCP servers, skills, and rules.

This project is configured for deployment on Cloudflare, not Vercel.

## Stack

- Next.js 16 App Router
- Auth.js with GitHub OAuth
- Prisma with Cloudflare D1
- Cloudflare Workers via OpenNext
- Cloudflare Workflows and Wrangler for scheduled/background jobs

## Deployment

Production deployment targets Cloudflare Workers using `@opennextjs/cloudflare`.

The runtime database is Cloudflare D1, exposed to the Worker through the `DB` binding. Long-running and scheduled work is handled through the separate jobs Worker and Cloudflare Workflows configuration. OpenNext incremental cache is currently disabled so the app can deploy without requiring R2 billing setup; an R2-backed cache can be added later.

Vercel deployment is no longer the target for this project.

## Common Commands

```bash
npm install
npm test
npm run build
```

Run the Cloudflare/OpenNext preview locally:

```bash
npm run preview
```

Build and deploy the web Worker:

```bash
npm run deploy
```

Build and run a Wrangler dry-run upload:

```bash
npm run upload
```

Apply D1 migrations:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

Export the current Vercel/Postgres data into D1-compatible SQL, then import it:

```bash
POSTGRES_DATABASE_URL="postgres://..." npm run db:export:postgres -- --with-delete --chunk-size 1000
npm run db:import:local
npm run db:import:remote
```

The full export writes `exports/postgres-to-d1.sql`, `exports/postgres-to-d1-counts.json`, and optional chunk files such as `exports/postgres-to-d1.001.sql`. For production-sized remote D1 imports, validate locally first, then import the chunk files in order with Wrangler. The generated SQL uses retry-safe inserts because Cloudflare API uploads can occasionally fail mid-run.

If the Vercel/Postgres connection string is not available, export public directory data from the live Vercel site API:

```bash
npm run db:export:vercel-public
npm run db:import:public:local
npm run db:import:public:remote
```

This fallback migrates public tools, categories, platforms, tags, transports, features, screenshots, and relationships. It does not include users, OAuth accounts, sessions, favorites, reviews, or other private tables.
For large remote D1 imports, generate smaller SQL chunks with `npm run db:export:vercel-public -- --chunk-size 5000`.

Run or deploy the jobs Worker:

```bash
npm run jobs:dev
npm run jobs:deploy
```

Generate Cloudflare binding types:

```bash
npm run cf-typegen
```

## Cloudflare Configuration

The main Worker configuration lives in `wrangler.jsonc`.

The jobs Worker configuration lives in `wrangler.jobs.jsonc`.

Before deploying, replace placeholder Cloudflare resource IDs with real D1/Workflow resources and set required secrets in Cloudflare:

- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `GITHUB_TOKEN`
- `GLM_API_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET`

## Notes

- D1 migrations live in `migrations/`.
- `scripts/export-postgres-to-d1.mjs` preserves existing Vercel/Postgres data by transforming PostgreSQL scalar arrays into D1 relation tables before import.
- `scripts/export-vercel-public-api-to-d1.mjs` is a public-data fallback for cases where the direct Postgres URL is unavailable.
- Cloudflare migration details are documented in `docs/cloudflare-migration.md`.
- On Windows, OpenNext may warn about runtime compatibility. Use WSL/Linux or Cloudflare staging for final runtime validation.
