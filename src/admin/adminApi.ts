// src/admin/admin/Api.ts

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ProfileStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

export type ProfileRow = {
  id: string;
  handle: string;
  status: ProfileStatus;
  created_at: string | null;
  updated_at: string | null;
  pronouns: string | null;
  geek_creds: string[] | null;
  nerd_creds: unknown | null;
  socials: unknown | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type FetchProfilesParams = {
  status: ProfileStatus | 'all';
  q: string;
  limit: number;
  offset: number;
  sort: 'created_at' | 'updated_at';
  order: 'asc' | 'desc';
};

type DbRow = {
  id: string;
  handle: string;
  status: ProfileStatus;
  created_at: string | null;
  updated_at: string | null;
  pronouns: string | null;
  geek_creds: string[] | null;
  nerd_creds: unknown | null;
  socials: unknown | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

const requireEnv = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
};

const SUPABASE_URL = requireEnv(
  'VITE_SUPABASE_URL',
  import.meta.env.VITE_SUPABASE_URL as string | undefined,
);

const SUPABASE_SERVICE_ROLE_KEY = requireEnv(
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined,
);

const adminClient = (): SupabaseClient =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const mapRow = (r: DbRow): ProfileRow => ({
  id: r.id,
  handle: r.handle,
  status: r.status,
  created_at: r.created_at,
  updated_at: r.updated_at,
  pronouns: r.pronouns,
  geek_creds: r.geek_creds,
  nerd_creds: r.nerd_creds,
  socials: r.socials,
  reviewed_at: r.reviewed_at,
  reviewed_by: r.reviewed_by,
});

export const fetchProfiles = async (
  _token: string,
  params: FetchProfilesParams,
): Promise<{ data: ProfileRow[]; count: number }> => {
  const supa = adminClient();

  let q = supa.from('profiles').select('*', { count: 'exact' });

  if (params.status !== 'all') q = q.eq('status', params.status);

  const trimmed = params.q.trim();
  if (trimmed) {
    // search by handle OR id (id is uuid text compare)
    q = q.or(`handle.ilike.%${trimmed}%,id.eq.${trimmed}`);
  }

  q = q.order(params.sort, { ascending: params.order === 'asc' });
  q = q.range(params.offset, params.offset + params.limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;

  return {
    data: (data as DbRow[]).map(mapRow),
    count: count ?? 0,
  };
};

export const approveProfiles = async (_token: string, ids: string[]) => {
  const supa = adminClient();
  const { error } = await supa
    .from('profiles')
    .update({ status: 'approved' })
    .in('id', ids);

  if (error) throw error;
  return { ok: true as const };
};

export const rejectProfiles = async (_token: string, ids: string[]) => {
  const supa = adminClient();
  const { error } = await supa
    .from('profiles')
    .update({ status: 'rejected' })
    .in('id', ids);

  if (error) throw error;
  return { ok: true as const };
};

export const disableProfiles = async (_token: string, ids: string[]) => {
  const supa = adminClient();
  const { error } = await supa
    .from('profiles')
    .update({ status: 'disabled' })
    .in('id', ids);

  if (error) throw error;
  return { ok: true as const };
};

export const deleteProfiles = async (
  _token: string,
  ids: string[],
  _hardDeleteAuthUsers: boolean,
) => {
  // Note: only deletes profile rows. Deleting auth.users requires admin auth API.
  const supa = adminClient();
  const { error } = await supa.from('profiles').delete().in('id', ids);

  if (error) throw error;
  return { ok: true as const };
};