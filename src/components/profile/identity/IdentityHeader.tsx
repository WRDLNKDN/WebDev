import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PsychologyIcon from '@mui/icons-material/Psychology';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import React from 'react';

interface IdentityHeaderProps {
  displayName: string;
  /** @handle shown under the display name when set (dashboard / public profile). */
  memberHandle?: string | null;
  tagline?: string;
  bio: string;
  /** When true, bio is empty-state prompt (no quotes, muted style) */
  bioIsPlaceholder?: boolean;
  avatarUrl?: string | null;
  statusEmoji?: string;
  statusMessage?: string;
  /** Optional content rendered left of the avatar on desktop (stacks on mobile). */
  slotLeftOfAvatar?: React.ReactNode;
  /** Optional label above slot (e.g. "WEIRDLINGS") */
  slotUnderAvatarLabel?: string;
  /** Renders under the avatar (e.g. Weirdling list or "Add your weirdling") */
  slotUnderAvatar?: React.ReactNode;
  /** Builder Tags, Skills row */
  badges?: React.ReactNode;
  /** Optional middle column between content and actions (e.g. WEIRDLINGS) */
  slotBetweenContentAndActionsLabel?: string;
  slotBetweenContentAndActions?: React.ReactNode;
  /** Edit Profile / Settings buttons */
  actions?: React.ReactNode;
  /**
   * Right column content. When layoutVariant is 'three-column', use for
   * Industries only (e.g. IndustryGroupBlock). Do not put Links here.
   * See docs/PROFILE_LAYOUT.md.
   */
  rightColumn?: React.ReactNode;
  /** 'three-column': left=avatar+slotUnderAvatar, center=bio+badges+actions, right=rightColumn (Industries only). */
  layoutVariant?: 'default' | 'three-column';
  /** When set and bio is empty, show "Add bio" button that calls this (Dashboard only). */
  onAddBio?: () => void;
}

