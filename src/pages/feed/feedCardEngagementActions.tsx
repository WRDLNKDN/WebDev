import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { Box, Button, Typography } from '@mui/material';
import { FeedReactionBar, REACTION_OPTIONS } from '../../components/post';
import { getFeedReactionCount } from '../../components/post/sharedReactions';
import type { FeedItem, ReactionType } from '../../lib/api/feedsApi';
import type { FeedCardActions } from './feedCardTypes';

const FEED_ACTION_MUTED_COLOR = 'rgba(255,255,255,0.65)';
const FEED_ACTION_BUTTON_SX = {
  textTransform: 'none',
  minWidth: 0,
  minHeight: 0,
  flexDirection: { xs: 'row', sm: 'row' },
  gap: 0.625,
  pt: 1,
  pb: 0.75,
  px: 0,
  borderRadius: 2,
  transition:
    'color 120ms ease, transform 120ms ease, background-color 120ms ease',
  '&:hover': {
    bgcolor: 'transparent',
    transform: 'scale(1.08)',
  },
} as const;

type FeedCardEngagementActionsProps = {
  item: FeedItem;
  actions: FeedCardActions;
  viewerReaction: ReactionType | null;
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
  const totalReactions =
    likeCount +
    loveCount +
    inspirationCount +
    careCount +
    laughingCount +
    rageCount;
  const reactionSummary = REACTION_OPTIONS.map((reaction) => ({
    ...reaction,
    count: getFeedReactionCount(
      {
        like_count: likeCount,
        love_count: loveCount,
        inspiration_count: inspirationCount,
        care_count: careCount,
        laughing_count: laughingCount,
        rage_count: rageCount,
      },
      reaction.type,
    ),
  })).filter((reaction) => reaction.count > 0);
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
                {reactionSummary.slice(0, 3).map(({ type, emoji, color }) => (
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
                      border: '1px solid rgba(255,255,255,0.12)',
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
          mt: 1.75,
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
        />
        <Button
          size="small"
          onClick={() => actions.onCommentToggle(item.id)}
          sx={{
            ...FEED_ACTION_BUTTON_SX,
            color: commentsExpanded ? '#60A5FA' : FEED_ACTION_MUTED_COLOR,
            '&:hover': {
              ...FEED_ACTION_BUTTON_SX['&:hover'],
              color: '#60A5FA',
            },
          }}
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
          sx={{
            ...FEED_ACTION_BUTTON_SX,
            color: FEED_ACTION_MUTED_COLOR,
            '&:hover': {
              ...FEED_ACTION_BUTTON_SX['&:hover'],
              color: '#A78BFA',
            },
          }}
        >
          <RepeatOutlinedIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
          <Typography
            component="span"
            variant="caption"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
          >
            Repost
          </Typography>
        </Button>
        <Button
          size="small"
          onClick={() => actions.onSend(item)}
          sx={{
            ...FEED_ACTION_BUTTON_SX,
            color: FEED_ACTION_MUTED_COLOR,
            '&:hover': {
              ...FEED_ACTION_BUTTON_SX['&:hover'],
              color: '#38BDF8',
            },
          }}
        >
          <SendOutlinedIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
          <Typography
            component="span"
            variant="caption"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
          >
            Send
          </Typography>
        </Button>
        <Button
          size="small"
          onClick={() =>
            item.viewer_saved
              ? actions.onUnsave(item.id)
              : actions.onSave(item.id)
          }
          sx={{
            ...FEED_ACTION_BUTTON_SX,
            color: item.viewer_saved ? '#FBBF24' : FEED_ACTION_MUTED_COLOR,
            '&:hover': {
              ...FEED_ACTION_BUTTON_SX['&:hover'],
              color: '#FBBF24',
            },
          }}
          aria-label={item.viewer_saved ? 'Unsave' : 'Save'}
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
