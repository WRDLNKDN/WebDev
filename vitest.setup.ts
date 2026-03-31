// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
  path: path.resolve(process.cwd(), 'supabase/.env'),
  quiet: true,
});
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), quiet: true });
dotenv.config({ quiet: true }); // fallback to .env
