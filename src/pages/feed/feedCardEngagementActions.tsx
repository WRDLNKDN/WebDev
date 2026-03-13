import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { Box, Button, Typography } from '@mui/material';
import { FeedReactionBar } from '../../components/post';
import {
  buildFeedReactionSummary,
  getFeedTotalReactionCount,
} from '../../components/post/sharedReactions';
import type { FeedItem, ReactionType } from '../../lib/api/feedsApi';
import { INTERACTION_COLORS } from '../../theme/themeConstants';
import type { FeedCardActions } from './feedCardTypes';

const FEED_ACTION_MUTED_COLOR = 'rgba(255,255,255,0.65)';
const FEED_ACTION_ACTIVE_COLOR = INTERACTION_COLORS.focus;
const FEED_ACTION_HOVER_COLOR = INTERACTION_COLORS.focus;
const FEED_ACTION_SELECTED_TEXT_SX = { fontWeight: 700 } as const;
const FEED_ACTION_BUTTON_SX = {
  textTransform: 'none',
  minWidth: 0,
  minHeight: { xs: 40, sm: 36 },
  flexDirection: { xs: 'row', sm: 'row' },
  gap: 0.625,
  py: { xs: 0.6, sm: 0.45 },
  px: { xs: 0.85, sm: 0.75 },
  borderRadius: 2,
  boxSizing: 'border-box',
  transition:
    'color 120ms ease, background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
  color: FEED_ACTION_MUTED_COLOR,
  border: '1px solid transparent',
  backgroundColor: 'transparent',
  lineHeight: 1,
  '& .MuiButton-startIcon': {
    margin: 0,
  },
  '& .MuiTouchRipple-root': {
    display: 'none',
  },
  '& .MuiSvgIcon-root, & .MuiTypography-root': {
    color: 'inherit',
  },
  '& .MuiSvgIcon-root': {
    flexShrink: 0,
  },
  '& .MuiTypography-root': {
    fontWeight: 600,
    lineHeight: 1.1,
  },
  '&:focus-visible': {
    outline: 'none',
    borderColor: 'rgba(141,188,229,0.32)',
    boxShadow: '0 0 0 1px rgba(56,132,210,0.14) inset',
  },
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: 'rgba(56,132,210,0.08)',
      borderColor: 'rgba(141,188,229,0.22)',
      color: FEED_ACTION_HOVER_COLOR,
    },
  },
} as const;

const getActiveActionSx = (active: boolean) => ({
  color: active ? FEED_ACTION_ACTIVE_COLOR : FEED_ACTION_MUTED_COLOR,
  bgcolor: active ? 'rgba(56,132,210,0.12)' : 'transparent',
  borderColor: active ? 'rgba(141,188,229,0.3)' : 'transparent',
  boxShadow: active ? '0 0 0 1px rgba(56,132,210,0.08) inset' : 'none',
  ...(active
    ? {
        '& .MuiTypography-root': FEED_ACTION_SELECTED_TEXT_SX,
      }
    : null),
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      bgcolor: active ? 'rgba(56,132,210,0.16)' : 'rgba(56,132,210,0.08)',
      borderColor: active ? 'rgba(141,188,229,0.34)' : 'rgba(141,188,229,0.22)',
      color: FEED_ACTION_HOVER_COLOR,
    },
  },
});

type FeedCardEngagementActionsProps = {
  item: FeedItem;
  actions: FeedCardActions;
  viewerReaction: ReactionType | null;
  viewerReposted: boolean;
  viewerSent: boolean;
  likeCount: number;
  loveCount: number;
  inspirationCount: number;
  careCount: number;
  laughingCount: number;
  rageCount: number;
  commentCount: number;
  commentsExpanded: boolean;
  handleReaction: (type: ReactionType) => void;
};

