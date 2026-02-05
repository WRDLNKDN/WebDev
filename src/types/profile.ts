import type { Database } from './supabase';

// --- SECTOR 1: LINK SYSTEM (New for Issue #132) ---

export type LinkCategory = 'Professional' | 'Social' | 'Content' | 'Custom';

export interface SocialLink {
  id: string; // UUID for stable sorting/rendering
  category: LinkCategory; // Grouping header
  platform: string; // 'LinkedIn', 'GitHub', 'Custom', etc.
  url: string;
  label?: string; // Required for 'Custom', optional override for others
  isVisible: boolean; // Toggle without deleting
  order: number; // Drag-and-drop position
}

// --- SECTOR 2: NERD CREDENTIALS ---

export interface PortfolioItem {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'image';
  url: string;
  thumbnail?: string;
  description?: string;
}

export interface NerdCreds {
  // --- Expression Layer ---
  status_message?: string;
  status_emoji?: string;
  theme_song_url?: string;
  bio?: string; // Added to match recent usage

  // --- Portfolio Layer ---
  portfolio?: PortfolioItem[];

  // --- Legacy Support ---
  [key: string]: unknown;
}

// --- SECTOR 3: THE DASHBOARD PROFILE ---

// The "Hard Columns" directly from Supabase
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface DashboardProfile
  extends Omit<ProfileRow, 'nerd_creds' | 'socials'> {
  // Override generic 'Json' with specific schemas
  nerd_creds: NerdCreds;

  // The new Links Module structure
  // If null in DB, we treat it as an empty array in the hooks
  socials: SocialLink[];
}
