import type {
  FeedComment,
  FeedItem,
  ReactionType,
} from '../../lib/api/feedsApi';
import { REACTION_COLORS } from '../../constants/reactionColors';

export type SharedReactionOption<T extends string = string> = {
  value: T;
  label: string;
  emoji: string;
  color: string;
};

type FeedReactionCountSource = Pick<
  FeedItem | FeedComment,
  | 'like_count'
  | 'love_count'
  | 'inspiration_count'
  | 'care_count'
  | 'laughing_count'
  | 'rage_count'
>;

export type FeedReactionSummaryItem = SharedReactionOption<ReactionType> & {
  count: number;
};

export const REACTION_OPTIONS: SharedReactionOption<ReactionType>[] = [
  {
    value: 'like',
    label: 'Thumbs Up',
    emoji: '👍',
    color: REACTION_COLORS.like,
  },
  { value: 'love', label: 'Heart', emoji: '❤️', color: REACTION_COLORS.love },
  {
    value: 'laughing',
    label: 'Laugh',
    emoji: '😂',
    color: REACTION_COLORS.laughing,
  },
  {
    value: 'inspiration',
    label: 'Surprised',
    emoji: '😮',
    color: REACTION_COLORS.inspiration,
  },
  { value: 'rage', label: 'Rage', emoji: '😡', color: REACTION_COLORS.rage },
  {
    value: 'care',
    label: 'Prayer Hands',
    emoji: '🙏',
    color: REACTION_COLORS.care,
  },
];

export const CHAT_REACTION_OPTIONS: SharedReactionOption<string>[] =
  REACTION_OPTIONS.map(({ label, emoji, color }) => ({
    value: emoji,
    label,
    emoji,
    color,
  }));

export function getFeedReactionCount(
  source: FeedReactionCountSource,
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

export function getFeedDisplayedReactionCount(
  source: FeedReactionCountSource,
  type: ReactionType,
  viewerReaction?: ReactionType | null,
): number {
  const count = getFeedReactionCount(source, type);
  if (count > 0) return count;
  return viewerReaction === type ? 1 : 0;
}

export function getFeedTotalReactionCount(
  source: FeedReactionCountSource,
  viewerReaction?: ReactionType | null,
): number {
  return REACTION_OPTIONS.reduce(
    (total, reaction) =>
      total +
      getFeedDisplayedReactionCount(source, reaction.value, viewerReaction),
    0,
  );
}

export function buildFeedReactionSummary(
  source: FeedReactionCountSource,
  viewerReaction?: ReactionType | null,
  limit = 3,
): FeedReactionSummaryItem[] {
  return REACTION_OPTIONS.map((reaction, index) => ({
    ...reaction,
    count: getFeedDisplayedReactionCount(
      source,
      reaction.value,
      viewerReaction,
    ),
    index,
  }))
    .filter((reaction) => reaction.count > 0)
    .sort((a, b) => {
      const aSelected = a.value === viewerReaction ? 1 : 0;
      const bSelected = b.value === viewerReaction ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      if (a.count !== b.count) return b.count - a.count;
      return a.index - b.index;
    })
    .slice(0, limit)
    .map(({ index: _index, ...reaction }) => reaction);
}
