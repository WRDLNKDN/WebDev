import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TABLES_SQL = readFileSync(
  'supabase/migrations/20260121180000_tables.sql',
  'utf8',
);

describe('chat eligible connections migration ordering governance', () => {
  it('defines chat_blocked before chat_list_eligible_connection_profiles', () => {
    const chatBlockedIndex = TABLES_SQL.indexOf(
      'create or replace function public.chat_blocked(a uuid, b uuid)',
    );
    const eligibleConnectionsIndex = TABLES_SQL.indexOf(
      'create or replace function public.chat_list_eligible_connection_profiles()',
    );

    expect(chatBlockedIndex).toBeGreaterThanOrEqual(0);
    expect(eligibleConnectionsIndex).toBeGreaterThanOrEqual(0);
    expect(chatBlockedIndex).toBeLessThan(eligibleConnectionsIndex);
  });
});
