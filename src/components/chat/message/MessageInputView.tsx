import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import GifBoxIcon from '@mui/icons-material/GifBox';
import ImageIcon from '@mui/icons-material/Image';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EmojiPicker, {
  Theme as EmojiTheme,
  type EmojiClickData,
} from 'emoji-picker-react';
import { GifPickerDialog } from '../dialogs/GifPickerDialog';

type QuickSend = { content: string; label: string; ariaLabel: string };

type MessageInputViewProps = {
  text: string;
  setText: (value: string) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  disabled?: boolean;
  uploading: boolean;
  pendingFiles: File[];
  setPendingFiles: (updater: (prev: File[]) => File[]) => void;
  error: string | null;
  onStopTyping?: () => void;
  onTyping?: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  gifPickerOpen: boolean;
  setGifPickerOpen: (open: boolean) => void;
  handlePickGif: (gifUrl: string, title?: string) => Promise<void>;
  emojiAnchor: HTMLElement | null;
  setEmojiAnchor: (anchor: HTMLElement | null) => void;
  handleEmojiClick: (data: EmojiClickData) => void;
  quickSend: QuickSend[];
  onSend: (content: string) => void;
  inputSeparatorGreen: string;
  allowedAccept: string;
};

export const MessageInputView = ({
  text,
  setText,
  expanded,
  setExpanded,
  disabled,
  uploading,
  pendingFiles,
  setPendingFiles,
  error,
  onStopTyping,
  onTyping,
  handleSubmit,
  handleFileSelect,
  fileInputRef,
  gifPickerOpen,
  setGifPickerOpen,
  handlePickGif,
  emojiAnchor,
  setEmojiAnchor,
  handleEmojiClick,
  quickSend,
  onSend,
  inputSeparatorGreen,
  allowedAccept,
}: MessageInputViewProps) => (
  <Box
    component="form"
    onSubmit={handleSubmit}
    data-testid="chat-message-input-shell"
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0.75,
      borderTop: `2px solid ${inputSeparatorGreen}`,
      p: 1.25,
      bgcolor: 'rgba(54,58,66,0.95)',
    }}
  >
    {error && <Box sx={{ fontSize: 12, color: 'error.main' }}>{error}</Box>}
    {pendingFiles.length > 0 && (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {pendingFiles.map((f, i) => (
          <Box
            key={`${f.name}-${i}`}
            sx={{
              fontSize: 12,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: 'rgba(156,187,217,0.18)',
            }}
          >
            {f.name}{' '}
            <Box
              component="button"
              type="button"
              onClick={() =>
                setPendingFiles((prev) => prev.filter((_, j) => j !== i))
              }
              sx={{ cursor: 'pointer', color: 'error.main', ml: 0.5 }}
            >
              x
            </Box>
          </Box>
        ))}
      </Box>
    )}

    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 0.5,
      }}
    >
      <TextField
        multiline
        maxRows={expanded ? 6 : 2}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const form = e.currentTarget.closest('form');
            if (form) {
              setTimeout(() => form.requestSubmit(), 0);
            } else {
              setTimeout(
                () => void handleSubmit(e as unknown as React.FormEvent),
                0,
              );
            }
          }
        }}
        onBlur={() => onStopTyping?.()}
        placeholder="Write a message..."
        disabled={disabled || uploading}
        size="small"
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(40,44,52,0.9)',
            color: 'white',
            borderRadius: 1.5,
            minHeight: 40,
            '& fieldset': { borderColor: 'rgba(156,187,217,0.30)' },
            '&:hover fieldset': { borderColor: 'rgba(141,188,229,0.42)' },
          },
        }}
        inputProps={{ 'aria-label': 'Message', title: 'Type a message' }}
      />
      <Tooltip title={expanded ? 'Collapse input' : 'Expand input'}>
        <IconButton
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse input' : 'Expand input'}
          sx={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}
        >
          <KeyboardArrowUpIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>

    <Box
      data-testid="chat-message-toolbar"
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 0.75,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedAccept}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <Tooltip title="Attach image">
          <span>
            <IconButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              aria-label="Attach image"
              sx={{ color: 'rgba(255,255,255,0.75)', p: 0.75 }}
            >
              <ImageIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Attach file">
          <span>
            <IconButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              aria-label="Attach file"
              sx={{ color: 'rgba(255,255,255,0.75)', p: 0.75 }}
            >
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Add GIF">
          <span>
            <IconButton
              type="button"
              onClick={() => setGifPickerOpen(true)}
              disabled={disabled || uploading || pendingFiles.length >= 1}
              aria-label="Add GIF"
              sx={{ color: 'rgba(255,255,255,0.75)', p: 0.75 }}
            >
              <GifBoxIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Add emoji">
          <IconButton
            type="button"
            onClick={(e) => setEmojiAnchor(e.currentTarget)}
            disabled={disabled || uploading}
            aria-label="Add emoji"
            sx={{ color: 'rgba(255,255,255,0.75)', p: 0.75 }}
          >
            <EmojiEmotionsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          ml: { xs: 'auto', sm: 0 },
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'space-between', sm: 'flex-end' },
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontSize: '0.7rem',
            opacity: 0.85,
            display: { xs: 'none', sm: 'inline' },
          }}
        >
          Press Enter to Send
        </Typography>
        <Tooltip title="More options">
          <IconButton
            type="button"
            aria-label="More options"
            sx={{ color: 'rgba(255,255,255,0.65)', p: 0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Send message">
          <span>
            <IconButton
              type="submit"
              disabled={
                disabled ||
                uploading ||
                (!text.trim() && pendingFiles.length === 0)
              }
              aria-label="Send message"
              sx={{ color: inputSeparatorGreen, p: 0.75 }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>

    <GifPickerDialog
      open={gifPickerOpen}
      onClose={() => setGifPickerOpen(false)}
      onPick={(url, title) => void handlePickGif(url, title)}
    />

    <Popover
      anchorEl={emojiAnchor}
      open={Boolean(emojiAnchor)}
      onClose={() => setEmojiAnchor(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            zIndex: 1500,
            overflow: 'visible',
            borderRadius: 2,
            bgcolor: 'rgba(40,44,52,0.98)',
          },
        },
      }}
      sx={{ zIndex: 1500 }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            '& .EmojiPickerReact': { '--epr-bg-color': 'rgba(40,44,52,0.98)' },
          }}
        >
          <EmojiPicker
            theme={EmojiTheme.DARK}
            width={340}
            height={380}
            searchPlaceholder="Search emoji"
            onEmojiClick={handleEmojiClick}
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
          />
        </Box>
        <Divider sx={{ borderColor: 'rgba(156,187,217,0.26)' }} />
        <Box
          sx={{
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ width: '100%', fontSize: '0.7rem' }}
          >
            Send as message
          </Typography>
          {quickSend.map(({ content, label, ariaLabel }) => (
            <Button
              key={content}
              type="button"
              size="small"
              variant="outlined"
              onClick={() => {
                if (!disabled) onSend(content);
                setEmojiAnchor(null);
              }}
              aria-label={ariaLabel}
              sx={{
                minWidth: 0,
                borderColor: 'rgba(141,188,229,0.50)',
                color: 'text.primary',
                textTransform: 'none',
              }}
            >
              {label}
            </Button>
          ))}
        </Box>
      </Box>
    </Popover>
  </Box>
);
