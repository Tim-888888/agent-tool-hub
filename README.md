# AgentToolHub

AgentToolHub is a directory for discovering, reviewing, and managing AI agent tools such as MCP servers, skills, and rules.

This project is configured for deployment on Cloudflare, not Vercel.

## Stack

- Next.js 16 App Router
- Auth.js with GitHub OAuth
- Prisma with Cloudflare D1
- Cloudflare Workers via OpenNext
- Cloudflare R2 for OpenNext cache assets
- Cloudflare Workflows and Wrangler for scheduled/background jobs

## Deployment

Production deployment targets Cloudflare Workers using `@opennextjs/cloudflare`.

The runtime database is Cloudflare D1, exposed to the Worker through the `DB` binding. Long-running and scheduled work is handled through the separate jobs Worker and Cloudflare Workflows configuration.

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

Before deploying, replace placeholder Cloudflare resource IDs with real D1/R2/Workflow resources and set required secrets in Cloudflare:

- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `GITHUB_TOKEN`
- `GLM_API_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET`

## Notes

- D1 migrations live in `migrations/`.
- Cloudflare migration details are documented in `docs/cloudflare-migration.md`.
- On Windows, OpenNext may warn about runtime compatibility. Use WSL/Linux or Cloudflare staging for final runtime validation.
