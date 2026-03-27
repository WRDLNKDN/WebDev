import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import React from 'react';
import { ProfileAvatar } from '../../components/avatar/ProfileAvatar';
import { REACTION_OPTIONS } from '../../components/post';
import {
  buildFeedReactionSummary,
  getFeedReactionCount,
  getFeedTotalReactionCount,
} from '../../components/post/sharedReactions';
import type { FeedComment, ReactionType } from '../../lib/api/feedsApi';
import { formatPostTime } from '../../lib/post/formatPostTime';
import {
  extractBodyUrls,
  isGifUrl,
  linkifyBody,
  removeGifUrlsFromBody,
} from './feedRenderUtils';
import type { FeedCardActions } from './feedCardTypes';

type FeedCardCommentsListProps = {
  comments: FeedComment[];
  itemId: string;
  viewerUserId?: string;
  viewerAvatarUrl?: string | null;
  actions: FeedCardActions;
  editingCommentId: string | null;
  setEditingCommentId: (value: string | null) => void;
  editCommentDraft: string;
  setEditCommentDraft: (value: string) => void;
  savingCommentEdit: boolean;
  setSavingCommentEdit: (value: boolean) => void;
};

const COMMENT_AVATAR_SIZE = { xs: 36, sm: 40 };
const COMMENT_AVATAR_GAP = 1;
const COMMENT_REACTION_BUTTON_SX = {
  textTransform: 'none',
  minWidth: 0,
  px: { xs: 0.5, sm: 0.25 },
  minHeight: { xs: 36, sm: 30 },
  gap: 0.4,
  borderRadius: 999,
};
const SR_ONLY_SX = {
  position: 'absolute',
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

type CommentReactionButtonProps = {
  emoji: string;
  count: number;
  color?: string;
  label?: string;
  onClick: () => void;
};

const CommentReactionButton = ({
  emoji,
  count,
  color = 'text.secondary',
  label,
  onClick,
}: CommentReactionButtonProps) => {
  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{
        ...COMMENT_REACTION_BUTTON_SX,
        color,
      }}
    >
      <span aria-hidden="true">{emoji}</span>
      {label ? (
        <Box component="span" sx={SR_ONLY_SX}>
          {label}
        </Box>
      ) : null}
      {count > 0 ? count : ''}
    </Button>
  );
};

const CommentBodyContent = ({ body }: { body: string | null | undefined }) => {
  const commentBody = body ?? '';
  const gifUrls = extractBodyUrls(commentBody).filter(isGifUrl);
  const textOnly = removeGifUrlsFromBody(commentBody);

  return (
    <>
      {textOnly ? (
        <Typography
          variant="body2"
          component="span"
          sx={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.55,
          }}
        >
          {linkifyBody(textOnly)}
        </Typography>
      ) : null}
      {gifUrls.map((gifUrl) => (
        <Box
          key={gifUrl}
          component="img"
          src={gifUrl}
          alt="GIF"
          sx={{
            maxWidth: 240,
            maxHeight: 180,
            objectFit: 'contain',
            borderRadius: 1,
          }}
        />
      ))}
    </>
  );
};

type CommentReactionsProps = {
  comment: FeedComment;
  reactionPickerCommentId: string | null;
  setReactionPickerCommentId: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  reactionSummary: ReturnType<typeof buildFeedReactionSummary>;
  totalReactionCount: number;
  reactionLabel: string;
  toggleReaction: (value: ReactionType) => void;
};

