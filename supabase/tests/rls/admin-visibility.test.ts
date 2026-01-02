// supabase/tests/rls/admin-visibility.test.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

function requireEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL', process.env.SUPABASE_URL);
const SUPABASE_ANON_KEY = requireEnv(
  'SUPABASE_ANON_KEY',
  process.env.SUPABASE_ANON_KEY,
);
const SUPABASE_SERVICE_ROLE_KEY = requireEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createUserViaAdmin(
  admin: SupabaseClient,
  email: string,
  password: string,
) {
  const res = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (res.error) throw res.error;
  if (!res.data.user)
    throw new Error('Failed to create user (no user returned)');
  return res.data.user.id;
}

async function signInUser(email: string, password: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (!data.session) throw new Error('No session returned on sign-in');

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
  });
}

describe('RLS: admin visibility & moderation', () => {
  const email = `admin-rls-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  const handle = `handle_${Date.now()}`.slice(0, 24);

  let testUserId: string;
  let userClient: SupabaseClient;

  const admin = adminClient();
  const anon = anonClient();

  beforeAll(async () => {
    testUserId = await createUserViaAdmin(admin, email, password);
    userClient = await signInUser(email, password);

    // Insert a profile row as the user (exercise RLS insert)
    const { error } = await userClient.from('profiles').insert({
      id: testUserId,
      handle,
      pronouns: 'they/them',
      // status intentionally omitted if default is pending
    });

    if (error) throw error;
  });

  afterAll(async () => {
    await admin.from('profiles').delete().eq('id', testUserId);
    await admin.auth.admin.deleteUser(testUserId);
  });

  it('Admin can see pending profiles', async () => {
    const { data, error } = await admin
      .from('profiles')
      .select('id, handle, status')
      .eq('id', testUserId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(testUserId);
  });

  it('Public cannot see pending profiles', async () => {
    const { data, error } = await anon
      .from('profiles')
      .select('id, handle, status')
      .eq('id', testUserId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('Admin can approve a profile', async () => {
    const { data, error } = await admin
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', testUserId)
      .select('id, status')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.status).toBe('approved');
  });

  it('Public can see approved profiles', async () => {
    const { data, error } = await anon
      .from('profiles')
      .select('id, handle, status')
      .eq('id', testUserId);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].id).toBe(testUserId);
    expect(data?.[0].status).toBe('approved');
  });
});
