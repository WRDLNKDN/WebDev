/**
 * Game end / puzzle complete overlay: celebration-first layout — compact summary,
 * title, one-line cheer, hero image, reward line, actions; optional collapsible details.
 */
import { PlayArrow, ExpandMore } from '@mui/icons-material';
import { Box, Button, Collapse, Stack, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';

export function formatGameElapsedClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface GameEndScreenProps {
  /** Center headline, e.g. "Puzzle Complete" */
  title: string;
  /** One short line under the title (celebration). No sentences. */
  celebrationLine?: string;
  /** Top row: compact numbers only, e.g. "2:04 · 48 · 300" */
  compactSummary?: string;
  /** One row under the image, e.g. "+120 XP · Top 12%" */
  rewardLine?: string;
  replayButtonLabel?: string;
  onReplayClick: () => void;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  imageUrl?: string;
  imageAlt?: string;
  /** Collapsed by default: time-by-area, extra breakdown */
  details?: ReactNode;
}

export const GameEndScreen = ({
  title,
  celebrationLine,
  compactSummary,
  rewardLine,
  replayButtonLabel = 'Watch Replay',
  onReplayClick,
  secondaryLabel,
  onSecondaryClick,
  imageUrl,
  imageAlt = '',
  details,
}: GameEndScreenProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasDetails = Boolean(details);

  return (
    <Box
      sx={{
        mt: 1,
        animation: 'fadeIn 0.4s ease-out',
        textAlign: 'center',
        maxWidth: 400,
        mx: 'auto',
        px: { xs: 0.5, sm: 1 },
      }}
      role="region"
      aria-label="Game results"
    >
      {compactSummary ? (
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{
            m: 0,
            mb: 0.75,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {compactSummary}
        </Typography>
      ) : null}

      <Typography
        variant="h5"
        component="h2"
        sx={{
          color: 'primary.main',
          fontWeight: 800,
          lineHeight: 1.15,
          mb: celebrationLine ? 0.25 : 0,
        }}
      >
        {title}
      </Typography>

      {celebrationLine ? (
        <Typography
          variant="body2"
          color="text.secondary"
          component="p"
          sx={{ m: 0, mb: 1, lineHeight: 1.25 }}
        >
          {celebrationLine}
        </Typography>
      ) : null}

      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt={imageAlt}
          sx={{
            width: '100%',
            maxWidth: 340,
            maxHeight: { xs: 'min(38vh, 240px)', sm: 'min(42vh, 280px)' },
            mx: 'auto',
            display: 'block',
            objectFit: 'contain',
            borderRadius: 2,
            mb: rewardLine ? 0.75 : 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      ) : null}

      {rewardLine ? (
        <Typography
          variant="subtitle2"
          fontWeight={700}
          component="p"
          sx={{
            m: 0,
            mb: 1,
            color: 'secondary.main',
          }}
        >
          {rewardLine}
        </Typography>
      ) : null}

      <Stack
        direction="row"
        justifyContent="center"
        spacing={1}
        flexWrap="wrap"
        sx={{ gap: 0.5 }}
      >
        <Button
          variant="contained"
          size="small"
          onClick={onReplayClick}
          startIcon={<PlayArrow />}
          aria-label={replayButtonLabel}
          sx={{ fontWeight: 700, textTransform: 'none' }}
        >
          {replayButtonLabel}
        </Button>
        {secondaryLabel && onSecondaryClick ? (
          <Button
            variant="outlined"
            size="small"
            onClick={onSecondaryClick}
            aria-label={secondaryLabel}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            {secondaryLabel}
          </Button>
        ) : null}
      </Stack>

      {hasDetails ? (
        <>
          <Button
            size="small"
            variant="text"
            onClick={() => setDetailsOpen((o) => !o)}
            endIcon={
              <ExpandMore
                sx={{
                  transform: detailsOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            }
            aria-expanded={detailsOpen}
            sx={{ mt: 0.75, fontWeight: 600, textTransform: 'none' }}
          >
            View Details
          </Button>
          <Collapse in={detailsOpen}>
            <Box
              sx={{
                mt: 0.75,
                textAlign: 'left',
                typography: 'body2',
                color: 'text.secondary',
              }}
            >
              {details}
            </Box>
          </Collapse>
        </>
      ) : null}
    </Box>
  );
};
