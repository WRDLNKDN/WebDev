import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import GifBoxIcon from '@mui/icons-material/GifBox';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { type MouseEvent } from 'react';
import * as GifPicker from '../../components/chat/dialogs/GifPickerDialog';

type FeedCardCommentsComposerProps = {
  commentDraft: string;
  setCommentDraft: (value: string | ((prev: string) => string)) => void;
  commentSelectedGif: string | null;
  setCommentSelectedGif: (value: string | null) => void;
  commentGifPickerOpen: boolean;
  setCommentGifPickerOpen: (value: boolean) => void;
  commentEmojiAnchor: HTMLElement | null;
  setCommentEmojiAnchor: (value: HTMLElement | null) => void;
  onSubmit: () => void | Promise<void>;
  submittingComment: boolean;
};

const COMMENT_EMOJIS = ['😀', '😂', '😍', '🔥', '🙌', '🙏', '👍', '🎉', '💯'];

export const FeedCardCommentsComposer = ({
  commentDraft,
  setCommentDraft,
  commentSelectedGif,
  setCommentSelectedGif,
  commentGifPickerOpen,
  setCommentGifPickerOpen,
  commentEmojiAnchor,
  setCommentEmojiAnchor,
  onSubmit,
  submittingComment,
}: FeedCardCommentsComposerProps) => {
  const canSubmit =
    (commentDraft.trim().length > 0 || commentSelectedGif !== null) &&
    !submittingComment;

  return (
    <>
      <Stack
        spacing={1}
        sx={{
          mt: 1.25,
          p: 1,
          borderRadius: 1.5,
          border: '1px solid rgba(156,187,217,0.14)',
          bgcolor: 'rgba(8,13,22,0.48)',
        }}
      >
        {commentSelectedGif && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="img"
              src={commentSelectedGif}
              alt="GIF preview"
              sx={{
                maxWidth: 120,
                maxHeight: 90,
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />
            <IconButton
              size="small"
              onClick={() => setCommentSelectedGif(null)}
              aria-label="Remove GIF"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        {/* Comment field only — no actions inline */}
        <TextField
          size="small"
          multiline
          minRows={1}
          maxRows={8}
          placeholder="Add a comment…"
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          onKeyDown={(e) => {
            /* Enter = newline only; submit via Post button only. */
            if (e.key === 'Enter') {
              e.stopPropagation();
            }
          }}
          inputProps={{ spellCheck: false }}
          sx={{
            width: '100%',
            '& .MuiInputBase-root': {
              alignItems: 'flex-start',
              overflow: 'hidden',
              py: 0.5,
              px: 1,
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '& textarea': {
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              resize: 'none',
              minHeight: '1.5em',
              fontSize: { xs: '1rem', sm: '0.875rem' },
            },
          }}
        />
        {/* Action row: utility controls left, Post right */}
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          justifyContent="space-between"
          sx={{ minHeight: 32, minWidth: 0 }}
        >
          <Stack direction="row" spacing={0} alignItems="center">
            <Tooltip title="Attach file (coming soon)">
              <span>
                <IconButton
                  size="small"
                  aria-label="Attach file"
                  disabled
                  sx={{
                    color: 'text.secondary',
                    p: 0.5,
                    '& .MuiSvgIcon-root': { fontSize: 18 },
                  }}
                >
                  <AttachFileIcon />
                </IconButton>
              </span>
            </Tooltip>
            <IconButton
              size="small"
              aria-label="Add emoji"
              onClick={(e: MouseEvent<HTMLElement>) =>
                setCommentEmojiAnchor(e.currentTarget)
              }
              sx={{
                color: 'text.secondary',
                p: 0.5,
                '& .MuiSvgIcon-root': { fontSize: 18 },
              }}
            >
              <EmojiEmotionsOutlinedIcon />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Add GIF"
              onClick={() => setCommentGifPickerOpen(true)}
              sx={{
                color: 'text.secondary',
                p: 0.5,
                '& .MuiSvgIcon-root': { fontSize: 18 },
              }}
            >
              <GifBoxIcon />
            </IconButton>
          </Stack>
          <Button
            size="small"
            variant={canSubmit ? 'contained' : 'outlined'}
            onClick={() => void onSubmit()}
            disabled={!canSubmit}
            sx={{
              minWidth: 56,
              py: 0.375,
              px: 1.25,
              fontSize: '0.8125rem',
              textTransform: 'none',
              ...(canSubmit
                ? {}
                : {
                    borderColor: 'rgba(156,187,217,0.25)',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: 'rgba(156,187,217,0.4)',
                      bgcolor: 'rgba(56,132,210,0.06)',
                    },
                  }),
            }}
          >
            Post
          </Button>
        </Stack>
      </Stack>
      <GifPicker.GifPickerDialog
        open={commentGifPickerOpen}
        onClose={() => setCommentGifPickerOpen(false)}
        onPick={(url) => setCommentSelectedGif(url)}
        showContentFilter={false}
        maxHeight={280}
        cellHeight={90}
      />
      <Menu
        anchorEl={commentEmojiAnchor}
        open={Boolean(commentEmojiAnchor)}
        onClose={() => setCommentEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {COMMENT_EMOJIS.map((emoji) => (
          <MenuItem
            key={emoji}
            onClick={() => {
              setCommentDraft((prev) => `${prev}${emoji}`);
              setCommentEmojiAnchor(null);
            }}
            sx={{ fontSize: 22, lineHeight: 1 }}
          >
            {emoji}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
