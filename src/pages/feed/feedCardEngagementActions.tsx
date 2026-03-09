import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { Box, Button, Typography } from '@mui/material';
import { FeedReactionBar } from '../../components/post';
import type { FeedItem, ReactionType } from '../../lib/api/feedsApi';
import type { FeedCardActions } from './feedCardTypes';

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
  handleReaction,
}: FeedCardEngagementActionsProps) => {
  const totalReactions =
    likeCount +
    loveCount +
    inspirationCount +
    careCount +
    laughingCount +
    rageCount;
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
          mt: 0.5,
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: { xs: 0.5, sm: 1 },
          borderTop: 1,
          borderColor: 'divider',
          py: 0.25,
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
            textTransform: 'none',
            color: 'info.main',
            minWidth: 0,
            minHeight: 0,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0.25, sm: 0.5 },
            py: { xs: 0.75, sm: 0.5 },
            px: 1,
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'rgba(41, 182, 246, 0.12)',
              color: 'info.light',
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
            textTransform: 'none',
            color: 'success.main',
            minWidth: 0,
            minHeight: 0,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0.25, sm: 0.5 },
            py: { xs: 0.75, sm: 0.5 },
            px: 1,
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'rgba(102, 187, 106, 0.12)',
              color: 'success.light',
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
            textTransform: 'none',
            color: 'primary.main',
            minWidth: 0,
            minHeight: 0,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0.25, sm: 0.5 },
            py: { xs: 0.75, sm: 0.5 },
            px: 1,
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'rgba(66, 165, 245, 0.12)',
              color: 'primary.light',
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
            textTransform: 'none',
            color: item.viewer_saved ? 'warning.main' : 'text.secondary',
            minWidth: 0,
            minHeight: 0,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0.25, sm: 0.5 },
            py: { xs: 0.75, sm: 0.5 },
            px: 1,
            borderRadius: 2,
            '&:hover': {
              bgcolor: item.viewer_saved
                ? 'rgba(255, 183, 77, 0.12)'
                : 'rgba(255, 183, 77, 0.08)',
              color: 'warning.light',
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
