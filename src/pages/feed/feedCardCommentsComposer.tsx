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
}: FeedCardCommentsComposerProps) => (
  <>
    <Stack spacing={1} sx={{ mt: 1 }}>
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
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          placeholder="Add a comment…"
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void onSubmit();
            }
          }}
          sx={{ flex: 1 }}
        />
        <Tooltip title="Attach file (coming soon)">
          <span>
            <IconButton
              size="small"
              aria-label="Attach file"
              disabled
              sx={{ color: 'text.secondary' }}
            >
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <IconButton
          size="small"
          aria-label="Add emoji"
          onClick={(e: MouseEvent<HTMLElement>) =>
            setCommentEmojiAnchor(e.currentTarget)
          }
          sx={{ color: 'text.secondary' }}
        >
          <EmojiEmotionsOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Add GIF"
          onClick={() => setCommentGifPickerOpen(true)}
          sx={{ color: 'text.secondary' }}
        >
          <GifBoxIcon fontSize="small" />
        </IconButton>
        <Button
          size="small"
          variant="contained"
          onClick={() => void onSubmit()}
          disabled={
            (!commentDraft.trim() && !commentSelectedGif) || submittingComment
          }
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
