import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/auth/supabaseClient';

export const AttachmentPreview = ({
  path,
  mimeType,
}: {
  path: string;
  mimeType: string;
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const imageAlt =
    mimeType.toLowerCase() === 'image/gif' ? 'GIF' : 'Attachment';

  useEffect(() => {
    let cancelled = false;
    setSignedUrl(null);
    setLoadFailed(false);
    void (async () => {
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(path, 3600);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setLoadFailed(true);
        return;
      }
      setSignedUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <Box
      component={signedUrl ? 'a' : 'div'}
      {...(signedUrl
        ? {
            href: signedUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
          }
        : {})}
      aria-disabled={!signedUrl}
      sx={{
        display: 'block',
        width: 'min(100%, 220px)',
        maxWidth: 220,
        maxHeight: 220,
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid rgba(141,188,229,0.38)',
        textDecoration: 'none',
        cursor: signedUrl ? 'pointer' : 'default',
      }}
    >
      {isImage && signedUrl ? (
        <Box
          component="img"
          src={signedUrl}
          alt={imageAlt}
          width={220}
          height={220}
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: 220,
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : isVideo && signedUrl ? (
        <Box
          component="video"
          src={signedUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="Video attachment (loops like a GIF)"
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: 220,
            objectFit: 'cover',
            display: 'block',
            bgcolor: 'black',
          }}
        />
      ) : (
        <Box
          sx={{
            p: 1,
            bgcolor: 'rgba(0,0,0,0.3)',
            fontSize: 12,
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {loadFailed
            ? 'Attachment unavailable'
            : signedUrl
              ? 'File'
              : 'Loading attachment...'}
        </Box>
      )}
    </Box>
  );
};
