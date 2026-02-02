import { describe, expect, test } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './env';

type Database = {
  public: {
    Tables: {
      admin_allowlist: {
        Row: { email: string; created_at: string; created_by: string | null };
        Insert: {
          email: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          email?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const service = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);

describe('admin_allowlist visibility', () => {
  test('service role can read allowlist', async () => {
    const { data, error } = await service
      .from('admin_allowlist')
      .select('email')
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
