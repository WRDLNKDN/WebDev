import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

const loadIfExists = (p: string) => {
  if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
};

// Load repo root envs
loadIfExists(path.resolve(process.cwd(), '.env.test'));
loadIfExists(path.resolve(process.cwd(), '.env'));

const getEnv = (name: string, fallbackName?: string): string | undefined => {
  return (
    process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined)
  );
};

const requireEnv = (name: string, fallbackName?: string): string => {
  const v = getEnv(name, fallbackName);
  if (!v) {
    const extra = fallbackName ? ` (or ${fallbackName})` : '';
    throw new Error(`Missing required env var: ${name}${extra}`);
  }
  return v;
};

export const SUPABASE_URL = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL') ?? '';
export const SUPABASE_ANON_KEY =
  getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY') ?? '';
export const SUPABASE_SERVICE_ROLE_KEY =
  getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export const RLS_TEST_ENV_READY = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY,
);

export const getMissingRlsEnvVars = (): string[] => {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL (or VITE_SUPABASE_URL)');
  if (!SUPABASE_ANON_KEY)
    missing.push('SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
};

export { requireEnv };
