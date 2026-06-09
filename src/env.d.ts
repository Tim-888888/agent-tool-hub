/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  NEXT_INC_CACHE_R2_BUCKET?: R2Bucket;
  AGENT_TOOL_HUB_JOBS?: Workflow;
  AGENT_TOOL_HUB_APP_URL?: string;
  CRON_SECRET?: string;
  AUTH_SECRET?: string;
  AUTH_GITHUB_ID?: string;
  AUTH_GITHUB_SECRET?: string;
  GITHUB_TOKEN?: string;
  GLM_API_KEY?: string;
  RESEND_API_KEY?: string;
  NEWSLETTER_FROM?: string;
  NEXT_PUBLIC_APP_URL?: string;
  ADMIN_GITHUB_IDS?: string;
  NEXT_PUBLIC_ADMIN_GITHUB_IDS?: string;
  SKILLS_SH_BASE?: string;
}

interface Body {
  json(): Promise<any>;
}
