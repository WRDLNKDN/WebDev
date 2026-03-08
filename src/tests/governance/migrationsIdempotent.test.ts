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
  it('tables migration avoids destructive table-data operations', () => {
    // Guard against accidental data nukes in schema migration.
    expect(TABLES_SQL).not.toMatch(/\bdrop\s+table\s+/i);
    expect(TABLES_SQL).not.toMatch(/\btruncate\s+(table\s+)?/i);
    expect(TABLES_SQL).not.toMatch(/\bdelete\s+from\s+[a-z0-9_."]+\s*;/i);
  });

  it('RLS migration avoids destructive table-data operations', () => {
    expect(RLS_SQL).not.toMatch(/\bdrop\s+table\s+/i);
    expect(RLS_SQL).not.toMatch(/\btruncate\s+(table\s+)?/i);
    expect(RLS_SQL).not.toMatch(/\bdelete\s+from\s+[a-z0-9_."]+\s*;/i);
  });
});
