import type {
  FeedComment,
  FeedItem,
  ReactionType,
} from '../../lib/api/feedsApi';

export type SharedReactionOption<T extends string = string> = {
  value: T;
  label: string;
  emoji: string;
  color: string;
};

export const REACTION_OPTIONS: SharedReactionOption<ReactionType>[] = [
  { value: 'like', label: 'Thumbs Up', emoji: '👍', color: '#22C55E' },
  { value: 'love', label: 'Heart', emoji: '❤️', color: '#F87171' },
  { value: 'laughing', label: 'Laugh', emoji: '😂', color: '#FBBF24' },
  { value: 'inspiration', label: 'Surprised', emoji: '😮', color: '#60A5FA' },
  { value: 'rage', label: 'Sad', emoji: '😢', color: '#94A3B8' },
  { value: 'care', label: 'Prayer Hands', emoji: '🙏', color: '#F59E0B' },
];

export const CHAT_REACTION_OPTIONS: SharedReactionOption<string>[] =
  REACTION_OPTIONS.map(({ label, emoji, color }) => ({
    value: emoji,
    label,
    emoji,
    color,
  }));

export function getFeedReactionCount(
  source: Pick<
    FeedItem | FeedComment,
    | 'like_count'
    | 'love_count'
    | 'inspiration_count'
    | 'care_count'
    | 'laughing_count'
    | 'rage_count'
  >,
  type: ReactionType,
): number {
  switch (type) {
    case 'like':
      return source.like_count ?? 0;
    case 'love':
      return source.love_count ?? 0;
    case 'inspiration':
      return source.inspiration_count ?? 0;
    case 'care':
      return source.care_count ?? 0;
    case 'laughing':
      return source.laughing_count ?? 0;
    case 'rage':
      return source.rage_count ?? 0;
    default:
      return 0;
  }
}