export const IdentityHeader = ({
  displayName,
  memberHandle,
  tagline,
  bio,
  bioIsPlaceholder = false,
  avatarUrl,
  slotLeftOfAvatar,
  slotUnderAvatarLabel,
  slotUnderAvatar,
  badges,
  slotBetweenContentAndActionsLabel,
  slotBetweenContentAndActions,
  actions,
  rightColumn,
  layoutVariant = 'default',
  onAddBio,
  statusEmoji: _statusEmoji,
  statusMessage: _statusMessage,
}: IdentityHeaderProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const cardBg = isLight
    ? alpha(theme.palette.primary.main, 0.06)
    : 'rgba(30, 30, 30, 0.65)';
  const bannerGlow = isLight
    ? `0 0 24px ${alpha(theme.palette.primary.main, 0.12)}, 0 12px 40px ${alpha(theme.palette.common.black, 0.08)}`
    : '0 0 40px rgba(66, 165, 245, 0.12), 0 18px 60px rgba(0,0,0,0.5)';

  const avatarBlock = (
    <Stack alignItems="flex-start" spacing={1.5} sx={{ flexShrink: 0 }}>
      <Box
        sx={{
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: '3px solid rgba(66,165,245,0.45)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <ProfileAvatar
          src={avatarUrl || undefined}
          alt={displayName}
          size="header"
          sx={{
            border: 'none',
            boxShadow: 'none',
            width: 112,
            height: 112,
          }}
        />
      </Box>
      {slotUnderAvatarLabel && (
        <Typography
          variant="overline"
          sx={{
            letterSpacing: 1.5,
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        >
          {slotUnderAvatarLabel}
        </Typography>
      )}
      {slotUnderAvatar}
    </Stack>
  );

  const bioBlock =
    bioIsPlaceholder && onAddBio ? (
      <Button
        variant="outlined"
        size="small"
        onClick={() => onAddBio()}
        aria-label="Add bio"
        sx={{
          mt: 0.5,
          my: 1,
          borderColor: 'rgba(141,188,229,0.50)',
          color: isLight ? 'primary.main' : 'white',
          textTransform: 'none',
          fontSize: '0.9rem',
          '&:hover': {
            borderColor: isLight ? 'primary.dark' : 'rgba(255,255,255,0.5)',
            bgcolor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.14),
          },
        }}
      >
        Add bio
      </Button>
    ) : !bioIsPlaceholder && bio ? (
      <Typography
        component="blockquote"
        variant="body1"
        color="text.secondary"
        sx={{
          lineHeight: 1.6,
          fontStyle: 'italic',
          borderLeft: '3px solid',
          borderColor: 'primary.main',
          pl: { xs: 1.5, md: 2 },
          my: 1,
          mt: 0.5,
          maxWidth: layoutVariant === 'three-column' ? '100%' : 560,
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        &ldquo;{bio}&rdquo;
      </Typography>
    ) : null;

  return (
    <Paper
      elevation={0}
      data-testid="identity-header"
      sx={{
        p: { xs: 1.5, sm: 2, md: 4 },
        borderRadius: 4,
        bgcolor: cardBg,
        backdropFilter: 'blur(16px)',
        border: '1px solid',
        borderColor: isLight
          ? alpha(theme.palette.divider, 0.9)
          : 'rgba(156,187,217,0.26)',
        boxShadow: bannerGlow,
        mb: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {layoutVariant === 'three-column' ? (
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, sm: 3, md: 4 },
            alignItems: 'start',
            gridTemplateColumns: {
              xs: '1fr',
              md: '120px minmax(0, 1fr) minmax(220px, 280px)',
            },
          }}
        >
          <Box sx={{ minWidth: 0 }}>{avatarBlock}</Box>
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  mb: 0.5,
                  letterSpacing: -0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' },
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {displayName}
              </Typography>
              {memberHandle ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: tagline ? 0.5 : 1,
                    fontWeight: 600,
                    wordBreak: 'break-all',
                  }}
                >
                  @{memberHandle}
                </Typography>
              ) : null}
              {tagline && (
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    color: 'primary.main',
                  }}
                >
                  {tagline}
                </Typography>
              )}
              {bioBlock}
            </Box>
            {badges ? <Box sx={{ minWidth: 0 }}>{badges}</Box> : null}
            {actions ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="flex-start"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                flexWrap="wrap"
                useFlexGap
                spacing={{ xs: 1.25, sm: 2 }}
                sx={{
                  '& .MuiButton-root': { minWidth: 0 },
                }}
              >
                {actions}
              </Stack>
            ) : null}
          </Stack>
          {rightColumn ? <Box sx={{ minWidth: 0 }}>{rightColumn}</Box> : null}
        </Box>
      ) : (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2, sm: 3, md: 4 }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="flex-start"
          sx={{ textAlign: 'left', minWidth: 0 }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 1.5, md: 2 }}
            alignItems="flex-start"
            sx={{ flex: '1 1 0', minWidth: 0, maxWidth: '100%' }}
          >
            {avatarBlock}
            <Box
              sx={{
                flex: '1 1 0',
                minWidth: 0,
                maxWidth: '100%',
                '@media (min-width: 900px)': { minWidth: 360 },
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  mb: 0.5,
                  letterSpacing: -0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' },
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {displayName}
              </Typography>
              {memberHandle ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: tagline ? 0.5 : 1,
                    fontWeight: 600,
                    wordBreak: 'break-all',
                  }}
                >
                  @{memberHandle}
                </Typography>
              ) : null}
              {tagline && (
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    color: 'primary.main',
                  }}
                >
                  {tagline}
                </Typography>
              )}
              {bioBlock}

              {badges && (
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ mt: 2, mb: 2 }}
                >
                  {badges}
                </Stack>
              )}
            </Box>
          </Stack>
          {slotLeftOfAvatar && (
            <Box
              sx={{
                flexShrink: 0,
                minWidth: { md: 220 },
                maxWidth: { md: 280 },
              }}
            >
              {slotLeftOfAvatar}
            </Box>
          )}
          {slotBetweenContentAndActions && (
            <Stack
              alignItems={{ xs: 'center', md: 'flex-end' }}
              sx={{
                flexShrink: 0,
                minWidth: 0,
              }}
            >
              {slotBetweenContentAndActionsLabel && (
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 1.5,
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    mb: 1,
                  }}
                >
                  {slotBetweenContentAndActionsLabel}
                </Typography>
              )}
              {slotBetweenContentAndActions}
            </Stack>
          )}
          {actions && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="flex-start"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              flexWrap="wrap"
              useFlexGap
              spacing={{ xs: 1.25, sm: 2 }}
              sx={{
                flexShrink: 0,
                alignSelf: { xs: 'stretch', md: 'center' },
                '& .MuiButton-root': { minWidth: 0 },
              }}
            >
              {actions}
            </Stack>
          )}
        </Stack>
      )}
    </Paper>
  );
};

interface IdentityBadgesProps {
  onTagsClick?: () => void;
  onSkillsClick?: () => void;
}

/** Badge row: Builder Tags, Skills, Edit Profile — Edit Profile is the main CTA */
export const IdentityBadges = ({
  onTagsClick,
  onSkillsClick,
}: IdentityBadgesProps) => {
  const onEdit = onTagsClick ?? onSkillsClick;
  return (
    <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
      <Chip
        size="small"
        icon={<LocalOfferIcon sx={{ fontSize: 16 }} />}
        label="Builder Tags"
        onClick={onTagsClick}
        clickable={Boolean(onTagsClick)}
        sx={{
          bgcolor: 'rgba(255,193,7,0.15)',
          color: 'text.primary',
          border: '1px solid rgba(255,193,7,0.35)',
          cursor: onTagsClick ? 'pointer' : 'default',
          '& .MuiChip-icon': { color: 'inherit' },
        }}
      />
      <Chip
        size="small"
        icon={<PsychologyIcon sx={{ fontSize: 16 }} />}
        label="Skills"
        onClick={onSkillsClick}
        clickable={Boolean(onSkillsClick)}
        sx={{
          bgcolor: 'rgba(236,64,122,0.15)',
          color: 'text.primary',
          border: '1px solid rgba(236,64,122,0.35)',
          cursor: onSkillsClick ? 'pointer' : 'default',
          '& .MuiChip-icon': { color: 'inherit' },
        }}
      />
      {onEdit && (
        <Chip
          size="small"
          label="Edit Profile"
          onClick={onEdit}
          clickable
          sx={{
            bgcolor: 'rgba(66,165,245,0.15)',
            color: 'primary.light',
            border: '1px solid rgba(66,165,245,0.4)',
            cursor: 'pointer',
          }}
        />
      )}
    </Stack>
  );
};
