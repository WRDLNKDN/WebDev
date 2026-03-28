import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import GifBoxIcon from '@mui/icons-material/GifBox';
import ImageIcon from '@mui/icons-material/Image';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { EmojiClickData, Theme } from 'emoji-picker-react';
import { supabase } from '../../../lib/auth/supabaseClient';
import {
  getChatAttachmentRejectionReason,
  normalizeChatAttachmentMime,
} from '../../../lib/chat/attachmentValidation';
import { getChatAttachmentProcessingPlan } from '../../../lib/chat/attachmentProcessing';
import { processChatGifUpload } from '../../../lib/api/chatAttachmentsApi';
import { GifPickerDialog } from '../dialogs/GifPickerDialog';
import {
  type ChatAttachmentMeta,
  CHAT_ALLOWED_ACCEPT,
} from '../../../types/chat';
import { toMessage } from '../../../lib/utils/errors';
import {
  MentionAutocomplete,
  type MentionableUser,
} from './MentionAutocomplete';

const EXIF_STRIP_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const INPUT_SEPARATOR_GREEN = '#1DB954';

const QUICK_SEND: { content: string; label: string; ariaLabel: string }[] = [
  { content: '😊', label: '😊', ariaLabel: 'Send smile' },
  { content: '👍', label: '👍', ariaLabel: 'Send thumbs up' },
  { content: 'Thank you', label: 'Thank you', ariaLabel: 'Send thank you' },
];

const STRIP_EXIF_TIMEOUT_MS = 10_000;

export type MessageReplyDraft = {
  id: string;
  authorLabel: string;
  contentSnippet: string;
};

const EmojiPicker = lazy(async () => {
  const mod = await import('emoji-picker-react');
  return { default: mod.default };
});

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
    options?: { replyToMessageId?: string | null },
  ) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  sending?: boolean;
  /** Group members for @mention autocomplete (only used in group chats) */
  groupMembers?: MentionableUser[];
  /** Current user ID to exclude from mention suggestions */
  currentUserId?: string;
  /** Room type to determine if mentions are enabled */
  roomType?: 'dm' | 'group';
  /** Room ID - used to clear draft state when switching threads */
  roomId?: string | null;
  /** When set, composer is in reply mode (Discord-style thread reply). */
  replyTo?: MessageReplyDraft | null;
  onCancelReply?: () => void;
};

