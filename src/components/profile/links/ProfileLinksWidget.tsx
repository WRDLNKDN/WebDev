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
import { useEffect, useMemo, useState } from 'react';
import {
  getSocialLinkPlatform,
  getSocialLinkTitle,
  groupSocialLinksByCategory,
} from '../../../lib/profile/socialLinksPresentation';
import type { SocialLink } from '../../../types/profile';
import { LinkIcon } from './LinkIcon';

interface ProfileLinksWidgetProps {
  socials: SocialLink[];
  isOwner?: boolean;
  onRemove?: (linkId: string) => void;
  grouped?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const LINKS_COLLAPSIBLE_HEADER = 'LINKS';

export const ProfileLinksWidget = ({
  socials,
  isOwner = false,
  onRemove,
  grouped = false,
  collapsible = grouped,
  defaultExpanded = true,
}: ProfileLinksWidgetProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const safeSocials = useMemo(
    () => (Array.isArray(socials) ? socials : []),
    [socials],
  );

  const visibleGroups = useMemo(
    () => groupSocialLinksByCategory(safeSocials, { visibleOnly: true }),
    [safeSocials],
  );
  const visibleLinks = useMemo(
    () => visibleGroups.flatMap((group) => group.links),
    [visibleGroups],
  );

  useEffect(() => {
    if (!grouped || !collapsible) return;

    setExpandedGroups((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const group of visibleGroups) {
        if (typeof next[group.category] !== 'boolean') {
          next[group.category] = defaultExpanded;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [collapsible, defaultExpanded, grouped, visibleGroups]);

  if (safeSocials.length === 0) return null;
  if (visibleLinks.length === 0) return null;

  const renderLink = (link: SocialLink) => {
    const displayPlatform = getSocialLinkPlatform(link);
    const linkTitle = getSocialLinkTitle(link);

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
            {linkTitle}
          </Typography>
        </Link>
        {isOwner && onRemove ? (
          <Tooltip title={`Remove ${linkTitle}`}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(link.id);
              }}
              aria-label={`Remove ${linkTitle}`}
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
        ) : null}
      </Box>
    );
  };

  const content = grouped ? (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      {visibleGroups.map((group) => {
        const isExpanded = collapsible
          ? (expandedGroups[group.category] ?? defaultExpanded)
          : true;

        return (
          <Box
            key={group.category}
            data-testid={`link-group-${group.category}`}
            sx={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.02)',
              overflow: 'hidden',
            }}
          >
            <Box
              component={collapsible ? 'button' : 'div'}
              type={collapsible ? 'button' : undefined}
              onClick={
                collapsible
                  ? () =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [group.category]: !isExpanded,
                      }))
                  : undefined
              }
              aria-expanded={collapsible ? isExpanded : undefined}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                p: 1.25,
                border: 'none',
                bgcolor: 'transparent',
                color: 'inherit',
                textAlign: 'left',
                cursor: collapsible ? 'pointer' : 'default',
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  fontSize: '0.66rem',
                  letterSpacing: 1.2,
                  color: 'text.secondary',
                  display: 'block',
                  fontWeight: 700,
                }}
              >
                {group.category}
              </Typography>
              {collapsible ? (
                isExpanded ? (
                  <ExpandLessIcon
                    sx={{ fontSize: 18, color: 'text.secondary' }}
                  />
                ) : (
                  <ExpandMoreIcon
                    sx={{ fontSize: 18, color: 'text.secondary' }}
                  />
                )
              ) : null}
            </Box>
            <Collapse in={isExpanded}>
              <Stack spacing={0.75} sx={{ px: 1.25, pb: 1.25 }}>
                {group.links.map((link) => renderLink(link))}
              </Stack>
            </Collapse>
          </Box>
        );
      })}
    </Stack>
  ) : (
    <Stack spacing={1}>{visibleLinks.map((link) => renderLink(link))}</Stack>
  );

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Typography
        variant="overline"
        sx={{
          fontSize: '0.66rem',
          letterSpacing: 1.2,
          color: 'text.secondary',
          fontWeight: 700,
        }}
      >
        {LINKS_COLLAPSIBLE_HEADER}
      </Typography>
      {content}
    </Stack>
  );
};
