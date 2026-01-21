// src/admin/types/supabase.ts
// Admin-only helper types.
// IMPORTANT: Database types come from src/types/supabase.ts (generated) to avoid drift.

export type { Database } from '@/types';

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