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
import { getFeedReactionCount } from '../../components/post/sharedReactions';
import type { FeedComment } from '../../lib/api/feedsApi';
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

export const FeedCardCommentsList = ({
  comments,
  itemId,
  viewerUserId,
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

  return (
    <List dense disablePadding>
      {comments.map((c) => (
        <ListItem
          key={c.id}
          alignItems="flex-start"
          disablePadding
          sx={{
            py: 0.75,
            gap: COMMENT_AVATAR_GAP,
            display: 'flex',
            flexWrap: 'nowrap',
          }}
        >
          <ListItemAvatar
            sx={{
              minWidth: 0,
              width: COMMENT_AVATAR_SIZE.xs,
              mt: 0.25,
            }}
          >
            <ProfileAvatar
              src={c.actor?.avatar ?? undefined}
              alt={
                c.actor?.display_name?.trim() ||
                c.actor?.handle?.trim() ||
                'Someone'
              }
              size="small"
              sx={{
                width: COMMENT_AVATAR_SIZE.xs,
                height: COMMENT_AVATAR_SIZE.xs,
                flexShrink: 0,
              }}
            />
          </ListItemAvatar>
          <Box
            sx={{
              flex: '1 1 0%',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 0.5,
            }}
          >
            <ListItemText
              sx={{ my: 0, minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}
              primary={
                <Stack spacing={0.125}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ fontSize: { xs: '0.86rem', sm: '0.875rem' } }}
                    >
                      {c.actor?.display_name || c.actor?.handle || 'Someone'}
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
                        onChange={(e) => setEditCommentDraft(e.target.value)}
                      />
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            void (async () => {
                              setSavingCommentEdit(true);
                              try {
                                await actions.onEditComment(
                                  itemId,
                                  c.id,
                                  editCommentDraft,
                                );
                                setEditingCommentId(null);
                              } finally {
                                setSavingCommentEdit(false);
                              }
                            })();
                          }}
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
                      {(() => {
                        const cb = c.body ?? '';
                        const gifUrls = extractBodyUrls(cb).filter(isGifUrl);
                        const textOnly = removeGifUrlsFromBody(cb);
                        return (
                          <>
                            {textOnly && (
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{
                                  whiteSpace: 'pre-wrap',
                                  overflowWrap: 'break-word',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {linkifyBody(textOnly)}
                              </Typography>
                            )}
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
                      })()}
                    </Stack>
                  )}
                  <Typography
                    variant="caption"
                    display="block"
                    color="text.secondary"
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
                    {REACTION_OPTIONS.map(({ type, emoji, color }) => {
                      const active = c.viewer_reaction === type;
                      const count = getFeedReactionCount(c, type);
                      return (
                        <Button
                          key={`${c.id}-${type}`}
                          size="small"
                          onClick={() => {
                            if (active)
                              actions.onCommentRemoveReaction(
                                c.id,
                                c.viewer_reaction ?? undefined,
                              );
                            else actions.onCommentReaction(c.id, type);
                          }}
                          sx={{
                            textTransform: 'none',
                            minWidth: 0,
                            px: { xs: 0.75, sm: 0.25 },
                            minHeight: { xs: 36, sm: 30 },
                            gap: 0.4,
                            color: active ? color : 'text.secondary',
                          }}
                        >
                          <span aria-hidden="true">{emoji}</span>
                          {count > 0 ? count : ''}
                        </Button>
                      );
                    })}
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
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          {viewerUserId === c.user_id && (
            <Menu
              anchorEl={menuAnchor?.commentId === c.id ? menuAnchor.el : null}
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
        </ListItem>
      ))}
    </List>
  );
};
