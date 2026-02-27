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

describe('community partners schema governance', () => {
  it('defines dedicated community_partners table in tables migration', () => {
    expect(TABLES_SQL).toMatch(
      /create\s+table\s+if\s+not\s+exists\s+public\.community_partners/,
    );
    expect(TABLES_SQL).toContain(
      'comment on table public.community_partners is',
    );
  });

  it('defines community_partners RLS policies in rls migration', () => {
    expect(RLS_SQL).toContain('community_partners_public_read');
    expect(RLS_SQL).toContain('community_partners_admin_all');
    expect(RLS_SQL).toContain(
      'alter table public.community_partners enable row level security',
    );
  });

  it('grants public read and authenticated admin CRUD paths', () => {
    expect(RLS_SQL).toContain(
      'grant select on table public.community_partners to anon, authenticated;',
    );
    expect(RLS_SQL).toContain(
      'grant select, insert, update, delete on table public.community_partners to authenticated;',
    );
  });
});
