import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PsychologyIcon from '@mui/icons-material/Psychology';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';
import React from 'react';

const nameHeadingSx = {
  fontWeight: 700,
  mb: 0.5,
  letterSpacing: -0.5,
  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' },
  wordBreak: 'break-word' as const,
  overflowWrap: 'break-word' as const,
};

type IdentityHeaderTitleBlockProps = {
  displayName: string;
  memberHandle?: string | null;
  tagline?: string;
  bioBlock: React.ReactNode;
  /** When false, name/handle/tagline only (bio rendered separately, e.g. mobile row). */
  includeBio?: boolean;
};

const IdentityHeaderTitleBlock = ({
  displayName,
  memberHandle,
  tagline,
  bioBlock,
  includeBio = true,
}: IdentityHeaderTitleBlockProps) => {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h4" sx={nameHeadingSx}>
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
            mb: includeBio ? 1 : 0,
            color: 'primary.main',
          }}
        >
          {tagline}
        </Typography>
      )}
      {includeBio ? bioBlock : null}
    </Box>
  );
};

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
  /** Constrains header card width (e.g. dashboard) so the hero does not span empty space. */
  paperMaxWidth?: number | string;
}

const IdentityBioBlock = ({
  theme,
  isLight,
  layoutVariant,
  bio,
  bioIsPlaceholder,
  onAddBio,
}: {
  theme: Theme;
  isLight: boolean;
  layoutVariant: 'default' | 'three-column';
  bio: string;
  bioIsPlaceholder: boolean;
  onAddBio?: () => void;
}) => {
  if (bioIsPlaceholder && onAddBio) {
    return (
      <Button
        variant="outlined"
        size="small"
        startIcon={<EditOutlinedIcon sx={{ fontSize: 18 }} />}
        onClick={() => onAddBio()}
        aria-label="Add bio to your profile"
        sx={{
          mt: 0.5,
          my: 1,
          minHeight: 44,
          px: 1.75,
          borderColor: 'rgba(45, 212, 191, 0.55)',
          color: isLight ? 'primary.main' : '#e0f7fa',
          fontWeight: 600,
          textTransform: 'none',
          fontSize: '0.875rem',
          '&:hover': {
            borderColor: '#2dd4bf',
            bgcolor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.18),
          },
        }}
      >
        Add bio
      </Button>
    );
  }
  if (!bioIsPlaceholder && bio) {
    return (
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
    );
  }
  return null;
};

const IdentityHeaderThreeColumnGrid = ({
  avatarBlock,
  displayName,
  memberHandle,
  tagline,
  bioBlock,
  badges,
  actions,
  rightColumn,
}: {
  avatarBlock: React.ReactNode;
  displayName: string;
  memberHandle?: string | null;
  tagline?: string;
  bioBlock: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  rightColumn?: React.ReactNode;
}) => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const hasRightColumn = Boolean(rightColumn);

  const mainColumn = (
    <Stack spacing={{ xs: 1.75, md: 2 }} sx={{ minWidth: 0 }}>
      <IdentityHeaderTitleBlock
        displayName={displayName}
        memberHandle={memberHandle}
        tagline={tagline}
        bioBlock={bioBlock}
        includeBio
      />
      {badges ? <Box sx={{ minWidth: 0, width: '100%' }}>{badges}</Box> : null}
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
  );

  if (isNarrow) {
    return (
      <Stack spacing={2} sx={{ width: '100%', minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ minWidth: 0, width: '100%' }}
        >
          <Box
            sx={{
              flexShrink: 0,
              transform: 'scale(0.9)',
              transformOrigin: 'top left',
              width: 108,
              height: 108,
              '& > .MuiStack-root': { alignItems: 'flex-start' },
            }}
          >
            {avatarBlock}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
            <IdentityHeaderTitleBlock
              displayName={displayName}
              memberHandle={memberHandle}
              tagline={tagline}
              bioBlock={bioBlock}
              includeBio={false}
            />
          </Box>
        </Stack>
        <Box sx={{ minWidth: 0, width: '100%' }}>{bioBlock}</Box>
        {badges ? (
          <Box sx={{ minWidth: 0, width: '100%' }}>{badges}</Box>
        ) : null}
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
        {hasRightColumn ? (
          <Box sx={{ minWidth: 0, width: '100%' }}>{rightColumn}</Box>
        ) : null}
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, sm: 2.5, md: 3 },
        alignItems: 'start',
        gridTemplateColumns: {
          xs: '1fr',
          md: hasRightColumn
            ? 'minmax(108px, 128px) minmax(0, 1fr) minmax(200px, 260px)'
            : 'minmax(108px, 128px) minmax(0, 1fr)',
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>{avatarBlock}</Box>
      {mainColumn}
      {hasRightColumn ? (
        <Box sx={{ minWidth: 0, width: '100%' }}>{rightColumn}</Box>
      ) : null}
    </Box>
  );
};

