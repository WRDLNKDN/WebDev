import { describe, expect, test } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  getMissingRlsEnvVars,
  RLS_TEST_ENV_READY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from './env';

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

const service = RLS_TEST_ENV_READY
  ? createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

(RLS_TEST_ENV_READY ? describe : describe.skip)(
  'admin_allowlist visibility',
  () => {
    if (!RLS_TEST_ENV_READY) {
      test.skip(`Missing RLS env: ${getMissingRlsEnvVars().join(', ')}`, () => {
        // Intentionally skipped when service-role credentials are unavailable.
      });
      return;
    }

    test('service role can read allowlist', async () => {
      const { data, error } = await service!
        .from('admin_allowlist')
        .select('email')
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  },
);