const CommentReactions = ({
  comment,
  reactionPickerCommentId,
  setReactionPickerCommentId,
  reactionSummary,
  totalReactionCount,
  reactionLabel,
  toggleReaction,
}: CommentReactionsProps) => {
  const isReactionPickerOpen = reactionPickerCommentId === comment.id;

  if (isReactionPickerOpen) {
    return REACTION_OPTIONS.map(({ type, emoji, color, label }) => (
      <CommentReactionButton
        key={`${comment.id}-${type}`}
        emoji={emoji}
        count={getFeedReactionCount(comment, type)}
        color={comment.viewer_reaction === type ? color : 'text.secondary'}
        label={label}
        onClick={() => {
          toggleReaction(type);
          setReactionPickerCommentId(null);
        }}
      />
    ));
  }

  return (
    <>
      <Button
        size="small"
        onClick={() => setReactionPickerCommentId(comment.id)}
        sx={{
          ...COMMENT_REACTION_BUTTON_SX,
          color: 'text.secondary',
        }}
      >
        React
      </Button>
      {reactionSummary.map(({ value, emoji, color, count }) => (
        <CommentReactionButton
          key={`${comment.id}-summary-${value}`}
          emoji={emoji}
          count={count}
          color={comment.viewer_reaction === value ? color : 'text.secondary'}
          onClick={() => toggleReaction(value)}
        />
      ))}
      {totalReactionCount > 0 ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ alignSelf: 'center' }}
        >
          {totalReactionCount} {reactionLabel}
        </Typography>
      ) : null}
    </>
  );
};

