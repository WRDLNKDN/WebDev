import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import GifBoxIcon from '@mui/icons-material/GifBox';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  getChatAttachmentRejectionReason,
  normalizeChatAttachmentMime,
} from '../../lib/chat/attachmentValidation';
import { getTrendingChatGifs, searchChatGifs } from '../../lib/chat/gifApi';
import type { GifContentFilter } from '../../lib/chat/gifApi';
import {
  CHAT_ALLOWED_ACCEPT,
  CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  CHAT_MAX_FILE_BYTES,
} from '../../types/chat';

const EXIF_STRIP_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

async function stripExifIfImage(file: File): Promise<Blob> {
  // Do not canvas-process GIFs; that strips animation.
  if (!EXIF_STRIP_MIMES.includes(file.type)) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => resolve(blob ?? file), file.type, 0.92);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

type MessageInputProps = {
  onSend: (content: string, attachmentPaths?: string[]) => void;
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
  const [gifQuery, setGifQuery] = useState('');
  const [gifLoading, setGifLoading] = useState(false);
  const [addingGif, setAddingGif] = useState(false);
  const [gifContentFilter, setGifContentFilter] =
    useState<GifContentFilter>('medium');
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [gifResults, setGifResults] = useState<
    Array<{
      id: string;
      title: string;
      previewUrl: string;
      gifUrl: string;
    }>
  >([]);
  const COMMON_EMOJIS = ['😀', '😂', '😍', '🔥', '🙌', '🙏', '👍', '🎉', '💯'];

  const loadTrendingGifs = async () => {
    setGifLoading(true);
    try {
      const results = await getTrendingChatGifs(24, gifContentFilter);
      setGifResults(results);
    } catch {
      setError('Could not load GIFs right now. Please try again.');
    } finally {
      setGifLoading(false);
    }
  };

  const handleOpenGifPicker = async () => {
    setGifPickerOpen(true);
    setGifQuery('');
    if (gifResults.length === 0) {
      await loadTrendingGifs();
    }
  };

  const handleGifSearch = async (
    query: string,
    contentFilter: GifContentFilter = gifContentFilter,
  ) => {
    setGifLoading(true);
    try {
      const results = query.trim()
        ? await searchChatGifs(query.trim(), 24, contentFilter)
        : await getTrendingChatGifs(24, contentFilter);
      setGifResults(results);
    } catch {
      setError('Could not search GIFs right now. Please try again.');
    } finally {
      setGifLoading(false);
    }
  };

  const handlePickGif = async (gifUrl: string, title: string) => {
    setAddingGif(true);
    setError(null);
    try {
      const res = await fetch(gifUrl);
      if (!res.ok) throw new Error('gif fetch failed');
      const blob = await res.blob();
      const safeTitle = (title || 'gif')
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
      setPendingFiles((prev) =>
        [...prev, file].slice(0, CHAT_MAX_ATTACHMENTS_PER_MESSAGE),
      );
      setGifPickerOpen(false);
    } catch {
      setError('Failed to add GIF. Please try another one.');
    } finally {
      setAddingGif(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || (!text.trim() && pendingFiles.length === 0)) return;

    setError(null);
    const paths: string[] = [];

    if (pendingFiles.length > 0) {
      setUploading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const basePath = `${session.user.id}/${Date.now()}`;

      for (
        let i = 0;
        i < Math.min(pendingFiles.length, CHAT_MAX_ATTACHMENTS_PER_MESSAGE);
        i++
      ) {
        const f = pendingFiles[i];
        const rejectionReason = getChatAttachmentRejectionReason(f);
        if (rejectionReason) {
          setError(rejectionReason);
          setUploading(false);
          return;
        }
        const mime = normalizeChatAttachmentMime(f);
        if (!mime) {
          setError('Unsupported attachment type.');
          setUploading(false);
          return;
        }
        const blob = await stripExifIfImage(f);
        if (blob.size > CHAT_MAX_FILE_BYTES) {
          setError(
            'File too large after processing. Maximum size is 6MB per file.',
          );
          setUploading(false);
          return;
        }
        const ext = f.name.split('.').pop() || 'bin';
        const path = `${basePath}_${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('chat-attachments')
          .upload(path, blob, { contentType: mime });

        if (uploadErr) {
          setError('File upload failed. Please try again.');
          setUploading(false);
          return;
        }
        paths.push(path);
      }
      setPendingFiles([]);
      setUploading(false);
    }

    onSend(text.trim(), paths.length > 0 ? paths : undefined);
    setText('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const valid: File[] = [];
    const rejectedReasons: string[] = [];
    files.forEach((f) => {
      const rejectionReason = getChatAttachmentRejectionReason(f);
      if (rejectionReason) {
        rejectedReasons.push(`${f.name}: ${rejectionReason}`);
        return;
      }
      valid.push(f);
    });

    if (rejectedReasons.length > 0) {
      setError(rejectedReasons[0]);
    }
    setPendingFiles((prev) =>
      [...prev, ...valid].slice(0, CHAT_MAX_ATTACHMENTS_PER_MESSAGE),
    );
    e.target.value = '';
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 2,
        borderTop: '1px solid rgba(255,255,255,0.1)',
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
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={CHAT_ALLOWED_ACCEPT}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          aria-label="Attach file"
          sx={{ color: 'rgba(255,255,255,0.75)' }}
        >
          <AttachFileIcon />
        </IconButton>
        <IconButton
          onClick={(e) => setEmojiAnchor(e.currentTarget)}
          disabled={disabled || uploading}
          aria-label="Add emoji"
          sx={{ color: 'rgba(255,255,255,0.75)' }}
        >
          <EmojiEmotionsOutlinedIcon />
        </IconButton>
        <IconButton
          onClick={() => void handleOpenGifPicker()}
          disabled={disabled || uploading || pendingFiles.length >= 5}
          aria-label="Add GIF"
          sx={{ color: 'rgba(255,255,255,0.75)' }}
        >
          <GifBoxIcon />
        </IconButton>
        <TextField
          multiline
          maxRows={4}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          onBlur={() => onStopTyping?.()}
          placeholder="Type a message…"
          disabled={disabled || uploading}
          size="small"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(17,24,39,0.68)',
              color: 'white',
              borderRadius: 2,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
            },
          }}
          inputProps={{ 'aria-label': 'Message' }}
        />
        <IconButton
          type="submit"
          disabled={
            disabled || uploading || (!text.trim() && pendingFiles.length === 0)
          }
          aria-label="Send message"
          sx={{ color: 'primary.main' }}
        >
          <SendIcon />
        </IconButton>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ alignSelf: 'flex-end', pr: 1 }}
      >
        Press Enter to Send
      </Typography>

      <Dialog
        open={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>Choose a GIF</DialogTitle>
        <DialogContent>
          <TextField
            size="small"
            fullWidth
            value={gifQuery}
            onChange={(e) => setGifQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleGifSearch(gifQuery);
              }
            }}
            placeholder="Search GIFs"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    onClick={() => void handleGifSearch(gifQuery)}
                    disabled={gifLoading}
                  >
                    Search
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1.5 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Content:
            </Typography>
            <Button
              size="small"
              variant={gifContentFilter === 'low' ? 'contained' : 'text'}
              onClick={() => {
                setGifContentFilter('low');
                void handleGifSearch(gifQuery, 'low');
              }}
            >
              G
            </Button>
            <Button
              size="small"
              variant={gifContentFilter === 'medium' ? 'contained' : 'text'}
              onClick={() => {
                setGifContentFilter('medium');
                void handleGifSearch(gifQuery, 'medium');
              }}
            >
              PG-13
            </Button>
            <Button
              size="small"
              variant={gifContentFilter === 'high' ? 'contained' : 'text'}
              onClick={() => {
                setGifContentFilter('high');
                void handleGifSearch(gifQuery, 'high');
              }}
            >
              Strict
            </Button>
          </Box>
          {gifLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 1,
                maxHeight: 360,
                overflowY: 'auto',
              }}
            >
              {gifResults.map((gif) => (
                <Box
                  key={gif.id}
                  component="button"
                  type="button"
                  onClick={() => void handlePickGif(gif.gifUrl, gif.title)}
                  disabled={addingGif}
                  sx={{
                    p: 0,
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    bgcolor: 'black',
                  }}
                >
                  <Box
                    component="img"
                    src={gif.previewUrl}
                    alt={gif.title || 'GIF'}
                    sx={{
                      width: '100%',
                      height: 110,
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            Powered by{' '}
            <Box
              component="a"
              href="https://tenor.com"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'primary.main' }}
            >
              Tenor
            </Box>
          </Typography>
        </DialogContent>
      </Dialog>
      <Menu
        anchorEl={emojiAnchor}
        open={Boolean(emojiAnchor)}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {COMMON_EMOJIS.map((emoji) => (
          <MenuItem
            key={emoji}
            onClick={() => {
              setText((prev) => `${prev}${emoji}`);
              setEmojiAnchor(null);
            }}
            sx={{ fontSize: 22, lineHeight: 1 }}
          >
            {emoji}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
