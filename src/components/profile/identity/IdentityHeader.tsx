import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import React from 'react';

interface IdentityHeaderProps {
  displayName: string;
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
  /** When set and bio is empty, show "Add bio" button that calls this (Dashboard only). */
  onAddBio?: () => void;
}

const CARD_BG = 'rgba(30, 30, 30, 0.65)';
const BANNER_GLOW =
  '0 0 40px rgba(66, 165, 245, 0.12), 0 18px 60px rgba(0,0,0,0.5)';

export const IdentityHeader = ({
  displayName,
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
  onAddBio,
  statusEmoji: _statusEmoji,
  statusMessage: _statusMessage,
}: IdentityHeaderProps) => (
  <Paper
    elevation={0}
    data-testid="identity-header"
    sx={{
      p: { xs: 1.5, sm: 2, md: 4 },
      borderRadius: 4,
      bgcolor: CARD_BG,
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: BANNER_GLOW,
      mb: { xs: 2, sm: 3, md: 4 },
      position: 'relative',
      overflow: 'hidden',
    }}
  >
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
          {bioIsPlaceholder && onAddBio ? (
            <Button
              variant="outlined"
              size="small"
              onClick={() => onAddBio()}
              aria-label="Add bio"
              sx={{
                mt: 0.5,
                my: 1,
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                textTransform: 'none',
                fontSize: '0.9rem',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(255,255,255,0.06)',
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
                maxWidth: 560,
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              &ldquo;{bio}&rdquo;
            </Typography>
          ) : null}

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
      {/* Middle column: e.g. WEIRDLINGS — right-aligned on desktop */}
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
      {/* Actions on left, lined up with content */}
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
  </Paper>
);

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
