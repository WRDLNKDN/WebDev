// supabase/tests/rls/profiles.rls.test.ts
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Load env for Node/Vitest (Vite does NOT automatically load .env here).
// Priority: .env.local > .env.test > .env
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env.test', override: true });
dotenv.config({ path: '.env', override: true });

function requireEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// Accept either Node-style envs OR Vite env names (useful in local dev)
const SUPABASE_URL = requireEnv(
  'SUPABASE_URL',
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
);

const SUPABASE_ANON_KEY = requireEnv(
  'SUPABASE_ANON_KEY',
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
);

// Service role should NEVER be exposed to Vite, so we do not fallback to any VITE_ key.
const SUPABASE_SERVICE_ROLE_KEY = requireEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function makeAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function makeAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function randSuffix() {
  return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

async function createUserViaAdmin(
  admin: SupabaseClient,
  email: string,
  password: string,
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;
  if (!data.user?.id)
    throw new Error('Failed to create test user (no id returned)');

  return data.user.id;
}

async function signInAsUser(email: string, password: string) {
  // Login client: just to get a session
  const loginClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: login, error: loginErr } =
    await loginClient.auth.signInWithPassword({
      email,
      password,
    });

  if (loginErr) throw loginErr;
  if (!login.session) throw new Error('No session returned on sign-in');

  // Authed client: send JWT on every request
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${login.session.access_token}`,
      },
    },
  });
}

describe('RLS: public.profiles', () => {
  let adminClient: SupabaseClient;
  let publicClient: SupabaseClient;
  let authedClient: SupabaseClient;

  let testUserId: string;
  let testEmail: string;
  let testPassword: string;
  let handle: string;

  beforeAll(async () => {
    adminClient = makeAdminClient();
    publicClient = makeAnonClient();

    testEmail = `rls-test-${randSuffix()}@example.com`;
    testPassword = `Pass-${randSuffix()}!Aa1`;
    handle = `handle_${randSuffix()}`.slice(0, 24);

    // Create user
    testUserId = await createUserViaAdmin(adminClient, testEmail, testPassword);

    // Sign in as user
    authedClient = await signInAsUser(testEmail, testPassword);

    // Insert profile row as the user (exercise insert RLS)
    const { error: insertErr } = await authedClient.from('profiles').insert({
      id: testUserId,
      handle,
      pronouns: 'they/them',
      geek_creds: ['devops', 'memes'],
      nerd_creds: { games: ['R6', 'Factorio'] },
      socials: {
        discord: 'nick#0001',
        reddit: null,
        github: 'NickTheDevOpsGuy',
      },
    });

    if (insertErr) throw insertErr;
  });

  afterAll(async () => {
    // Clean up profile + user via service role
    if (adminClient && testUserId) {
      await adminClient.from('profiles').delete().eq('id', testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  it('Public cannot see pending profiles', async () => {
    const { data, error } = await publicClient
      .from('profiles')
      .select('id, handle, status')
      .eq('id', testUserId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('User can read their own profile (even if pending)', async () => {
    const { data, error } = await authedClient
      .from('profiles')
      .select('id, handle, status, pronouns')
      .eq('id', testUserId);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].id).toBe(testUserId);
  });

  it('User can update their own profile fields', async () => {
    const { error: updateErr } = await authedClient
      .from('profiles')
      .update({ pronouns: 'he/him' })
      .eq('id', testUserId);

    expect(updateErr).toBeNull();

    const { data, error } = await authedClient
      .from('profiles')
      .select('pronouns')
      .eq('id', testUserId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.pronouns).toBe('he/him');
  });

  it('User cannot change their own status (self-approval blocked)', async () => {
    const { error } = await authedClient
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', testUserId);

    expect(error).not.toBeNull();
  });

  it('Admin can approve a profile', async () => {
    const { error } = await adminClient
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', testUserId);

    expect(error).toBeNull();
  });

  it('Public can see approved profiles', async () => {
    const { data, error } = await publicClient
      .from('profiles')
      .select('id, handle, status')
      .eq('id', testUserId);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].id).toBe(testUserId);
    expect(data?.[0].handle).toBe(handle);
  });
});
