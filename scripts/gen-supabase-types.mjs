// scripts/gen-supabase-types.mjs
import fs from 'node:fs';
import path from 'node:path';

const outPath = path.resolve('src/types/supabase.ts');
fs.mkdirSync(path.dirname(outPath), { recursive: true });

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (data += chunk));
process.stdin.on('end', () => {
  fs.writeFileSync(outPath, data, 'utf8');
  process.stdout.write(`Wrote ${outPath}\n`);
});