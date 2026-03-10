import { describe, expect, test } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  getMissingRlsEnvVars,
  RLS_TEST_ENV_READY,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} from './env';

type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { handle: string; status: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const anon = RLS_TEST_ENV_READY
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
  : null;

const service = RLS_TEST_ENV_READY
  ? createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

(RLS_TEST_ENV_READY ? describe : describe.skip)('profiles RLS', () => {
  if (!RLS_TEST_ENV_READY) {
    test.skip(`Missing RLS env: ${getMissingRlsEnvVars().join(', ')}`, () => {
      // Intentionally skipped when service-role credentials are unavailable.
    });
    return;
  }

  test('anon only sees approved profiles (if any)', async () => {
    const { data, error } = await anon!
      .from('profiles')
      .select('handle,status')
      .limit(50);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    for (const row of data ?? []) {
      expect(row.status).toBe('approved');
    }
  });

  test('service role can see profiles', async () => {
    const { data, error } = await service!
      .from('profiles')
      .select('handle,status')
      .limit(50);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
