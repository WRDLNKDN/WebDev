import type { ReactionType } from '../lib/api/feedsApi';
import { INTERACTION_COLORS } from '../theme/themeConstants';

/**
 * Canonical reaction colors shared across feed/profile reaction surfaces.
 * Keep these aligned with the sitewide interaction palette.
 */
export const REACTION_COLORS: Record<ReactionType, string> = {
  like: INTERACTION_COLORS.react,
  love: INTERACTION_COLORS.love,
  inspiration: INTERACTION_COLORS.comment,
  care: INTERACTION_COLORS.care,
  laughing: INTERACTION_COLORS.save,
  rage: INTERACTION_COLORS.send,
};
