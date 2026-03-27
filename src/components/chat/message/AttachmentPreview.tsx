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
  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const imageAlt =
    mimeType.toLowerCase() === 'image/gif' ? 'GIF' : 'Attachment';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(path, 3600);
      if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <Box
      component="a"
      href={signedUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: 'block',
        maxWidth: 220,
        maxHeight: 220,
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid rgba(141,188,229,0.38)',
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
        <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.3)', fontSize: 12 }}>
          {signedUrl ? 'File' : '…'}
        </Box>
      )}
    </Box>
  );
};
