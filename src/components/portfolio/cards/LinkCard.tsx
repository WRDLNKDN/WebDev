import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import {
  detectPlatformFromUrl,
  getShortLinkLabel,
} from '../../../lib/utils/linkPlatform';
import { CANDY_BLUEY } from '../../../theme/candyStyles';
import { compactGlassDangerIconButtonSx } from '../../../theme/iconActionStyles';
import type { SocialLink } from '../../../types/profile';
import { LinkIcon } from '../../profile/links/LinkIcon';

interface LinkCardProps {
  link: SocialLink;
  /** When true, show remove button */
  isOwner?: boolean;
  onRemove?: (linkId: string) => void;
}

export const LinkCard = ({
  link,
  isOwner = false,
  onRemove,
}: LinkCardProps) => {
  const displayPlatform =
    link.platform?.trim() || detectPlatformFromUrl(link.url);
  const title =
    link.label?.trim() || displayPlatform || getShortLinkLabel(link.url);
  const description = link.url;

  const handleOpen = () => {
    const url = link.url.startsWith('http') ? link.url : `https://${link.url}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Paper
      component="div"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a, button')) return;
        handleOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
      sx={{
        ...CANDY_BLUEY,
        width: '100%',
        maxWidth: { xs: '100%', sm: 360 },
        minHeight: { xs: 200, md: 220 },
        height: { xs: 200, md: 220 },
        borderRadius: 3,
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <Box
        sx={{
          width: '100%',
          minHeight: { xs: 72, sm: 80 },
          maxHeight: { xs: 88, md: 100 },
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.2)',
        }}
      >
        <LinkIcon
          platform={displayPlatform}
          sx={{ width: 40, height: 40, fontSize: '2rem' }}
        />
      </Box>

      <Box
        sx={{
          p: { xs: 1.25, md: 1.75 },
          flexGrow: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box component="p" sx={{ m: 0, mb: 0.75 }}>
          <Typography
            component="span"
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Title:{' '}
          </Typography>
          <Typography
            variant="body1"
            fontWeight={700}
            noWrap
            sx={{
              color: 'inherit',
              letterSpacing: 0.5,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
        </Box>
        <Box component="p" sx={{ m: 0 }}>
          <Typography
            component="span"
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Link:{' '}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-all',
            }}
          >
            {description}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
          px: 1.25,
          py: 0.75,
          minHeight: 40,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Tooltip title="Open link">
          <IconButton
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleOpen();
            }}
            aria-label={`Open ${title}`}
            sx={{
              color: 'inherit',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <OpenInNewIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        {isOwner && onRemove && (
          <Tooltip title={`Remove ${title}`}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(link.id);
              }}
              aria-label={`Remove ${title}`}
              sx={{
                ...compactGlassDangerIconButtonSx,
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};
