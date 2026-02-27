/**
 * FeedReactionBar — Like / Love / Insightful / Care reaction button + popover.
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
import type { ReactionType } from '../../lib/api/feedsApi';
import { useState } from 'react';

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
    color: 'success.main',
  },
];

export type FeedReactionBarProps = {
  viewerReaction: ReactionType | null;
  likeCount: number;
  loveCount: number;
  inspirationCount: number;
  careCount: number;
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
  onReaction,
  onRemoveReaction,
  sx,
}: FeedReactionBarProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const totalReactions = likeCount + loveCount + inspirationCount + careCount;
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
    <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 0.25, sm: 0.5 },
          py: { xs: 1, sm: 0.75 },
          px: 0.5,
          ...sx,
        }}
      >
        <Button
          size="small"
          onClick={(e) => {
            setAnchorEl((prev) =>
              prev ? null : (e.currentTarget as HTMLElement),
            );
          }}
          sx={{
            textTransform: 'none',
            color: viewerReaction ? current.color : 'text.secondary',
            minWidth: 0,
            minHeight: 0,
            p: 0,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            gap: { xs: 0.25, sm: 0.5 },
            '&:hover': {
              bgcolor: 'action.hover',
              color: viewerReaction ? current.color : 'text.secondary',
            },
          }}
          aria-label={
            viewerReaction ? `${current.label} (click to remove)` : 'Like'
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
            {viewerReaction ? current.label : 'Like'}
            {totalReactions > 0 ? ` · ${totalReactions}` : ''}
          </Typography>
        </Button>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{
            paper: { sx: { borderRadius: 2, boxShadow: 2, p: 0.5 } },
          }}
        >
          <Stack direction="row" spacing={0.5} sx={{ py: 0.5 }}>
            {REACTION_OPTIONS.map(({ type, label, Icon, color }) => (
              <IconButton
                key={type}
                size="small"
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
        </Popover>
      </Box>
    </ClickAwayListener>
  );
};
