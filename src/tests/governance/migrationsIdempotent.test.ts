import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TABLES_SQL = readFileSync(
  'supabase/migrations/20260121180000_tables.sql',
  'utf8',
);
const RLS_SQL = readFileSync(
  'supabase/migrations/20260121180005_rls.sql',
  'utf8',
);

describe('migrations idempotent / no table drops', () => {
  it('tables migration never drops tables (only triggers/functions)', () => {
    // DROP TRIGGER IF EXISTS is allowed (removes trigger only). DROP TABLE would remove data.
    expect(TABLES_SQL).not.toMatch(/\bdrop\s+table\s+/i);
  });

  it('RLS migration never drops tables', () => {
    expect(RLS_SQL).not.toMatch(/\bdrop\s+table\s+/i);
  });
});
