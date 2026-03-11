export type FeedItemActor = {
  handle: string | null;
  display_name: string | null;
  avatar: string | null;
  bio?: string | null;
};

export type ReactionType =
  | 'like'
  | 'love'
  | 'inspiration'
  | 'care'
  | 'laughing'
  | 'rage';

export type FeedItem = {
  id: string;
  user_id: string;
  kind: 'post' | 'profile_update' | 'external_link' | 'repost' | 'reaction';
  payload: Record<string, unknown>;
  parent_id?: string | null;
  created_at: string;
  edited_at?: string | null;
  actor: FeedItemActor;
  like_count?: number;
  love_count?: number;
  inspiration_count?: number;
  care_count?: number;
  laughing_count?: number;
  rage_count?: number;
  viewer_reaction?: ReactionType | null;
  comment_count?: number;
  viewer_saved?: boolean;
  viewer_liked?: boolean;
};

export type FeedComment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  edited_at?: string | null;
  like_count?: number;
  love_count?: number;
  inspiration_count?: number;
  care_count?: number;
  laughing_count?: number;
  rage_count?: number;
  viewer_reaction?: ReactionType | null;
  actor: FeedItemActor;
};

export type FeedsResponse = {
  data: FeedItem[];
  nextCursor?: string;
};

export type FeedViewPreference = 'anyone' | 'connections';