export const MessageInput = ({
  onSend,
  onTyping,
  onStopTyping,
  disabled,
  sending = false,
  groupMembers = [],
  currentUserId,
  roomType = 'dm',
  roomId,
  replyTo = null,
  onCancelReply,
}: MessageInputProps) => {
  const theme = useTheme();
  const isNarrowViewport = useMediaQuery(theme.breakpoints.down('sm'));
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const removePendingFileAtIndex = useCallback((indexToRemove: number) => {
    setPendingFiles((prev) => {
      const next = prev.filter((_, j) => j !== indexToRemove);
      if (next.length === 0) {
        setError(null);
        setProcessingMessage(null);
      }
      return next;
    });
  }, []);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mentionState, setMentionState] = useState<{
    open: boolean;
    query: string;
    anchorEl: HTMLElement | null;
    startPos: number;
  }>({
    open: false,
    query: '',
    anchorEl: null,
    startPos: 0,
  });

  // Clear draft state when switching between chat threads to prevent
  // accidentally sending messages to the wrong recipient
  useEffect(() => {
    setText('');
    setError(null);
    setProcessingMessage(null);
    setPendingFiles([]);
    setMentionState({
      open: false,
      query: '',
      anchorEl: null,
      startPos: 0,
    });
    // Clear file input if it exists
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Directly clear the message input field to ensure it's cleared immediately
    // This handles edge cases where state updates might be batched or delayed
    if (messageInputRef.current) {
      if (
        messageInputRef.current instanceof HTMLInputElement ||
        messageInputRef.current instanceof HTMLTextAreaElement
      ) {
        messageInputRef.current.value = '';
      }
    }
  }, [roomId]);

  useEffect(() => {
    if (replyTo) {
      requestAnimationFrame(() => {
        const el = messageInputRef.current;
        if (el && 'focus' in el) (el as HTMLTextAreaElement).focus();
      });
    }
  }, [replyTo]);

  const submitBlocked =
    disabled ||
    sending ||
    uploading ||
    (!text.trim() && pendingFiles.length === 0);

  const handlePickGif = async (gifUrl: string, title?: string) => {
    setError(null);
    setProcessingMessage(null);
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
      const plan = getChatAttachmentProcessingPlan(file);
      setProcessingMessage(plan.accepted ? plan.helperText : null);
      setPendingFiles([file]);
    } catch {
      setProcessingMessage(null);
      setError("We couldn't add that GIF. Please try another one.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitBlocked) return;

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
        const plan = getChatAttachmentProcessingPlan({
          size: f.size,
          type: mime,
        });
        if (!plan.accepted) {
          setError(plan.reason);
          return;
        }
        if (plan.mode === 'gif_processing') {
          setProcessingMessage('Optimizing GIF...');
          setError(null); // Clear any previous errors when starting processing
          try {
            const processed = await processChatGifUpload({
              file: f,
              accessToken: session.access_token,
            });
            paths.push(processed.path);
            meta.push({
              path: processed.path,
              mime: processed.mime,
              size: processed.size,
            });
          } catch (gifError) {
            setProcessingMessage(null);
            const errorMsg = toMessage(gifError);
            if (errorMsg.includes('too large') || errorMsg.includes('413')) {
              setError('This GIF is too large to process. Try a smaller file.');
            } else {
              setError(errorMsg || 'Failed to optimize GIF. Please try again.');
            }
            setPendingFiles([]); // Clear pending files on error so user can try again
            setUploading(false);
            return;
          }
        } else {
          setProcessingMessage(plan.helperText || 'Uploading attachment...');
          setError(null); // Clear any previous errors when starting upload
          const blob = await stripExifIfImage(f);
          const ext = f.name.split('.').pop() || 'bin';
          const path = `${basePath}_0.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from('chat-attachments')
            .upload(path, blob, { contentType: mime });

          if (uploadErr) {
            setProcessingMessage(null);
            setError(toMessage(uploadErr));
            setPendingFiles([]); // Clear pending files on error
            setUploading(false);
            return;
          }
          paths.push(path);
          meta.push({ path, mime, size: blob.size });
        }
        setPendingFiles([]);
        setProcessingMessage(null);
      } catch (cause) {
        setProcessingMessage(null);
        setError(toMessage(cause));
        return;
      } finally {
        setUploading(false);
      }
    }

    onSend(
      text.trim(),
      paths.length > 0 ? paths : undefined,
      meta.length > 0 ? meta : undefined,
      { replyToMessageId: replyTo?.id ?? null },
    );
    setText('');
    onCancelReply?.();
    setProcessingMessage(null);
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  };

  const handleEmojiClick = (data: EmojiClickData) => {
    setText((prev) => `${prev}${data.emoji}`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';

    if (files.length === 0) return;

    // Clear any previous attachment error as soon as the user makes a new selection,
    // so that choosing a valid file after an invalid one clears the message immediately.
    setError(null);
    setProcessingMessage(null);

    if (files.length > 1) {
      setError('Only one file per message.');
      return;
    }

    const f = files[0];
    const rejectionReason = getChatAttachmentRejectionReason(f);
    if (rejectionReason) {
      setError(rejectionReason);
      setProcessingMessage(null);
      return;
    }

    // Get normalized MIME type for processing plan
    const mime = normalizeChatAttachmentMime(f);
    if (!mime) {
      setError(
        'Unsupported attachment type. Please upload PDF, DOC, DOCX, JPG, PNG, GIF, or WEBP.',
      );
      setProcessingMessage(null);
      return;
    }

    // Get processing plan to show appropriate helper text
    const plan = getChatAttachmentProcessingPlan({
      size: f.size,
      type: mime,
    });

    // Set helper text if available (e.g., "Large GIF detected. It will be optimized before attaching.")
    if (plan.accepted && plan.helperText) {
      setProcessingMessage(plan.helperText);
    } else {
      setProcessingMessage(null);
    }

    setPendingFiles([f]);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      data-testid="chat-message-input-shell"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.65,
        borderTop: (t) =>
          `1px solid ${alpha(t.palette.primary.main, t.palette.mode === 'light' ? 0.22 : 0.35)}`,
        p: { xs: 1.1, sm: 1.2 },
        pb: `max(10px, calc(0.625rem + env(safe-area-inset-bottom, 0px)))`,
        bgcolor: (t) =>
          t.palette.mode === 'light'
            ? alpha(t.palette.background.paper, 0.97)
            : 'rgba(40,44,52,0.97)',
        minWidth: 0,
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      {replyTo ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            pl: 1,
            pr: 0.5,
            py: 0.75,
            borderRadius: 1,
            borderLeft: '3px solid',
            borderColor: 'primary.light',
            bgcolor: 'rgba(56,132,210,0.12)',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" component="p">
              Replying to {replyTo.authorLabel}
            </Typography>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{
                opacity: 0.9,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {replyTo.contentSnippet}
            </Typography>
          </Box>
          <Tooltip title="Cancel reply">
            <IconButton
              type="button"
              size="small"
              aria-label="Cancel reply"
              onClick={() => onCancelReply?.()}
              sx={{ color: 'rgba(255,255,255,0.85)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : null}
      {error && <Box sx={{ fontSize: 12, color: 'error.main' }}>{error}</Box>}
      {processingMessage && !error ? (
        <Box
          sx={{
            fontSize: 11,
            lineHeight: 1.4,
            color: (t) =>
              alpha(
                t.palette.text.secondary,
                t.palette.mode === 'light' ? 0.95 : 0.85,
              ),
          }}
        >
          {processingMessage}
        </Box>
      ) : null}
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
                onClick={() => removePendingFileAtIndex(i)}
                sx={{ cursor: 'pointer', color: 'error.main', ml: 0.5 }}
              >
                ×
              </Box>
            </Box>
          ))}
        </Box>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'flex-end' },
          gap: 0.5,
          minWidth: 0,
          width: '100%',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <TextField
          inputRef={messageInputRef}
          multiline
          maxRows={expanded ? 6 : 2}
          value={text}
          onChange={(e) => {
            const newValue = e.target.value;
            setText(newValue);
            onTyping?.();

            // Handle @mention detection (group chats; autocomplete lists members with handles)
            if (roomType === 'group') {
              const cursorPos = e.target.selectionStart ?? newValue.length;
              const textBeforeCursor = newValue.slice(0, cursorPos);
              const lastAt = textBeforeCursor.lastIndexOf('@');

              if (
                lastAt >= 0 &&
                (lastAt === 0 ||
                  /\s/.test(textBeforeCursor[lastAt - 1]) ||
                  textBeforeCursor[lastAt - 1] === '\n')
              ) {
                const query = textBeforeCursor.slice(lastAt + 1);
                // Check if we're still in a mention (no space or newline after @)
                if (!query.includes(' ') && !query.includes('\n')) {
                  const inputEl = e.target;
                  setMentionState({
                    open: true,
                    query,
                    anchorEl: inputEl,
                    startPos: lastAt,
                  });
                  return;
                }
              }
            }
            setMentionState((prev) => ({ ...prev, open: false }));
          }}
          onKeyDown={(e) => {
            // Close mention autocomplete on Escape
            if (e.key === 'Escape' && mentionState.open) {
              e.preventDefault();
              setMentionState((prev) => ({ ...prev, open: false }));
              return;
            }

            /* Desktop: Enter sends; Shift+Enter newline. Mobile: Enter always newline — use send button (virtual keyboards). */
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !mentionState.open &&
              !isNarrowViewport
            ) {
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
          onBlur={(e) => {
            // Delay closing to allow click on autocomplete; capture target — React clears
            // `e.currentTarget` before this timeout runs.
            const root = e.currentTarget;
            setTimeout(() => {
              if (!root?.contains(document.activeElement)) {
                setMentionState((prev) => ({ ...prev, open: false }));
                onStopTyping?.();
              }
            }, 200);
          }}
          placeholder="Write a message…"
          disabled={disabled || uploading}
          size="small"
          fullWidth
          sx={{
            flex: 1,
            minWidth: 0,
            '& .MuiOutlinedInput-root': {
              bgcolor: (t) =>
                t.palette.mode === 'light'
                  ? alpha(t.palette.common.black, 0.04)
                  : 'rgba(40,44,52,0.9)',
              color: 'text.primary',
              borderRadius: 1.75,
              minHeight: { xs: 48, sm: 40 },
              alignItems: expanded ? 'flex-start' : 'center',
              '& fieldset': {
                borderColor: (t) =>
                  alpha(
                    t.palette.divider,
                    t.palette.mode === 'light' ? 0.9 : 1,
                  ),
              },
              '&:hover fieldset': {
                borderColor: (t) =>
                  alpha(
                    t.palette.primary.main,
                    t.palette.mode === 'light' ? 0.35 : 0.45,
                  ),
              },
            },
            /* 16px on narrow viewports avoids iOS Safari zoom-on-focus */
            '& .MuiInputBase-input': { fontSize: { xs: '1rem' } },
          }}
          inputProps={{
            'aria-label': 'Message',
            title: 'Type a message',
            spellCheck: false,
          }}
        />
        <Tooltip title={expanded ? 'Collapse input' : 'Expand input'}>
          <IconButton
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse input' : 'Expand input'}
            sx={{
              color: (t) =>
                alpha(
                  t.palette.text.primary,
                  t.palette.mode === 'light' ? 0.55 : 0.7,
                ),
              flexShrink: 0,
              alignSelf: { xs: 'flex-end', sm: 'auto' },
            }}
          >
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        data-testid="chat-message-toolbar"
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 0.5,
          minWidth: 0,
          width: '100%',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            minWidth: 0,
            flexWrap: 'wrap',
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={CHAT_ALLOWED_ACCEPT}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <Tooltip title="Attach image or GIF">
            <span>
              <IconButton
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || sending || uploading}
                aria-label="Attach image or GIF"
                sx={{
                  color: (t) =>
                    alpha(
                      t.palette.text.primary,
                      t.palette.mode === 'light' ? 0.62 : 0.75,
                    ),
                  p: 0.75,
                }}
              >
                <ImageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Attach document or file (PDF, Word, text)">
            <span>
              <IconButton
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || sending || uploading}
                aria-label="Attach document or file"
                sx={{
                  color: (t) =>
                    alpha(
                      t.palette.text.primary,
                      t.palette.mode === 'light' ? 0.62 : 0.75,
                    ),
                  p: 0.75,
                }}
              >
                <AttachFileIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Add GIF. GIF files up to 6MB are supported.">
            <span>
              <IconButton
                type="button"
                onClick={() => setGifPickerOpen(true)}
                disabled={
                  disabled || sending || uploading || pendingFiles.length >= 1
                }
                aria-label="Add GIF"
                sx={{
                  color: (t) =>
                    alpha(
                      t.palette.text.primary,
                      t.palette.mode === 'light' ? 0.62 : 0.75,
                    ),
                  p: 0.75,
                }}
              >
                <GifBoxIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Add emoji">
            <IconButton
              type="button"
              onClick={(e) => setEmojiAnchor(e.currentTarget)}
              disabled={disabled || sending || uploading}
              aria-label="Add emoji"
              sx={{
                color: (t) =>
                  alpha(
                    t.palette.text.primary,
                    t.palette.mode === 'light' ? 0.62 : 0.75,
                  ),
                p: 0.75,
              }}
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
            minWidth: 0,
            width: { xs: '100%', sm: 'auto' },
            ml: { xs: 0, sm: 0 },
            flexWrap: 'wrap',
            justifyContent: { xs: 'space-between', sm: 'flex-end' },
          }}
        >
          {isNarrowViewport ? (
            <Tooltip
              title={expanded ? 'Collapse composer options' : 'More options'}
            >
              <IconButton
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-label="More options"
                sx={{
                  color: (t) =>
                    alpha(
                      t.palette.text.primary,
                      t.palette.mode === 'light' ? 0.62 : 0.75,
                    ),
                  p: 0.75,
                }}
              >
                <MoreHorizIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.68rem',
              opacity: 0.72,
              display: 'inline',
              maxWidth: { xs: '42%', sm: 'none' },
              lineHeight: 1.35,
            }}
          >
            {isNarrowViewport
              ? 'Tap send — Enter adds a line'
              : 'Enter to send · Shift+Enter newline'}
          </Typography>
          <Tooltip title="Send message">
            <span>
              <IconButton
                type="submit"
                disabled={submitBlocked}
                aria-label="Send message"
                sx={{
                  color: INPUT_SEPARATOR_GREEN,
                  p: 0.75,
                  minWidth: { xs: 44, sm: 40 },
                  minHeight: { xs: 44, sm: 40 },
                  touchAction: 'manipulation',
                }}
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
      {roomType === 'group' && (
        <MentionAutocomplete
          open={mentionState.open}
          query={mentionState.query}
          users={groupMembers}
          currentUserId={currentUserId}
          anchorEl={mentionState.anchorEl}
          onSelect={(user) => {
            const input = messageInputRef.current;
            if (!input) return;

            const beforeMention = text.slice(0, mentionState.startPos);
            const afterCursor = text.slice(
              mentionState.startPos + 1 + mentionState.query.length,
            );
            const mentionText = `@${user.handle}`;
            const newText = `${beforeMention}${mentionText} ${afterCursor}`;

            setText(newText);
            setMentionState((prev) => ({ ...prev, open: false }));

            // Set cursor after the mention
            requestAnimationFrame(() => {
              if (
                input instanceof HTMLInputElement ||
                input instanceof HTMLTextAreaElement
              ) {
                const newPos = beforeMention.length + mentionText.length + 1;
                input.setSelectionRange(newPos, newPos);
                input.focus();
              }
            });
          }}
          onClose={() => setMentionState((prev) => ({ ...prev, open: false }))}
        />
      )}
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
            {emojiAnchor ? (
              <Suspense
                fallback={
                  <Box
                    sx={{
                      width: { xs: 'min(320px, 82vw)', sm: 340 },
                      height: 380,
                      bgcolor: 'rgba(40,44,52,0.98)',
                    }}
                  />
                }
              >
                <EmojiPicker
                  theme={'dark' as Theme}
                  width={
                    typeof window !== 'undefined'
                      ? Math.min(340, Math.max(260, window.innerWidth - 48))
                      : 340
                  }
                  height={380}
                  searchPlaceholder="Search emoji"
                  onEmojiClick={handleEmojiClick}
                  previewConfig={{ showPreview: false }}
                  lazyLoadEmojis
                />
              </Suspense>
            ) : null}
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
};
