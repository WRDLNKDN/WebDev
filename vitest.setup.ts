import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}