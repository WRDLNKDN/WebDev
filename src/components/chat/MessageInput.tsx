import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import { Box, IconButton, TextField } from '@mui/material';
import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  CHAT_ALLOWED_MIME,
  CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  CHAT_MAX_FILE_BYTES,
} from '../../types/chat';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function stripExifIfImage(file: File): Promise<Blob> {
  if (!IMAGE_MIMES.includes(file.type)) return file;
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
        if (f.size > CHAT_MAX_FILE_BYTES) {
          setError('This file is too large. Maximum size is 6MB.');
          setUploading(false);
          return;
        }
        const mime = f.type;
        if (
          !CHAT_ALLOWED_MIME.includes(
            mime as (typeof CHAT_ALLOWED_MIME)[number],
          )
        ) {
          setError(
            'This file type is not supported. Please choose an image or document.',
          );
          setUploading(false);
          return;
        }
        const blob = await stripExifIfImage(f);
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

    const valid = files.filter((f) => {
      if (f.size > CHAT_MAX_FILE_BYTES) return false;
      if (
        !CHAT_ALLOWED_MIME.includes(
          f.type as (typeof CHAT_ALLOWED_MIME)[number],
        )
      )
        return false;
      return true;
    });

    if (valid.length < files.length) {
      setError(
        'Some files are too large or not supported. Max 6MB, images or documents only.',
      );
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
          accept={CHAT_ALLOWED_MIME.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          aria-label="Attach file"
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <AttachFileIcon />
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
              bgcolor: 'rgba(0,0,0,0.2)',
              color: 'white',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
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
    </Box>
  );
};
