import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CHAT_CREATE_DM_SQL = readFileSync(
  'supabase/migrations/20260312123000_chat_create_dm_reuse_existing.sql',
  'utf8',
);

describe('chat_create_dm canonicalization governance', () => {
  it('reuses an existing dm room before creating a new one', () => {
    expect(CHAT_CREATE_DM_SQL).toContain("where r.room_type = 'dm'");
    expect(CHAT_CREATE_DM_SQL).toContain('if v_room_id is not null then');
    expect(CHAT_CREATE_DM_SQL).toContain(
      'insert into public.chat_room_members (room_id, user_id, role, left_at)',
    );
    expect(CHAT_CREATE_DM_SQL).toContain('on conflict (room_id, user_id)');
  });

  it('still falls back to room creation when no dm exists', () => {
    expect(CHAT_CREATE_DM_SQL).toContain(
      'insert into public.chat_rooms (room_type, name, created_by)',
    );
    expect(CHAT_CREATE_DM_SQL).toContain("values ('dm', null, v_uid)");
  });
});
