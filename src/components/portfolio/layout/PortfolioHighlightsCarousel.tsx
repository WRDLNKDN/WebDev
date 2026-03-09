import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import type { PortfolioItem } from '../../../types/portfolio';
import { PortfolioHighlightSlide } from './PortfolioHighlightSlide';

const AUTO_ADVANCE_MS = 3500;
const SWIPE_THRESHOLD_PX = 48;

type PortfolioHighlightsCarouselProps = {
  projects: PortfolioItem[];
  onOpenPreview?: (project: PortfolioItem) => void;
};

export const PortfolioHighlightsCarousel = ({
  projects,
  onOpenPreview,
}: PortfolioHighlightsCarouselProps) => {
  const highlightedProjects = useMemo(
    () => projects.filter((project) => project.is_highlighted),
    [projects],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex((current) =>
      highlightedProjects.length === 0
        ? 0
        : Math.min(current, highlightedProjects.length - 1),
    );
  }, [highlightedProjects.length]);

  useEffect(() => {
    if (paused || highlightedProjects.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % highlightedProjects.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [highlightedProjects.length, paused]);

  if (highlightedProjects.length === 0) return null;

  const goToPrevious = () => {
    setActiveIndex((current) =>
      current === 0 ? highlightedProjects.length - 1 : current - 1,
    );
  };

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % highlightedProjects.length);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    setPaused(true);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null) {
      setPaused(false);
      return;
    }

    const deltaX =
      (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;

    if (
      Math.abs(deltaX) >= SWIPE_THRESHOLD_PX &&
      highlightedProjects.length > 1
    ) {
      if (deltaX < 0) goToNext();
      else goToPrevious();
    }

    setPaused(false);
  };

  return (
    <Paper
      data-testid="portfolio-highlights-carousel"
      data-active-index={activeIndex}
      elevation={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.12)',
        bgcolor: 'rgba(11,18,32,0.82)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <Box sx={{ overflow: 'hidden' }}>
        <Box
          data-testid="portfolio-highlights-track"
          sx={{
            display: 'flex',
            width: '100%',
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: 'transform 320ms ease',
          }}
        >
          {highlightedProjects.map((project, index) => (
            <PortfolioHighlightSlide
              key={project.id}
              project={project}
              index={index}
              activeIndex={activeIndex}
              onOpenPreview={onOpenPreview}
            />
          ))}
        </Box>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: { xs: 1, sm: 2, md: 2.5 },
          py: { xs: 0.75, sm: 1 },
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          data-testid="portfolio-highlights-position"
        >
          {activeIndex + 1} / {highlightedProjects.length}
        </Typography>
        {highlightedProjects.length > 1 ? (
          <Stack direction="row" spacing={{ xs: 0.25, sm: 0.5 }}>
            <Tooltip title="Previous highlight">
              <IconButton
                aria-label="Previous highlight"
                data-testid="portfolio-highlights-prev"
                onClick={goToPrevious}
                size="medium"
                sx={{
                  color: 'white',
                  width: { xs: 40, sm: 32 },
                  height: { xs: 40, sm: 32 },
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Next highlight">
              <IconButton
                aria-label="Next highlight"
                data-testid="portfolio-highlights-next"
                onClick={goToNext}
                size="medium"
                sx={{
                  color: 'white',
                  width: { xs: 40, sm: 32 },
                  height: { xs: 40, sm: 32 },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Box sx={{ width: 64 }} />
        )}
      </Stack>
    </Paper>
  );
};
