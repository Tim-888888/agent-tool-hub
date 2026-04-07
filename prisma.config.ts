import { defineConfig, env } from '@prisma/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env file for CLI commands (prisma generate, db push, etc.)
dotenvConfig({ path: resolve(process.cwd(), '.env') });

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
