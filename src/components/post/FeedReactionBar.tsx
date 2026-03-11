/**
 * FeedReactionBar — shared React picker used by feed surfaces.
 */
import type { ReactionType } from '../../lib/api/feedsApi';
import { ReactPickerButton } from './ReactPickerButton';
import { REACTION_OPTIONS as SHARED_REACTION_OPTIONS } from './sharedReactions';

export const REACTION_OPTIONS = SHARED_REACTION_OPTIONS.map((option) => ({
  type: option.value,
  label: option.label,
  emoji: option.emoji,
  color: option.color,
}));

export type FeedReactionBarProps = {
  viewerReaction: ReactionType | null;
  likeCount: number;
  loveCount: number;
  inspirationCount: number;
  careCount: number;
  laughingCount: number;
  rageCount: number;
  onReaction: (type: ReactionType) => void;
  onRemoveReaction: () => void;
  sx?: object;
};

export const FeedReactionBar = (props: FeedReactionBarProps) => {
  const { viewerReaction, onReaction, onRemoveReaction, sx } = props;

  return (
    <ReactPickerButton<ReactionType>
      options={SHARED_REACTION_OPTIONS}
      selectedValue={viewerReaction}
      onToggleReaction={(type) => {
        if (viewerReaction === type) {
          onRemoveReaction();
          return;
        }
        onReaction(type);
      }}
      buttonLabel="React"
      sx={{
        pt: 1,
        pb: 0.75,
        px: 0,
        ...sx,
      }}
      buttonSx={{
        minWidth: 0,
        width: '100%',
        justifyContent: 'center',
      }}
      traySx={{
        minWidth: 'max-content',
      }}
    />
  );
};
