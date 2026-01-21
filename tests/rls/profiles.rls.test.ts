import { describe, expect, test } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './env';

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

const anon = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const service = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

describe('profiles RLS', () => {
  test('anon only sees approved profiles (if any)', async () => {
    const { data, error } = await anon
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
    const { data, error } = await service
      .from('profiles')
      .select('handle,status')
      .limit(50);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});