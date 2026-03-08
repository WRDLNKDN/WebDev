import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Collapse,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  detectPlatformFromUrl,
  getShortLinkLabel,
} from '../../lib/utils/linkPlatform';
import { useState } from 'react';
import type { SocialLink } from '../../types/profile';
import { LinkIcon } from './LinkIcon';
import {
  groupAndAlphabetizeLinks,
  DISPLAY_CATEGORY_ORDER,
} from '../../lib/profile/groupAndAlphabetizeLinks';

interface ProfileLinksWidgetProps {
  socials: SocialLink[];
  /** When true, show remove (X) button on each link */
  isOwner?: boolean;
  /** Called when owner removes a link */
  onRemove?: (linkId: string) => void;
  /** Group by category heading when true */
  grouped?: boolean;
  /** When true, show a collapsible header so the list can be expanded/collapsed. Default true when grouped. */
  collapsible?: boolean;
  /** When collapsible, start expanded (default true). */
  defaultExpanded?: boolean;
}

/** Collapsible section header for the links list in Identity. */
export const LINKS_COLLAPSIBLE_HEADER = 'LINKS';

export const ProfileLinksWidget = ({
  socials,
  isOwner = false,
  onRemove,
  grouped = false,
  collapsible = grouped,
  defaultExpanded = true,
}: ProfileLinksWidgetProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // 1. HARDENED SAFETY CHECK:
  // We explicitly check Array.isArray to prevent crashes if Supabase sends {}
  if (!socials || !Array.isArray(socials) || socials.length === 0) return null;

  // 2. Filter for visible links only
  const visibleLinks = socials.filter((s) => s.isVisible);

  if (visibleLinks.length === 0) return null;

  // 3. For grouped mode: use groupAndAlphabetizeLinks (groups by category,
  //    sorts alphabetically by label within each group).
  //    For flat mode: sort alphabetically by label across all links.
  const groupedLinks = grouped ? groupAndAlphabetizeLinks(visibleLinks) : null;

  const flatSortedLinks = !grouped
    ? [...visibleLinks].sort((a, b) =>
        (a.label || a.platform || '')
          .toLowerCase()
          .localeCompare((b.label || b.platform || '').toLowerCase()),
      )
    : [];

  const renderLink = (link: SocialLink) => {
    const displayPlatform = link.platform?.trim()
      ? link.platform
      : detectPlatformFromUrl(link.url);
    return (
      <Box
        key={link.id}
        data-testid={`link-row-${link.id}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          p: 1,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: isOwner ? 'rgba(255,255,255,0.12)' : 'transparent',
          '&:hover': isOwner ? { borderColor: 'rgba(255,255,255,0.25)' } : {},
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
          <Tooltip title={`Remove ${link.label || link.platform}`}>
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
          </Tooltip>
        )}
      </Box>
    );
  };

  const content = !grouped ? (
    <Stack spacing={1} data-testid="profile-links-widget">
      {flatSortedLinks.map((link) => renderLink(link))}
    </Stack>
  ) : (
    <Stack
      spacing={1.5}
      sx={{ width: '100%' }}
      data-testid="profile-links-widget"
    >
      {DISPLAY_CATEGORY_ORDER.filter(
        (category) => groupedLinks![category].length > 0,
      ).map((category) => (
        <Box key={category} data-testid={`link-group-${category}`}>
          <Typography
            variant="overline"
            sx={{
              fontSize: '0.66rem',
              letterSpacing: 1.2,
              color: 'text.secondary',
              display: 'block',
              mb: 0.5,
            }}
          >
            {category}
          </Typography>
          <Stack spacing={0.75}>
            {groupedLinks![category].map((link) => renderLink(link))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );

  if (collapsible) {
    return (
      <Stack spacing={0} sx={{ width: '100%' }}>
        <Box
          component="button"
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls="profile-links-content"
          id="profile-links-header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'text.secondary',
            textAlign: 'left',
            width: '100%',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <Typography
            variant="overline"
            sx={{
              fontSize: '0.66rem',
              letterSpacing: 1.2,
              color: 'inherit',
              fontWeight: 700,
            }}
          >
            {LINKS_COLLAPSIBLE_HEADER}
          </Typography>
          {expanded ? (
            <ExpandLessIcon sx={{ fontSize: 18 }} aria-hidden />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 18 }} aria-hidden />
          )}
        </Box>
        <Collapse in={expanded} id="profile-links-content">
          {content}
        </Collapse>
      </Stack>
    );
  }

  return content;
};
