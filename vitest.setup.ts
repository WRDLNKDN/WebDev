// vitest.setup.ts
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), 'supabase/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
dotenv.config(); // fallback to .env
