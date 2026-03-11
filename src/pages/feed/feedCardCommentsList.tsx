import {
  Box,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
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
}: FeedCardCommentsListProps) => (
  <List dense disablePadding>
    {comments.map((c) => (
      <ListItem
        key={c.id}
        alignItems="flex-start"
        disablePadding
        sx={{ py: 0.5, gap: { xs: 1, sm: 1.25 } }}
      >
        <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 48 }, mt: 0.125 }}>
          <ProfileAvatar
            src={c.actor?.avatar ?? undefined}
            alt={c.actor?.display_name || c.actor?.handle || '?'}
            size="small"
            sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 } }}
          />
        </ListItemAvatar>
        <ListItemText
          sx={{ my: 0, minWidth: 0 }}
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
                      disabled={savingCommentEdit || !editCommentDraft.trim()}
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
                            sx={{ whiteSpace: 'pre-wrap' }}
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
                {viewerUserId === c.user_id && editingCommentId !== c.id && (
                  <>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingCommentId(c.id);
                        setEditCommentDraft(c.body);
                      }}
                      sx={{
                        textTransform: 'none',
                        minWidth: 0,
                        px: { xs: 0.75, sm: 0 },
                        minHeight: { xs: 36, sm: 30 },
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => void actions.onDeleteComment(itemId, c.id)}
                      sx={{
                        textTransform: 'none',
                        minWidth: 0,
                        px: { xs: 0.75, sm: 0 },
                        minHeight: { xs: 36, sm: 30 },
                      }}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </Stack>
            </>
          }
        />
      </ListItem>
    ))}
  </List>
);
