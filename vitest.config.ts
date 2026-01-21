import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'node:path';

// Load test env vars
dotenv.config({ path: '.env.test' });

// --------------------------------------------------
// Load env vars for tests
// --------------------------------------------------

// 1) Supabase local env (created by `supabase start`)
dotenv.config({
  path: path.resolve(process.cwd(), 'supabase/.env'),
});

// 2) Optional test overrides
dotenv.config({
  path: path.resolve(process.cwd(), '.env.test'),
});

// 3) Fallback to normal .env
dotenv.config();

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
