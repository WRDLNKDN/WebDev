// tests/rls/env.ts
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

const loadIfExists = (p: string) => {
  if (fs.existsSync(p)) dotenv.config({ path: p });
};

// Local Supabase env (created by `supabase start`)
loadIfExists(path.resolve(process.cwd(), 'supabase/.env'));

// Test overrides
loadIfExists(path.resolve(process.cwd(), '.env.test'));

// Default env
loadIfExists(path.resolve(process.cwd(), '.env'));

const requireEnv = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};

export const SUPABASE_URL = requireEnv('SUPABASE_URL');
export const SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
);
