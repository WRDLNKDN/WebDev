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

describe('feed ad events schema governance', () => {
  it('defines feed_ad_events table in tables migration', () => {
    expect(TABLES_SQL).toContain('create table public.feed_ad_events');
    expect(TABLES_SQL).toContain('comment on table public.feed_ad_events is');
  });

  it('defines feed_ad_events RLS policies in rls migration', () => {
    expect(RLS_SQL).toContain('feed_ad_events_insert_own');
    expect(RLS_SQL).toContain('feed_ad_events_admin_read');
    expect(RLS_SQL).toContain(
      'alter table public.feed_ad_events enable row level security',
    );
  });

  it('grants authenticated insert/select for telemetry and admin reads', () => {
    expect(RLS_SQL).toContain(
      'grant insert, select on table public.feed_ad_events to authenticated;',
    );
  });
});
