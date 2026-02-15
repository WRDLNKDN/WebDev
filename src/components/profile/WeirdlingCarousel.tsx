import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { GLASS_CARD } from '../../theme/candyStyles';
import type { Weirdling } from '../../types/weirdling';

const AUTO_ADVANCE_MS = 4500;

interface WeirdlingCarouselProps {
  weirdlings: Weirdling[] | null | undefined;
  onRemove?: (id: string) => void | Promise<void>;
  /** When provided, "Add your weirdling" and "Edit" open this instead of navigating to /weirdling/create */
  onAddClick?: () => void;
}

export const WeirdlingCarousel = ({
  weirdlings,
  onRemove,
  onAddClick,
}: WeirdlingCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const list = Array.isArray(weirdlings) ? weirdlings : [];
  const count = list.length;
  const current = count > 0 ? list[currentIndex % count] : null;

  useEffect(() => {
    if (count > 0 && currentIndex >= count) {
      setCurrentIndex(Math.max(0, count - 1));
    }
  }, [count, currentIndex]);

  useEffect(() => {
    if (!isPlaying || count <= 1) return;
    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [isPlaying, count]);

  if (weirdlings === undefined) {
    return (
      <Paper
        elevation={0}
        sx={{ ...GLASS_CARD, p: { xs: 2, md: 4 }, mb: { xs: 3, md: 4 } }}
      >
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Loading…</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        ...GLASS_CARD,
        p: { xs: 2, md: 3 },
        mb: { xs: 3, md: 4 },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="flex-end"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 2 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          flexWrap="wrap"
          sx={{ justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}
        >
          <Button
            {...(onAddClick
              ? { onClick: onAddClick }
              : { component: RouterLink, to: '/weirdling/create' })}
            variant="outlined"
            size="small"
            sx={{
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.light',
                color: 'primary.light',
              },
            }}
          >
            Add your weirdling
          </Button>
          {count > 1 && (
            <>
              <IconButton
                size="small"
                onClick={() => setCurrentIndex((i) => (i - 1 + count) % count)}
                sx={{ color: 'white' }}
                aria-label="Previous"
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setIsPlaying((p) => !p)}
                sx={{ color: 'white' }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <PauseIcon fontSize="small" />
                ) : (
                  <PlayArrowIcon fontSize="small" />
                )}
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setCurrentIndex((i) => (i + 1) % count)}
                sx={{ color: 'white' }}
                aria-label="Next"
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          )}
        </Stack>
      </Stack>

      {count === 0 ? (
        <Box
          sx={{
            py: 6,
            px: 2,
            textAlign: 'center',
            border: '2px dashed rgba(255,255,255,0.2)',
            borderRadius: 2,
          }}
        >
          <Typography color="text.secondary">
            No Weirdling yet. Create one to show here.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            minHeight: 200,
            position: 'relative',
          }}
        >
          <Box
            key={current?.id ?? 'slide'}
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'flex-start',
              gap: 3,
              width: '100%',
              maxWidth: 480,
              p: 2,
              borderRadius: 3,
              bgcolor: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {onRemove && current && (
              <IconButton
                size="small"
                aria-label={`Remove ${current.displayName}`}
                onClick={() => void onRemove(current.id)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { bgcolor: 'error.main', color: 'white' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
            {current?.avatarUrl && (
              <Box
                component="img"
                src={current.avatarUrl}
                alt={current.displayName}
                sx={{
                  width: { xs: 80, sm: 120 },
                  height: { xs: 80, sm: 120 },
                  borderRadius: 3,
                  objectFit: 'cover',
                  border: '2px solid rgba(255,255,255,0.15)',
                  flexShrink: 0,
                }}
              />
            )}
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700}>
                {current?.displayName}
              </Typography>
              {current?.tagline && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: 'italic' }}
                >
                  &ldquo;{current.tagline}&rdquo;
                </Typography>
              )}
              {current?.roleVibe && (
                <Typography variant="caption" color="primary.main">
                  {current.roleVibe}
                </Typography>
              )}
              <Button
                {...(onAddClick
                  ? { onClick: onAddClick }
                  : { component: RouterLink, to: '/weirdling/create' })}
                variant="outlined"
                size="small"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                sx={{
                  alignSelf: 'flex-start',
                  mt: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                }}
              >
                Edit
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {count > 1 && (
        <Stack
          direction="row"
          justifyContent="flex-start"
          gap={0.5}
          sx={{ mt: 2 }}
        >
          {list.map((_, i) => (
            <IconButton
              key={i}
              size="small"
              onClick={() => setCurrentIndex(i)}
              sx={{
                width: 28,
                height: 28,
                p: 0,
                color:
                  i === currentIndex % count
                    ? 'primary.main'
                    : 'rgba(255,255,255,0.4)',
                '&:hover': { color: 'primary.light' },
              }}
              aria-label={`Go to slide ${i + 1}`}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'currentColor',
                }}
              />
            </IconButton>
          ))}
        </Stack>
      )}
    </Paper>
  );
};
