import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('src/types', { recursive: true });

const out = execSync('npx supabase gen types typescript --local', {
  encoding: 'utf8',
});

writeFileSync('src/types/supabase.ts', out, 'utf8');
console.log('Wrote src/types/supabase.ts');
