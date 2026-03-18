export type LinkCategory =
  | 'Professional'
  | 'Social'
  | 'Content'
  | 'Games'
  | 'Custom';

export interface SocialLink {
  id: string;
  category: LinkCategory;
  platform: string;
  url: string;
  label?: string;
  isVisible: boolean;
  order: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'image';
  url: string;
  thumbnail?: string;
  description?: string;
}

export interface NerdCreds {
  status_message?: string;
  status_emoji?: string;
  theme_song_url?: string;
  app_theme?: 'light' | 'dark';
  bio?: string;
  /** Up to 8 interests (two-tier taxonomy + custom Other). Used for profile display and directory search. */
  interests?: string[];
  portfolio?: PortfolioItem[];
  resume_file_name?: string | null;
  resume_thumbnail_url?: string;
  resume_thumbnail_status?: 'pending' | 'complete' | 'failed';
  resume_thumbnail_updated_at?: string;
  resume_thumbnail_error?: string | null;
  resume_thumbnail_source_extension?: string;
  resume_display_index?: number;
  [key: string]: unknown;
}

export interface IndustryGroup {
  industry: string;
  sub_industries: string[];
}

export type AvatarType = 'photo' | 'preset' | 'ai';

export interface DashboardProfile {
  id: string;
  email?: string | null;
  handle: string;
  display_name?: string | null;
  avatar?: string | null;
  avatar_type?: AvatarType | null;
  tagline?: string | null;
  pronouns?: string | null;
  status?: string | null;
  profile_visibility?: 'members_only' | 'connections_only' | null;
  industry?: string | null;
  secondary_industry?: string | null;
  niche_field?: string | null;
  location?: string | null;
  join_reason?: string[] | null;
  participation_style?: string[] | null;
  policy_version?: string | null;
  resume_url?: string | null;
  nerd_creds: NerdCreds;
  socials: SocialLink[];
  industries: IndustryGroup[] | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
