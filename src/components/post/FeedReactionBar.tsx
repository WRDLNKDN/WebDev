/**
 * FeedReactionBar — React (default) / Like / Love / Insightful / Care / Laughing / Rage.
 * Shared reaction UI for Feed (and any surface using feed-style reactions).
 */
import {
  Box,
  Button,
  ClickAwayListener,
  IconButton,
  Popover,
  SvgIcon,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { useId, useState } from 'react';
import { REACTION_COLORS } from '../../constants/reactionColors';
import type { ReactionType } from '../../lib/api/feedsApi';

const FEED_ACTION_MUTED_COLOR = 'rgba(255,255,255,0.65)';

const LaughReactionIcon = ({ sx }: { sx?: object }) => (
  <SvgIcon viewBox="0 0 24 24" sx={sx} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="#FACC15" />
    <path
      d="M8 10.2C8.65 9.1 9.45 8.55 10.45 8.55C11.45 8.55 12.2 9.1 12.8 10.2"
      fill="none"
      stroke="#7C2D12"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M11.2 10.2C11.85 9.1 12.65 8.55 13.65 8.55C14.65 8.55 15.4 9.1 16 10.2"
      fill="none"
      stroke="#7C2D12"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M7.2 13.2C8.6 16.85 15.4 16.85 16.8 13.2C16.95 12.8 16.65 12.4 16.2 12.4H7.8C7.35 12.4 7.05 12.8 7.2 13.2Z"
      fill="#7C2D12"
    />
    <path
      d="M8.55 12.95C9.55 14.35 14.45 14.35 15.45 12.95"
      fill="none"
      stroke="#FCA5A5"
      strokeWidth="0.9"
      strokeLinecap="round"
    />
    <path
      d="M5.9 11.7C5.05 12.8 5.05 14.15 5.95 15.05C6.3 15.4 6.85 15.35 7.1 14.95C7.45 14.4 7.75 13.9 7.95 13.35C8.1 12.9 7.85 12.45 7.4 12.25L6.5 11.85C6.3 11.75 6.05 11.55 5.9 11.7Z"
      fill="#38BDF8"
    />
    <path
      d="M18.1 11.7C18.95 12.8 18.95 14.15 18.05 15.05C17.7 15.4 17.15 15.35 16.9 14.95C16.55 14.4 16.25 13.9 16.05 13.35C15.9 12.9 16.15 12.45 16.6 12.25L17.5 11.85C17.7 11.75 17.95 11.55 18.1 11.7Z"
      fill="#38BDF8"
    />
  </SvgIcon>
);

const LaughReactionOutlinedIcon = ({ sx }: { sx?: object }) => (
  <SvgIcon viewBox="0 0 24 24" sx={sx} aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="8.5"
      fill="#FEF3C7"
      stroke="#D97706"
      strokeWidth="1.4"
    />
    <path
      d="M8.2 10.15C8.85 9.15 9.55 8.7 10.4 8.7C11.2 8.7 11.9 9.15 12.45 10.15"
      fill="none"
      stroke="#92400E"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M11.55 10.15C12.1 9.15 12.8 8.7 13.6 8.7C14.45 8.7 15.15 9.15 15.8 10.15"
      fill="none"
      stroke="#92400E"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M7.5 13C8.85 16.1 15.15 16.1 16.5 13"
      fill="none"
      stroke="#92400E"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M6.1 12.1C5.5 12.95 5.5 13.95 6.15 14.65"
      fill="none"
      stroke="#38BDF8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M17.9 12.1C18.5 12.95 18.5 13.95 17.85 14.65"
      fill="none"
      stroke="#38BDF8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </SvgIcon>
);

const RageReactionIcon = ({ sx }: { sx?: object }) => {
  const gradientId = useId();

  return (
    <SvgIcon viewBox="0 0 24 24" sx={sx} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="6" y1="5" x2="18" y2="19">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill={`url(#${gradientId})`} />
      <path
        d="M7.1 10.1L10.05 8.95"
        fill="none"
        stroke="#4A0D0D"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M16.9 10.1L13.95 8.95"
        fill="none"
        stroke="#4A0D0D"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M8.35 12.45L10.35 11.8"
        fill="none"
        stroke="#4A0D0D"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M15.65 12.45L13.65 11.8"
        fill="none"
        stroke="#4A0D0D"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8.4 16.05C9.35 14.55 10.55 13.9 12 13.9C13.45 13.9 14.65 14.55 15.6 16.05"
        fill="none"
        stroke="#4A0D0D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.3 7.55C9.1 6.7 10 6.3 11 6.3"
        fill="none"
        stroke="#FCA5A5"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M15.7 7.55C14.9 6.7 14 6.3 13 6.3"
        fill="none"
        stroke="#FCA5A5"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.9"
      />
    </SvgIcon>
  );
};

const RageReactionOutlinedIcon = ({ sx }: { sx?: object }) => (
  <SvgIcon viewBox="0 0 24 24" sx={sx} aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="8.5"
      fill="#FEE2E2"
      stroke="#EF4444"
      strokeWidth="1.4"
    />
    <path
      d="M7.3 10.05L9.95 9"
      fill="none"
      stroke="#7F1D1D"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M16.7 10.05L14.05 9"
      fill="none"
      stroke="#7F1D1D"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M8.45 12.4L10.2 11.85"
      fill="none"
      stroke="#7F1D1D"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M15.55 12.4L13.8 11.85"
      fill="none"
      stroke="#7F1D1D"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M8.6 15.8C9.45 14.55 10.6 13.95 12 13.95C13.4 13.95 14.55 14.55 15.4 15.8"
      fill="none"
      stroke="#7F1D1D"
      strokeWidth="1.85"
      strokeLinecap="round"
    />
  </SvgIcon>
);

/** Exported for comment reaction bars in Feed */
export const REACTION_OPTIONS: {
  type: ReactionType;
  label: string;
  Icon: React.ComponentType<{ sx?: object }>;
  IconOutlined: React.ComponentType<{ sx?: object }>;
  color: string;
}[] = [
  {
    type: 'like',
    label: 'Like',
    Icon: ThumbUpIcon,
    IconOutlined: ThumbUpOutlinedIcon,
    color: REACTION_COLORS.like,
  },
  {
    type: 'love',
    label: 'Love',
    Icon: FavoriteIcon,
    IconOutlined: FavoriteBorderIcon,
    color: REACTION_COLORS.love,
  },
  {
    type: 'inspiration',
    label: 'Insightful',
    Icon: LightbulbIcon,
    IconOutlined: LightbulbOutlinedIcon,
    color: REACTION_COLORS.inspiration,
  },
  {
    type: 'care',
    label: 'Care',
    Icon: VolunteerActivismIcon,
    IconOutlined: VolunteerActivismOutlinedIcon,
    color: REACTION_COLORS.care,
  },
  {
    type: 'laughing',
    label: 'Happy',
    Icon: LaughReactionIcon,
    IconOutlined: LaughReactionOutlinedIcon,
    color: REACTION_COLORS.laughing,
  },
  {
    type: 'rage',
    label: 'Rage',
    Icon: RageReactionIcon,
    IconOutlined: RageReactionOutlinedIcon,
    color: REACTION_COLORS.rage,
  },
];

export type FeedReactionBarProps = {
  viewerReaction: ReactionType | null;
  likeCount: number;
  loveCount: number;
  inspirationCount: number;
  careCount: number;
  laughingCount: number;
  rageCount: number;
  onReaction: (type: ReactionType) => void;
  onRemoveReaction: () => void;
  /** Optional: constrain width/layout to match feed action row */
  sx?: object;
};

export const FeedReactionBar = ({
  viewerReaction,
  likeCount,
  loveCount,
  inspirationCount,
  careCount,
  laughingCount,
  rageCount,
  onReaction,
  onRemoveReaction,
  sx,
}: FeedReactionBarProps) => {
  const POPOVER_TRANSITION_MS = 40;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const totalReactions =
    likeCount +
    loveCount +
    inspirationCount +
    careCount +
    laughingCount +
    rageCount;
  const current =
    REACTION_OPTIONS.find((r) => r.type === viewerReaction) ??
    REACTION_OPTIONS[0];
  const CurrentIcon = viewerReaction ? current.Icon : current.IconOutlined;

  const handleReaction = (type: ReactionType) => {
    if (viewerReaction === type) {
      onRemoveReaction();
    } else {
      onReaction(type);
    }
  };

  return (
    <ClickAwayListener
      onClickAway={() => {
        setAnchorEl(null);
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 2.5,
          pt: 1,
          pb: 0.75,
          px: 0,
          ...sx,
        }}
      >
        <Button
          size="small"
          onFocus={(e) => setAnchorEl(e.currentTarget)}
          onClick={(e) => {
            setAnchorEl((prev) =>
              prev ? null : (e.currentTarget as HTMLElement),
            );
          }}
          sx={{
            textTransform: 'none',
            color: viewerReaction ? current.color : FEED_ACTION_MUTED_COLOR,
            minWidth: 0,
            minHeight: 0,
            py: { xs: 0.75, sm: 0.5 },
            px: 0,
            display: 'inline-flex',
            flexDirection: { xs: 'row', sm: 'row' },
            alignItems: 'center',
            gap: 0.625,
            borderRadius: 2,
            transition:
              'color 120ms ease, transform 120ms ease, background-color 120ms ease',
            '&:hover': {
              bgcolor: 'transparent',
              color: current.color,
              transform: 'scale(1.08)',
            },
          }}
          aria-label={
            viewerReaction ? `${current.label} (click to remove)` : 'React'
          }
          aria-haspopup="true"
          aria-expanded={Boolean(anchorEl)}
        >
          <CurrentIcon
            sx={{
              fontSize: { xs: 22, sm: 20 },
              color: 'inherit',
            }}
          />
          <Typography
            component="span"
            variant="caption"
            sx={{
              color: 'inherit',
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
            }}
          >
            {viewerReaction ? current.label : 'React'}
            {totalReactions > 0 ? ` · ${totalReactions}` : ''}
          </Typography>
        </Button>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
          transitionDuration={POPOVER_TRANSITION_MS}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{
            paper: { sx: { borderRadius: 2, boxShadow: 2, p: 0.5 } },
          }}
        >
          <Stack direction="row" spacing={0.5} sx={{ py: 0.5 }}>
            {REACTION_OPTIONS.map(({ type, label, Icon, color }) => (
              <Tooltip key={type} title={label}>
                <IconButton
                  size="small"
                  data-reaction-color={color}
                  onClick={() => {
                    handleReaction(type);
                    setAnchorEl(null);
                  }}
                  sx={{
                    color,
                    '&:hover': { bgcolor: 'action.hover', color },
                  }}
                  aria-label={label}
                >
                  <Icon sx={{ fontSize: 24, color: 'inherit' }} />
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
        </Popover>
      </Box>
    </ClickAwayListener>
  );
};
