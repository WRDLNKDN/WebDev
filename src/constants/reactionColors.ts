import type { ReactionType } from '../lib/api/feedsApi';

/**
 * Canonical reaction colors shared across feed/profile reaction surfaces.
 * Care must remain purple and Happy must remain green.
 */
export const REACTION_COLORS: Record<ReactionType, string> = {
  like: 'primary.main',
  love: 'error.main',
  inspiration: 'warning.main',
  care: '#9c27b0',
  laughing: '#66bb6a',
  rage: 'error.dark',
};
