import { useRef, useState } from 'react';
import type { EmojiClickData } from 'emoji-picker-react';
import { supabase } from '../../../lib/auth/supabaseClient';
import {
  getChatAttachmentRejectionReason,
  normalizeChatAttachmentMime,
} from '../../../lib/chat/attachmentValidation';
import {
  type ChatAttachmentMeta,
  CHAT_ALLOWED_ACCEPT,
  CHAT_MAX_FILE_BYTES,
} from '../../../types/chat';
import { toMessage } from '../../../lib/utils/errors';
import { MessageInputView } from './MessageInputView';

const EXIF_STRIP_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const INPUT_SEPARATOR_GREEN = '#1DB954';
const STRIP_EXIF_TIMEOUT_MS = 10_000;
const QUICK_SEND: { content: string; label: string; ariaLabel: string }[] = [
  { content: '😊', label: '😊', ariaLabel: 'Send smile' },
  { content: '👍', label: '👍', ariaLabel: 'Send thumbs up' },
  { content: 'Thank you', label: 'Thank you', ariaLabel: 'Send thank you' },
];

async function stripExifIfImage(file: File): Promise<Blob> {
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

        const blob = await stripExifIfImage(f);
        if (blob.size > CHAT_MAX_FILE_BYTES) {
          setError('File must be 2MB or smaller.');
          return;
        }
        const ext = f.name.split('.').pop() || 'bin';
        const path = `${session.user.id}/${Date.now()}_0.${ext}`;
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
    <MessageInputView
      text={text}
      setText={setText}
      expanded={expanded}
      setExpanded={setExpanded}
      disabled={disabled}
      uploading={uploading}
      pendingFiles={pendingFiles}
      setPendingFiles={setPendingFiles}
      error={error}
      onStopTyping={onStopTyping}
      onTyping={onTyping}
      handleSubmit={handleSubmit}
      handleFileSelect={handleFileSelect}
      fileInputRef={fileInputRef}
      gifPickerOpen={gifPickerOpen}
      setGifPickerOpen={setGifPickerOpen}
      handlePickGif={handlePickGif}
      emojiAnchor={emojiAnchor}
      setEmojiAnchor={setEmojiAnchor}
      handleEmojiClick={handleEmojiClick}
      quickSend={QUICK_SEND}
      onSend={(content) => onSend(content)}
      inputSeparatorGreen={INPUT_SEPARATOR_GREEN}
      allowedAccept={CHAT_ALLOWED_ACCEPT}
    />
  );
};
