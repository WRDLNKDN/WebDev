import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import type { FeedItem } from '../../lib/api/feedsApi';

/** Match URLs so we can render them as clickable links in post body. */
const URL_REGEX = /https?:\/\/[^\s<>[\]()]+(?:\([^\s)]*\)|[^\s<>[\]()]*)?/gi;

export function linkifyBody(body: string): ReactNode {
  if (!body.trim()) return null;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_REGEX.source, 'gi');
  while ((m = re.exec(body)) !== null) {
    if (m.index > lastIndex) {
      parts.push(body.slice(lastIndex, m.index));
    }
    parts.push(
      <Link
        key={m.index}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: 'primary.main' }}
      >
        {m[0]}
      </Link>,
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

export function extractBodyUrls(body: string): string[] {
  if (!body.trim()) return [];
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_REGEX.source, 'gi');
  while ((m = re.exec(body)) !== null) {
    urls.push(m[0]);
  }
  return urls;
}

export function isGifUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (/\.gif($|\?)/i.test(parsed.pathname + parsed.search)) return true;
    const h = parsed.hostname.toLowerCase();
    return (
      h.includes('tenor.com') ||
      h.includes('giphy.com') ||
      h.includes('media.giphy.com')
    );
  } catch {
    return false;
  }
}

export function removeGifUrlsFromBody(body: string): string {
  if (!body.trim()) return '';
  const gifUrls = extractBodyUrls(body).filter(isGifUrl);
  if (gifUrls.length === 0) return body;

  let cleaned = body;
  for (const url of gifUrls) {
    cleaned = cleaned.split(url).join('');
  }
  return cleaned
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
]);

export function fileExtension(fileName: string): string {
  const ext = fileName.split('.').pop();
  return (ext ?? '').toLowerCase();
}

export function isSupportedImageFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (SUPPORTED_IMAGE_MIME_TYPES.has(mime)) return true;
  return SUPPORTED_IMAGE_EXTENSIONS.has(fileExtension(file.name));
}

export type LinkPreviewPayload = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

function linkPreviewDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export const LinkPreviewCard = ({
  preview,
  onDismiss,
}: {
  preview: LinkPreviewPayload;
  onDismiss?: () => void;
}) => (
  <Box sx={{ position: 'relative', display: 'block', mt: 1.5 }}>
    {onDismiss && (
      <IconButton
        size="small"
        aria-label="Dismiss link preview"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss();
        }}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': { bgcolor: 'action.hover' },
          '&:focus': { bgcolor: 'background.paper' },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    )}
    <Link
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      underline="none"
      sx={{ display: 'block' }}
    >
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          overflow: 'hidden',
          borderRadius: 1.5,
          borderColor: 'divider',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        {preview.image && (
          <Box
            component="img"
            src={preview.image}
            alt=""
            sx={{
              width: { xs: '100%', sm: 120 },
              minWidth: { sm: 120 },
              height: { xs: 140, sm: 120 },
              objectFit: 'cover',
              bgcolor: 'action.hover',
            }}
          />
        )}
        <Box sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{
              color: 'text.primary',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {preview.title || linkPreviewDomain(preview.url)}
          </Typography>
          {preview.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.25,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {preview.description}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {preview.siteName || linkPreviewDomain(preview.url)}
          </Typography>
        </Box>
      </Paper>
    </Link>
  </Box>
);

export const ShareDialog = ({
  item,
  open,
  onClose,
  onCopyLink,
  onComplete,
}: {
  item: FeedItem | null;
  open: boolean;
  onClose: () => void;
  onCopyLink: (url: string) => void;
  onComplete?: () => void;
}) => {
  if (!item) return null;
  const postUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/feed?post=${encodeURIComponent(item.id)}`
      : '';
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share this post</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              onCopyLink(postUrl);
              onComplete?.();
              onClose();
            }}
          >
            Copy link
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            component="a"
            onClick={() => {
              onComplete?.();
            }}
          >
            Share to LinkedIn
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