const IdentityHeaderDefaultStack = ({
  avatarBlock,
  displayName,
  memberHandle,
  tagline,
  bioBlock,
  badges,
  slotLeftOfAvatar,
  slotBetweenContentAndActionsLabel,
  slotBetweenContentAndActions,
  actions,
}: {
  avatarBlock: React.ReactNode;
  displayName: string;
  memberHandle?: string | null;
  tagline?: string;
  bioBlock: React.ReactNode;
  badges?: React.ReactNode;
  slotLeftOfAvatar?: React.ReactNode;
  slotBetweenContentAndActionsLabel?: string;
  slotBetweenContentAndActions?: React.ReactNode;
  actions?: React.ReactNode;
}) => {
  return (
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
          <IdentityHeaderTitleBlock
            displayName={displayName}
            memberHandle={memberHandle}
            tagline={tagline}
            bioBlock={bioBlock}
          />

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
  );
};

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
  paperMaxWidth,
  statusEmoji: _statusEmoji,
  statusMessage: _statusMessage,
}: IdentityHeaderProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const cardBg = isLight
    ? alpha(theme.palette.primary.main, 0.06)
    : 'rgba(18, 24, 38, 0.82)';
  const bannerGlow = isLight
    ? `0 0 24px ${alpha(theme.palette.primary.main, 0.12)}, 0 12px 40px ${alpha(theme.palette.common.black, 0.08)}`
    : '0 0 48px rgba(66, 165, 245, 0.14), 0 20px 64px rgba(0,0,0,0.58)';

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

  const bioBlock = (
    <IdentityBioBlock
      theme={theme}
      isLight={isLight}
      layoutVariant={layoutVariant}
      bio={bio}
      bioIsPlaceholder={bioIsPlaceholder}
      onAddBio={onAddBio}
    />
  );

  return (
    <Paper
      elevation={0}
      data-testid="identity-header"
      sx={{
        p: paperMaxWidth
          ? { xs: 1.5, sm: 2, md: 2.75 }
          : { xs: 1.5, sm: 2, md: 4 },
        borderRadius: 4,
        bgcolor: cardBg,
        backdropFilter: 'blur(16px)',
        border: '1px solid',
        borderColor: isLight
          ? alpha(theme.palette.divider, 0.9)
          : 'rgba(156,187,217,0.32)',
        boxShadow: bannerGlow,
        mb: paperMaxWidth ? { xs: 2, sm: 2, md: 2.5 } : { xs: 2, sm: 3, md: 4 },
        maxWidth: paperMaxWidth ?? 'none',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        mx: paperMaxWidth ? 'auto' : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {layoutVariant === 'three-column' ? (
        <IdentityHeaderThreeColumnGrid
          avatarBlock={avatarBlock}
          displayName={displayName}
          memberHandle={memberHandle}
          tagline={tagline}
          bioBlock={bioBlock}
          badges={badges}
          actions={actions}
          rightColumn={rightColumn}
        />
      ) : (
        <IdentityHeaderDefaultStack
          avatarBlock={avatarBlock}
          displayName={displayName}
          memberHandle={memberHandle}
          tagline={tagline}
          bioBlock={bioBlock}
          badges={badges}
          slotLeftOfAvatar={slotLeftOfAvatar}
          slotBetweenContentAndActionsLabel={slotBetweenContentAndActionsLabel}
          slotBetweenContentAndActions={slotBetweenContentAndActions}
          actions={actions}
        />
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
