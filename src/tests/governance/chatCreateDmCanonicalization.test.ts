import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TABLES_SQL = readFileSync(
  'supabase/migrations/20260121180000_tables.sql',
  'utf8',
);

describe('chat_create_dm canonicalization governance', () => {
  it('defines chat_create_dm in canonical tables migration', () => {
    expect(TABLES_SQL).toContain(
      'create or replace function public.chat_create_dm(p_other_user_id uuid)',
    );
  });

  it('creates dm room and inserts both members', () => {
    expect(TABLES_SQL).toContain(
      'insert into public.chat_rooms (room_type, name, created_by)',
    );
    expect(TABLES_SQL).toContain("values ('dm', null, v_uid)");
    expect(TABLES_SQL).toContain(
      'insert into public.chat_room_members (room_id, user_id, role)',
    );
  });
});