export const FeedCardEngagementActions = ({
  item,
  actions,
  viewerReaction,
  viewerReposted,
  viewerSent,
  likeCount,
  loveCount,
  inspirationCount,
  careCount,
  laughingCount,
  rageCount,
  commentCount,
  commentsExpanded,
  handleReaction,
}: FeedCardEngagementActionsProps) => {
  const reactionCounts = {
    like_count: likeCount,
    love_count: loveCount,
    inspiration_count: inspirationCount,
    care_count: careCount,
    laughing_count: laughingCount,
    rage_count: rageCount,
  };
  const totalReactions = getFeedTotalReactionCount(
    reactionCounts,
    viewerReaction,
  );
  const reactionSummary = buildFeedReactionSummary(
    reactionCounts,
    viewerReaction,
  ).map((reaction) => ({
    type: reaction.value,
    emoji: reaction.emoji,
    color: reaction.color,
  }));
  return (
    <>
      {(totalReactions > 0 || commentCount > 0) && (
        <Box
          sx={{
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {totalReactions > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  '& > *:not(:first-of-type)': { ml: -0.55 },
                }}
              >
                {reactionSummary.map(({ type, emoji, color }) => (
                  <Box
                    key={type}
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(12,18,29,0.92)',
                      border: '1px solid rgba(156,187,217,0.26)',
                      color,
                      fontSize: '0.72rem',
                    }}
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </Box>
                ))}
              </Box>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  cursor: 'default',
                }}
              >
                {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
              </Typography>
            </Box>
          )}
          {commentCount > 0 && (
            <Typography
              component="span"
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
                cursor: 'default',
              }}
            >
              {commentCount} comment{commentCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
      )}
      <Box
        sx={{
          mt: 2.15,
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-start',
          columnGap: 2.5,
          rowGap: 0.5,
          borderTop: 1,
          borderColor: 'divider',
          pt: 1,
          pb: 0.75,
          '& > *': {
            minHeight: { xs: 40, sm: 36 },
            display: 'flex',
            alignItems: 'center',
          },
        }}
      >
        <FeedReactionBar
          viewerReaction={viewerReaction}
          likeCount={likeCount}
          loveCount={loveCount}
          inspirationCount={inspirationCount}
          careCount={careCount}
          laughingCount={laughingCount}
          rageCount={rageCount}
          onReaction={handleReaction}
          onRemoveReaction={() =>
            actions.onRemoveReaction(item.id, item.viewer_reaction ?? undefined)
          }
          buttonTestId={`feed-action-react-${item.id}`}
        />
        <Button
          size="small"
          onClick={() => actions.onCommentToggle(item.id)}
          data-testid={`feed-action-comment-${item.id}`}
          sx={{
            ...FEED_ACTION_BUTTON_SX,
            ...getActiveActionSx(commentsExpanded),
          }}
          aria-pressed={commentsExpanded}
        >
          <ChatBubbleOutlineOutlinedIcon
            sx={{ fontSize: { xs: 22, sm: 20 } }}
          />
          <Typography
            component="span"
            variant="caption"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
          >
            Comment
          </Typography>
        </Button>
        <Button
          size="small"
          onClick={() => actions.onRepost(item)}
          data-testid={`feed-action-repost-${item.id}`}
          sx={{
            ...FEED_ACTION_BUTTON_SX,
            ...getActiveActionSx(viewerReposted),
          }}
          aria-pressed={viewerReposted}
        >
          <RepeatOutlinedIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
          <Typography
            component="span"
            variant="caption"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
          >
            {viewerReposted ? 'Reposted' : 'Repost'}
          </Typography>
        </Button>
        <Button
          size="small"
          onClick={() => actions.onSend(item)}
          data-testid={`feed-action-send-${item.id}`}
          sx={{
            ...FEED_ACTION_BUTTON_SX,
            ...getActiveActionSx(viewerSent),
          }}
          aria-pressed={viewerSent}
        >
          <SendOutlinedIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
          <Typography
            component="span"
            variant="caption"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
          >
            {viewerSent ? 'Sent' : 'Send'}
          </Typography>
        </Button>
        <Button
          size="small"
          onClick={() =>
            item.viewer_saved
              ? actions.onUnsave(item.id)
              : actions.onSave(item.id)
          }
          data-testid={`feed-action-save-${item.id}`}
          sx={{
            ...FEED_ACTION_BUTTON_SX,
            ...getActiveActionSx(Boolean(item.viewer_saved)),
          }}
          aria-label={item.viewer_saved ? 'Unsave' : 'Save'}
          aria-pressed={item.viewer_saved}
        >
          {item.viewer_saved ? (
            <BookmarkIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
          ) : (
            <BookmarkBorderIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
          )}
          <Typography
            component="span"
            variant="caption"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
          >
            {item.viewer_saved ? 'Saved' : 'Save'}
          </Typography>
        </Button>
      </Box>
    </>
  );
};
