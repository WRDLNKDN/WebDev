import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { ProfileAvatar } from '../avatar/ProfileAvatar';
import React from 'react';

interface IdentityHeaderProps {
  displayName: string;
  tagline?: string;
  bio: string;
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
}

const CARD_BG = 'rgba(30, 30, 30, 0.65)';
const BANNER_GLOW =
  '0 0 40px rgba(66, 165, 245, 0.12), 0 18px 60px rgba(0,0,0,0.5)';

export const IdentityHeader = ({
  displayName,
  tagline,
  bio,
  avatarUrl,
  slotLeftOfAvatar,
  slotUnderAvatarLabel,
  slotUnderAvatar,
  badges,
  slotBetweenContentAndActionsLabel,
  slotBetweenContentAndActions,
  actions,
  statusEmoji: _statusEmoji,
  statusMessage: _statusMessage,
}: IdentityHeaderProps) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2, md: 4 },
      borderRadius: 4,
      bgcolor: CARD_BG,
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: BANNER_GLOW,
      mb: { xs: 3, md: 4 },
      position: 'relative',
    }}
  >
    {actions && (
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexWrap="wrap"
        useFlexGap
        spacing={2}
        sx={{
          mb: 2,
          '& .MuiButton-root': { minWidth: 0 },
        }}
      >
        {actions}
      </Stack>
    )}

    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={{ xs: 3, md: 4 }}
      alignItems="flex-start"
      sx={{ textAlign: 'left' }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems="flex-start"
        sx={{ flexShrink: 0 }}
      >
        {slotLeftOfAvatar && (
          <Box
            sx={{
              order: { xs: 2, md: 1 },
              minWidth: { md: 220 },
              maxWidth: { md: 280 },
            }}
          >
            {slotLeftOfAvatar}
          </Box>
        )}
        <Stack
          alignItems="flex-start"
          spacing={1.5}
          sx={{ order: { xs: 1, md: 2 } }}
        >
          <ProfileAvatar
            src={avatarUrl || undefined}
            alt={displayName}
            size="header"
            sx={{
              border: '4px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          />
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
      </Stack>
      <Box
        sx={{
          flex: '1 1 0',
          minWidth: 0,
          maxWidth: '100%',
          // Ensure bio and name have room: floor width so layout doesn't squish
          '@media (min-width: 900px)': { minWidth: 360 },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 0.5,
            letterSpacing: -0.5,
            fontSize: { xs: '1.5rem', md: '2.125rem' },
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
        <Typography
          variant="overline"
          sx={{
            letterSpacing: 1.5,
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '0.72rem',
            display: 'block',
            mt: 0.5,
          }}
        >
          Description
        </Typography>
        <Typography
          component="blockquote"
          variant="body1"
          color="text.secondary"
          sx={{
            lineHeight: 1.6,
            fontStyle: 'italic',
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            pl: 2,
            my: 1,
            maxWidth: 560,
          }}
        >
          &ldquo;{bio}&rdquo;
        </Typography>

        {badges && (
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2, mb: 2 }}>
            {badges}
          </Stack>
        )}
      </Box>
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
