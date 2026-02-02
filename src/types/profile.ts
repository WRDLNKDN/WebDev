import type { Database } from './supabase';

// 1. The "Soft Attributes" (Living in JSON)
export interface PortfolioItem {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'image';
  url: string;
  thumbnail?: string;
  description?: string;
}

export interface NerdCreds {
  // --- Expression Layer (April's Requests) ---
  status_message?: string; // e.g. "⚡ Charging..."
  status_emoji?: string;
  theme_song_url?: string;

  // --- Portfolio Layer ---
  portfolio?: PortfolioItem[];

  // --- Legacy Support ---
  // We allow [key: string] so we don't crash if extra data exists
  [key: string]: unknown;
}

// 2. The "Hard Columns" (Database Row)
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface DashboardProfile extends Omit<ProfileRow, 'nerd_creds'> {
  // We override the generic 'Json' type with our specific interface
  nerd_creds: NerdCreds;
}
