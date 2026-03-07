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
  Stack,
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
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentSatisfiedOutlinedIcon from '@mui/icons-material/SentimentSatisfiedOutlined';
import MoodBadIcon from '@mui/icons-material/MoodBad';
import MoodBadOutlinedIcon from '@mui/icons-material/MoodBadOutlined';
import type { ReactionType } from '../../lib/api/feedsApi';
import { useRef, useState } from 'react';

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
    color: 'primary.main',
  },
  {
    type: 'love',
    label: 'Love',
    Icon: FavoriteIcon,
    IconOutlined: FavoriteBorderIcon,
    color: 'error.main',
  },
  {
    type: 'inspiration',
    label: 'Insightful',
    Icon: LightbulbIcon,
    IconOutlined: LightbulbOutlinedIcon,
    color: 'warning.main',
  },
  {
    type: 'care',
    label: 'Care',
    Icon: VolunteerActivismIcon,
    IconOutlined: VolunteerActivismOutlinedIcon,
    color: '#9c27b0',
  },
  {
    type: 'laughing',
    label: 'Happy',
    Icon: SentimentSatisfiedIcon,
    IconOutlined: SentimentSatisfiedOutlinedIcon,
    color: '#66bb6a',
  },
  {
    type: 'rage',
    label: 'Rage',
    Icon: MoodBadIcon,
    IconOutlined: MoodBadOutlinedIcon,
    color: 'error.dark',
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
  const HOVER_CLOSE_DELAY_MS = 90;
  const POPOVER_TRANSITION_MS = 40;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const hoverCloseRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (hoverCloseRef.current) {
      clearTimeout(hoverCloseRef.current);
      hoverCloseRef.current = null;
    }
  };

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

  const openPicker = () => {
    clearCloseTimer();
    if (triggerRef.current) {
      setAnchorEl(triggerRef.current);
    }
  };

  const scheduleClosePicker = () => {
    if (hoverCloseRef.current) {
      clearTimeout(hoverCloseRef.current);
    }
    hoverCloseRef.current = window.setTimeout(
      () => setAnchorEl(null),
      HOVER_CLOSE_DELAY_MS,
    ) as unknown as number;
  };

  return (
    <ClickAwayListener
      onClickAway={() => {
        clearCloseTimer();
        setAnchorEl(null);
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: { xs: 0.25, sm: 0.5 },
          py: { xs: 0.75, sm: 0.5 },
          px: 0.5,
          ...sx,
        }}
        onMouseLeave={() => {
          clearCloseTimer();
          scheduleClosePicker();
        }}
      >
        <Button
          size="small"
          ref={triggerRef}
          onMouseEnter={openPicker}
          onMouseOver={openPicker}
          onPointerEnter={openPicker}
          onPointerOver={openPicker}
          onMouseLeave={scheduleClosePicker}
          onFocus={openPicker}
          onClick={(e) => {
            setAnchorEl((prev) =>
              prev ? null : (e.currentTarget as HTMLElement),
            );
          }}
          sx={{
            textTransform: 'none',
            color: viewerReaction ? current.color : 'primary.main',
            minWidth: 0,
            minHeight: 0,
            p: 0,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            gap: { xs: 0.25, sm: 0.5 },
            borderRadius: 2,
            '&:hover': {
              bgcolor: viewerReaction
                ? 'rgba(66, 165, 245, 0.12)'
                : 'rgba(66, 165, 245, 0.12)',
              color: viewerReaction ? current.color : 'primary.light',
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
              color: viewerReaction ? current.color : undefined,
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
          <Box
            onMouseEnter={() => {
              if (hoverCloseRef.current) {
                clearTimeout(hoverCloseRef.current);
                hoverCloseRef.current = null;
              }
            }}
            onMouseLeave={scheduleClosePicker}
          >
            <Stack direction="row" spacing={0.5} sx={{ py: 0.5 }}>
              {REACTION_OPTIONS.map(({ type, label, Icon, color }) => (
                <IconButton
                  key={type}
                  size="small"
                  data-reaction-color={color}
                  onClick={() => {
                    handleReaction(type);
                    setAnchorEl(null);
                  }}
                  sx={{ color, '&:hover': { bgcolor: 'action.hover', color } }}
                  aria-label={label}
                >
                  <Icon sx={{ fontSize: 24, color: 'inherit' }} />
                </IconButton>
              ))}
            </Stack>
          </Box>
        </Popover>
      </Box>
    </ClickAwayListener>
  );
};
