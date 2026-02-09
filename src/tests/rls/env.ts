import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

const loadIfExists = (p: string) => {
  if (fs.existsSync(p)) dotenv.config({ path: p });
};

// Load repo root envs
loadIfExists(path.resolve(process.cwd(), '.env.test'));
loadIfExists(path.resolve(process.cwd(), '.env'));

const requireEnv = (name: string, fallbackName?: string): string => {
  const v =
    process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!v) {
    const extra = fallbackName ? ` (or ${fallbackName})` : '';
    throw new Error(`Missing required env var: ${name}${extra}`);
  }
  return v;
};

// Prefer server-style names; fall back to Vite names for convenience
export const SUPABASE_URL = requireEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = requireEnv(
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
);
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
);
