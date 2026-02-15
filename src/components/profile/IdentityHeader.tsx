import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import React from 'react';

interface IdentityHeaderProps {
  displayName: string;
  tagline?: string;
  bio: string;
  avatarUrl: string;
  statusEmoji?: string;
  statusMessage?: string;
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
      mb: 4,
      position: 'relative',
    }}
  >
    {actions && (
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 2 }}
      >
        {actions}
      </Stack>
    )}

    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={4}
      alignItems={{ xs: 'center', md: 'flex-start' }}
      sx={{ textAlign: { xs: 'center', md: 'left' } }}
    >
      <Stack alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
        <Avatar
          src={avatarUrl}
          alt={displayName}
          sx={{
            width: 120,
            height: 120,
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
          sx={{ fontWeight: 700, mb: 0.5, letterSpacing: -0.5 }}
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
          component="blockquote"
          variant="body1"
          color="text.secondary"
          sx={{
            mx: { xs: 'auto', md: 0 },
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

/** Badge row: Builder Tags, Skills — clickable when callbacks provided; MUI icons */
export const IdentityBadges = ({
  onTagsClick,
  onSkillsClick,
}: IdentityBadgesProps) => (
  <>
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
  </>
);
