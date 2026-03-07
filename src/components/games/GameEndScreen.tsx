/**
 * GameEndScreen – end-of-game overlay with stats (time, moves/score) and a clear replay/play-again button.
 * Use for puzzle completion, runner game over, or any activity that shows a final screen.
 */
import { Box, Button, Stack, Typography } from '@mui/material';
import { PlayArrow } from '@mui/icons-material';

export interface GameEndScreenStat {
  label: string;
  value: string | number;
}

export interface GameEndScreenProps {
  /** Title, e.g. "Puzzle Complete" or "Game Over" */
  title: string;
  /** Optional subtitle or message */
  subtitle?: string;
  /** Stats to show (time, moves, score, etc.) */
  stats?: GameEndScreenStat[];
  /** Label for the main action button */
  replayButtonLabel?: string;
  /** Called when user clicks the replay/play-again button */
  onReplayClick: () => void;
  /** Optional secondary action (e.g. "Share") */
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  /** Optional image URL to show (e.g. completed puzzle) */
  imageUrl?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const GameEndScreen = ({
  title,
  subtitle,
  stats = [],
  replayButtonLabel = 'Watch Replay',
  onReplayClick,
  secondaryLabel,
  onSecondaryClick,
  imageUrl,
}: GameEndScreenProps) => {
  return (
    <Box
      sx={{
        mt: 2,
        animation: 'fadeIn 0.4s ease-out',
        textAlign: 'center',
        maxWidth: 360,
        mx: 'auto',
      }}
      role="region"
      aria-label="Game results"
    >
      <Typography
        variant="h5"
        sx={{
          color: 'primary.main',
          mb: 0.5,
          fontWeight: 700,
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {subtitle}
        </Typography>
      )}

      {stats.length > 0 && (
        <Stack
          direction="row"
          flexWrap="wrap"
          justifyContent="center"
          gap={2}
          sx={{ mb: 2 }}
        >
          {stats.map(({ label, value }) => (
            <Box
              key={label}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: 'action.hover',
                minWidth: 80,
              }}
            >
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                {label}
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {typeof value === 'number' &&
                label.toLowerCase().includes('time')
                  ? formatTime(value)
                  : value}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {imageUrl && (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          sx={{
            width: '100%',
            maxHeight: 180,
            objectFit: 'contain',
            borderRadius: 2,
            mb: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      )}

      <Stack
        direction="row"
        justifyContent="center"
        spacing={1}
        flexWrap="wrap"
      >
        <Button
          variant="contained"
          size="medium"
          onClick={onReplayClick}
          startIcon={<PlayArrow />}
          aria-label={replayButtonLabel}
          sx={{
            px: 2.5,
            py: 1.25,
            fontWeight: 600,
          }}
        >
          {replayButtonLabel}
        </Button>
        {secondaryLabel && onSecondaryClick && (
          <Button
            variant="outlined"
            size="medium"
            onClick={onSecondaryClick}
            aria-label={secondaryLabel}
            sx={{ px: 2.5, py: 1.25, fontWeight: 600 }}
          >
            {secondaryLabel}
          </Button>
        )}
      </Stack>
    </Box>
  );
};
