import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Link, Stack, Typography } from '@mui/material';
import { CATEGORY_ORDER } from '../../constants/platforms';
import {
  detectPlatformFromUrl,
  getShortLinkLabel,
} from '../../lib/linkPlatform';
import type { SocialLink } from '../../types/profile';
import { LinkIcon } from './LinkIcon';

interface ProfileLinksWidgetProps {
  socials: SocialLink[];
  /** When true, show remove (X) button on each link */
  isOwner?: boolean;
  /** Called when owner removes a link */
  onRemove?: (linkId: string) => void;
}

export const ProfileLinksWidget = ({
  socials,
  isOwner = false,
  onRemove,
}: ProfileLinksWidgetProps) => {
  // 1. HARDENED SAFETY CHECK:
  // We explicitly check Array.isArray to prevent crashes if Supabase sends {}
  if (!socials || !Array.isArray(socials) || socials.length === 0) return null;

  // 2. Filter for visible links only
  const visibleLinks = socials.filter((s) => s.isVisible);

  if (visibleLinks.length === 0) return null;

  // Sort all visible links by category order, then by link order
  const sortedLinks = [...visibleLinks].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    return a.order - b.order;
  });

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      {sortedLinks.map((link) => {
        // Use URL-based detection for correct icon (fixes legacy wrong platform)
        const displayPlatform = detectPlatformFromUrl(link.url);
        return (
          <Box
            key={link.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              p: 1,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: isOwner ? 'rgba(255,255,255,0.12)' : 'transparent',
              '&:hover': isOwner
                ? { borderColor: 'rgba(255,255,255,0.25)' }
                : {},
            }}
          >
            <Link
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                minWidth: 0,
                color: 'text.primary',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                '&:hover': {
                  color: 'primary.main',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <LinkIcon
                platform={displayPlatform}
                sx={{ mr: 1.5, fontSize: '1.1rem', width: 20, flexShrink: 0 }}
              />
              <Typography
                variant="body2"
                noWrap
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {getShortLinkLabel(link.url)}
              </Typography>
            </Link>
            {isOwner && onRemove && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(link.id);
                }}
                aria-label={`Remove ${link.label || link.platform}`}
                sx={{
                  flexShrink: 0,
                  p: 0.25,
                  minWidth: 0,
                  minHeight: 0,
                  color: 'error.main',
                  '&:hover': {
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      })}
    </Stack>
  );
};
