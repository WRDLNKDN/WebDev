import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Collapse,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import {
  CATEGORY_ORDER,
  getCategoryForPlatform,
} from '../../constants/platforms';
import {
  detectPlatformFromUrl,
  getShortLinkLabel,
} from '../../lib/utils/linkPlatform';
import { useState } from 'react';
import type { SocialLink } from '../../types/profile';
import { LinkIcon } from './LinkIcon';

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

type DisplayCategory = 'Professional' | 'Social' | 'Content' | 'Other';
const DISPLAY_CATEGORY_ORDER: DisplayCategory[] = [
  'Professional',
  'Social',
  'Content',
  'Other',
];

/** Collapsible section header for the links list in Identity. */
export const LINKS_COLLAPSIBLE_HEADER = 'LINKS';

const normalizeDisplayCategory = (link: SocialLink): DisplayCategory => {
  if (
    link.category === 'Professional' ||
    link.category === 'Social' ||
    link.category === 'Content'
  ) {
    return link.category;
  }
  // Custom or unknown: infer from platform so we don't mis-group
  const platform =
    link.platform?.trim() || detectPlatformFromUrl(link.url) || '';
  const inferred = getCategoryForPlatform(platform);
  if (inferred === 'Professional') return 'Professional';
  if (inferred === 'Social') return 'Social';
  if (inferred === 'Content') return 'Content';
  return 'Other';
};

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

  // Sort all visible links by schema category order, then by link order
  const sortedLinks = [...visibleLinks].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    return a.order - b.order;
  });

  const renderLink = (link: SocialLink) => {
    const displayPlatform = link.platform?.trim()
      ? link.platform
      : detectPlatformFromUrl(link.url);
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
  };

  const groupedLinks = grouped
    ? sortedLinks.reduce<Record<DisplayCategory, SocialLink[]>>(
        (acc, link) => {
          const key = normalizeDisplayCategory(link);
          acc[key] = acc[key] ? [...acc[key], link] : [link];
          return acc;
        },
        {
          Professional: [],
          Social: [],
          Content: [],
          Other: [],
        },
      )
    : null;

  const content = !grouped ? (
    <Stack spacing={1}>{sortedLinks.map((link) => renderLink(link))}</Stack>
  ) : (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      {DISPLAY_CATEGORY_ORDER.filter(
        (category) => groupedLinks![category].length,
      ).map((category) => (
        <Box key={category}>
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