export const FeedCardCommentsList = ({
  comments,
  itemId,
  viewerUserId,
  viewerAvatarUrl,
  actions,
  editingCommentId,
  setEditingCommentId,
  editCommentDraft,
  setEditCommentDraft,
  savingCommentEdit,
  setSavingCommentEdit,
}: FeedCardCommentsListProps) => {
  const [menuAnchor, setMenuAnchor] = React.useState<{
    el: HTMLElement;
    commentId: string;
  } | null>(null);
  const [reactionPickerCommentId, setReactionPickerCommentId] = React.useState<
    string | null
  >(null);

  return (
    <List dense disablePadding>
      {comments.map((c) => {
        const actorName =
          c.actor?.display_name?.trim() ||
          c.actor?.handle?.trim() ||
          (viewerUserId === c.user_id ? 'You' : 'Someone');
        const avatarSrc =
          viewerUserId === c.user_id
            ? (viewerAvatarUrl ?? c.actor?.avatar ?? undefined)
            : (c.actor?.avatar ?? undefined);
        const viewerReaction = c.viewer_reaction ?? null;
        const reactionSummary = buildFeedReactionSummary(c, viewerReaction, 6);
        const totalReactionCount = getFeedTotalReactionCount(c, viewerReaction);
        const reactionLabel =
          totalReactionCount === 1 ? 'reaction' : 'reactions';
        const toggleReaction = (value: ReactionType) => {
          if (viewerReaction === value) {
            actions.onCommentRemoveReaction(c.id, viewerReaction ?? undefined);
            return;
          }
          actions.onCommentReaction(c.id, value);
        };
        const handleSaveCommentEdit = () => {
          void (async () => {
            setSavingCommentEdit(true);
            try {
              await actions.onEditComment(itemId, c.id, editCommentDraft);
              setEditingCommentId(null);
            } finally {
              setSavingCommentEdit(false);
            }
          })();
        };

        return (
          <ListItem
            key={c.id}
            alignItems="flex-start"
            disablePadding
            sx={{
              py: 0.9,
              display: 'grid',
              gridTemplateColumns: 'auto minmax(0, 1fr)',
              columnGap: COMMENT_AVATAR_GAP,
              alignItems: 'start',
            }}
          >
            <>
              <ListItemAvatar
                sx={{
                  minWidth: 0,
                  width: {
                    xs: COMMENT_AVATAR_SIZE.xs,
                    sm: COMMENT_AVATAR_SIZE.sm,
                  },
                  mt: 0.1,
                  mr: 0,
                  alignSelf: 'start',
                }}
              >
                <ProfileAvatar
                  src={avatarSrc}
                  alt={actorName}
                  size="small"
                  sx={{
                    width: {
                      xs: COMMENT_AVATAR_SIZE.xs,
                      sm: COMMENT_AVATAR_SIZE.sm,
                    },
                    height: {
                      xs: COMMENT_AVATAR_SIZE.xs,
                      sm: COMMENT_AVATAR_SIZE.sm,
                    },
                    flexShrink: 0,
                    border: '1px solid rgba(141,188,229,0.24)',
                    boxShadow: '0 8px 18px rgba(3,8,20,0.16)',
                  }}
                />
              </ListItemAvatar>
              <Box
                sx={{
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 0.75,
                  width: '100%',
                }}
              >
                <ListItemText
                  sx={{
                    my: 0,
                    minWidth: 0,
                    flex: '1 1 auto',
                    overflow: 'hidden',
                    '& .MuiListItemText-primary': { mb: 0.35 },
                    '& .MuiListItemText-secondary': { display: 'block' },
                  }}
                  primary={
                    <Stack spacing={0.2}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{ minWidth: 0, pr: 0.5 }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            fontSize: { xs: '0.86rem', sm: '0.875rem' },
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {actorName}
                        </Typography>
                        {c.edited_at && (
                          <Typography variant="caption" color="text.secondary">
                            Edited
                          </Typography>
                        )}
                      </Stack>
                      {c.actor?.bio ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            fontSize: { xs: '0.72rem', sm: '0.75rem' },
                          }}
                        >
                          {c.actor.bio}
                        </Typography>
                      ) : null}
                    </Stack>
                  }
                  secondary={
                    <>
                      {editingCommentId === c.id ? (
                        <Stack spacing={1} sx={{ mt: 0.5 }}>
                          <TextField
                            size="small"
                            multiline
                            minRows={2}
                            value={editCommentDraft}
                            onChange={(e) =>
                              setEditCommentDraft(e.target.value)
                            }
                          />
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={handleSaveCommentEdit}
                              disabled={
                                savingCommentEdit || !editCommentDraft.trim()
                              }
                            >
                              Save
                            </Button>
                            <Button
                              size="small"
                              onClick={() => setEditingCommentId(null)}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        </Stack>
                      ) : (
                        <Stack spacing={0.5} component="span">
                          <CommentBodyContent body={c.body} />
                        </Stack>
                      )}
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{ mt: 0.15 }}
                      >
                        {formatPostTime(c.created_at)}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={{ xs: 0.75, sm: 1 }}
                        sx={{
                          flexWrap: 'wrap',
                          gap: { xs: 0.5, sm: 0 },
                          justifyContent: 'flex-start',
                        }}
                      >
                        <CommentReactions
                          comment={c}
                          reactionPickerCommentId={reactionPickerCommentId}
                          setReactionPickerCommentId={
                            setReactionPickerCommentId
                          }
                          reactionSummary={reactionSummary}
                          totalReactionCount={totalReactionCount}
                          reactionLabel={reactionLabel}
                          toggleReaction={toggleReaction}
                        />
                      </Stack>
                    </>
                  }
                />
                {viewerUserId === c.user_id && editingCommentId !== c.id && (
                  <IconButton
                    size="small"
                    onClick={(e) =>
                      setMenuAnchor({ el: e.currentTarget, commentId: c.id })
                    }
                    aria-label="Comment options"
                    sx={{
                      flexShrink: 0,
                      mt: -0.2,
                      color: 'rgba(255,255,255,0.42)',
                      border: '1px solid transparent',
                      '&:hover': {
                        color: 'rgba(255,255,255,0.88)',
                        bgcolor: 'rgba(56,132,210,0.1)',
                        borderColor: 'rgba(141,188,229,0.18)',
                      },
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              {viewerUserId === c.user_id && (
                <Menu
                  anchorEl={
                    menuAnchor?.commentId === c.id ? menuAnchor.el : null
                  }
                  open={menuAnchor?.commentId === c.id}
                  onClose={() => setMenuAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{ paper: { sx: { minWidth: 120 } } }}
                >
                  <MenuItem
                    onClick={() => {
                      setEditingCommentId(c.id);
                      setEditCommentDraft(c.body);
                      setMenuAnchor(null);
                    }}
                  >
                    Edit
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      void actions.onDeleteComment(itemId, c.id);
                      setMenuAnchor(null);
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    Delete
                  </MenuItem>
                </Menu>
              )}
            </>
          </ListItem>
        );
      })}
    </List>
  );
};
