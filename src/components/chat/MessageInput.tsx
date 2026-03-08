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
import { useRef, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  getChatAttachmentRejectionReason,
  normalizeChatAttachmentMime,
} from '../../lib/chat/attachmentValidation';
import { GifPickerDialog } from './GifPickerDialog';
import {
  type ChatAttachmentMeta,
  CHAT_ALLOWED_ACCEPT,
  CHAT_MAX_FILE_BYTES,
} from '../../types/chat';
import { toMessage } from '../../lib/utils/errors';

const EXIF_STRIP_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const INPUT_SEPARATOR_GREEN = '#1DB954';

const QUICK_SEND: { content: string; label: string; ariaLabel: string }[] = [
  { content: '😊', label: '😊', ariaLabel: 'Send smile' },
  { content: '👍', label: '👍', ariaLabel: 'Send thumbs up' },
  { content: 'Thank you', label: 'Thank you', ariaLabel: 'Send thank you' },
];

const STRIP_EXIF_TIMEOUT_MS = 10_000;

async function stripExifIfImage(file: File): Promise<Blob> {
  // Do not canvas-process GIFs; that strips animation.
  if (!EXIF_STRIP_MIMES.includes(file.type)) return file;
  return new Promise((resolve) => {
    let settled = false;
    const done = (blob: Blob) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    const img = new Image();
    const url = URL.createObjectURL(file);
    const timeoutId = window.setTimeout(
      () => done(file),
      STRIP_EXIF_TIMEOUT_MS,
    );
    img.onload = () => {
      window.clearTimeout(timeoutId);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        done(file);
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => done(blob ?? file), file.type, 0.92);
    };
    img.onerror = () => {
      window.clearTimeout(timeoutId);
      done(file);
    };
    img.src = url;
  });
}

type MessageInputProps = {
  onSend: (
    content: string,
    attachmentPaths?: string[],
    attachmentMeta?: ChatAttachmentMeta[],
  ) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
};

export const MessageInput = ({
  onSend,
  onTyping,
  onStopTyping,
  disabled,
}: MessageInputProps) => {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handlePickGif = async (gifUrl: string, title?: string) => {
    setError(null);
    try {
      const res = await fetch(gifUrl);
      if (!res.ok) throw new Error('gif fetch failed');
      const blob = await res.blob();
      const safeTitle = (title ?? 'gif')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .slice(0, 40);
      const file = new File([blob], `${safeTitle || 'gif'}.gif`, {
        type: 'image/gif',
      });
      const rejectionReason = getChatAttachmentRejectionReason(file);
      if (rejectionReason) {
        setError(rejectionReason);
        return;
      }
      setPendingFiles([file]);
    } catch {
      setError("We couldn't add that GIF. Please try another one.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || (!text.trim() && pendingFiles.length === 0)) return;

    setError(null);
    const paths: string[] = [];
    const meta: ChatAttachmentMeta[] = [];

    if (pendingFiles.length > 0) {
      const f = pendingFiles[0];
      const rejectionReason = getChatAttachmentRejectionReason(f);
      if (rejectionReason) {
        setError(rejectionReason);
        return;
      }
      const mime = normalizeChatAttachmentMime(f);
      if (!mime) {
        setError(
          'Unsupported attachment type. Please upload PDF, DOC, DOCX, JPG, PNG, GIF, or WEBP.',
        );
        return;
      }

      setUploading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setError('You need to sign in to upload attachments.');
          return;
        }

        const basePath = `${session.user.id}/${Date.now()}`;

        const blob = await stripExifIfImage(f);
        if (blob.size > CHAT_MAX_FILE_BYTES) {
          setError('File must be 2MB or smaller.');
          return;
        }
        const ext = f.name.split('.').pop() || 'bin';
        const path = `${basePath}_0.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('chat-attachments')
          .upload(path, blob, { contentType: mime });

        if (uploadErr) {
          setError(toMessage(uploadErr));
          return;
        }
        paths.push(path);
        meta.push({ path, mime, size: blob.size });
        setPendingFiles([]);
      } finally {
        setUploading(false);
      }
    }

    onSend(
      text.trim(),
      paths.length > 0 ? paths : undefined,
      meta.length > 0 ? meta : undefined,
    );
    setText('');
  };

  const handleEmojiClick = (data: EmojiClickData) => {
    setText((prev) => `${prev}${data.emoji}`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (files.length > 1) {
      setError('Only one file per message.');
      e.target.value = '';
      return;
    }

    const f = files[0];
    const rejectionReason = getChatAttachmentRejectionReason(f);
    if (rejectionReason) {
      setError(rejectionReason);
      e.target.value = '';
      return;
    }
    setPendingFiles([f]);
    e.target.value = '';
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        borderTop: `2px solid ${INPUT_SEPARATOR_GREEN}`,
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
                bgcolor: 'rgba(255,255,255,0.08)',
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
                ×
              </Box>
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5 }}>
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
                // Double-defer so submit runs in a separate macrotask from keydown (avoids violation)
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
          placeholder="Write a message…"
          disabled={disabled || uploading}
          size="small"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(40,44,52,0.9)',
              color: 'white',
              borderRadius: 1.5,
              minHeight: 40,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
            },
          }}
          inputProps={{ 'aria-label': 'Message', title: 'Type a message' }}
        />
        <Tooltip title={expanded ? 'Collapse input' : 'Expand input'}>
          <IconButton
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse input' : 'Expand input'}
            sx={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}
          >
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept={CHAT_ALLOWED_ACCEPT}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.7rem', opacity: 0.85 }}
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
                sx={{ color: INPUT_SEPARATOR_GREEN, p: 0.75 }}
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
              '& .EmojiPickerReact': {
                '--epr-bg-color': 'rgba(40,44,52,0.98)',
              },
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
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
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
            {QUICK_SEND.map(({ content, label, ariaLabel }) => (
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
                  borderColor: 'rgba(255,255,255,0.3)',
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
};
