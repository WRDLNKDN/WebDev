import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
} from '@mui/material';
import type { ReactNode } from 'react';
import type { FeedItem } from '../../lib/api/feedsApi';
import {
  extractUrlsFromText,
  LINK_PREVIEW_URL_REGEX,
} from '../../lib/urlPreviewText';
export {
  LinkPreviewCard,
  type LinkPreviewPayload,
} from '../../components/media/LinkPreviewCard';

export function linkifyBody(body: string): ReactNode {
  if (!body.trim()) return null;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(LINK_PREVIEW_URL_REGEX.source, 'gi');
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
  return extractUrlsFromText(body);
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

/**
 * Share dialog for Feed posts — internal options only: Copy link, Share to Connection, Share to Group.
 * Feed.tsx uses its own ShareDialog with chat sub-dialogs; this export is for legacy/alternate entry points.
 */
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
