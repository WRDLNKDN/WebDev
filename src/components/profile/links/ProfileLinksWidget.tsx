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
  normalizeUrlForDedup,
} from '../../../lib/utils/linkPlatform';
import { useState } from 'react';
import type { SocialLink } from '../../../types/profile';
import { LinkIcon } from './LinkIcon';
import {
  groupAndAlphabetizeLinks,
  DISPLAY_CATEGORY_ORDER,
} from '../../../lib/profile/groupAndAlphabetizeLinks';

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
  const resolveExternalHref = (rawUrl: string): string | null => {
    const normalized = normalizeUrlForDedup(rawUrl);
    if (/^https?:\/\//i.test(normalized)) return normalized;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const parsed = new URL(withScheme);
      return /^https?:$/i.test(parsed.protocol) ? parsed.toString() : null;
    } catch {
      return null;
    }
  };

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [collapsedByCategory, setCollapsedByCategory] = useState<
    Partial<Record<(typeof DISPLAY_CATEGORY_ORDER)[number], boolean>>
  >({});
  const rawSocials = Array.isArray(socials) ? socials : [];
  const visibleLinks = rawSocials.filter((s) => s.isVisible !== false);
  const showOwnerShellWhenEmpty =
    isOwner && grouped && collapsible && rawSocials.length === 0;

  if (visibleLinks.length === 0 && !showOwnerShellWhenEmpty) return null;

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
    const href = resolveExternalHref(link.url);
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
          href={href ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={href ? undefined : true}
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
            pointerEvents: href ? 'auto' : 'none',
            opacity: href ? 1 : 0.6,
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
      ).map((category) => {
        const categoryCollapsed = collapsedByCategory[category] === true;
        return (
          <Box key={category} data-testid={`link-group-${category}`}>
            <Box
              component="button"
              type="button"
              onClick={() =>
                setCollapsedByCategory((prev) => ({
                  ...prev,
                  [category]: !categoryCollapsed,
                }))
              }
              aria-expanded={!categoryCollapsed}
              aria-controls={`link-group-content-${category}`}
              id={`link-group-header-${category}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                border: 'none',
                background: 'none',
                p: 0,
                cursor: 'pointer',
                color: 'text.secondary',
                textAlign: 'left',
                width: '100%',
                mb: 0.5,
                '&:hover': { color: 'text.primary' },
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  fontSize: '0.66rem',
                  letterSpacing: 1.2,
                  color: 'inherit',
                  display: 'block',
                }}
              >
                {category}
              </Typography>
              {categoryCollapsed ? (
                <ExpandMoreIcon sx={{ fontSize: 16 }} aria-hidden />
              ) : (
                <ExpandLessIcon sx={{ fontSize: 16 }} aria-hidden />
              )}
            </Box>
            <Collapse
              in={!categoryCollapsed}
              id={`link-group-content-${category}`}
            >
              <Stack spacing={0.75}>
                {groupedLinks![category].map((link) => renderLink(link))}
              </Stack>
            </Collapse>
          </Box>
        );
      })}
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
