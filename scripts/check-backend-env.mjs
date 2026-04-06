#!/usr/bin/env node
/**
 * Fail fast before `concurrently` + wait-on so `npm run dev` does not sit for 60s+
 * when the API cannot start (missing backend Supabase env).
 * Mirrors backend/appCore.js guards.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');

for (const name of ['.env', '.env.local']) {
  const p = resolve(repoRoot, name);
  if (existsSync(p)) {
    config({ path: p, override: name === '.env.local' });
  }
}

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error('');
  console.error(
    '[dev] API cannot start: missing backend Supabase environment.',
  );
  console.error('    Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('    Copy .env.example → .env, then run: npx supabase status');
  console.error('    and paste API URL + service_role key into .env');
  console.error('');
  process.exit(1);
}

process.exit(0);
