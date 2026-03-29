import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { PortfolioPreviewFallback } from '../PortfolioPreviewFallback';
import { getProjectDisplayCategories } from '../../../lib/portfolio/categoryUtils';
import { getProjectPreviewFallbackLabel } from '../../../lib/portfolio/projectPreview';
import type { PortfolioItem } from '../../../types/portfolio';

const AUTO_ADVANCE_MS = 3500;
const SWIPE_THRESHOLD_PX = 48;

const getPreviewMediaUrl = (project: PortfolioItem): string | null =>
  project.image_url || project.thumbnail_url || null;

const isExternalUrl = (url: string): boolean => {
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

type PortfolioHighlightsCarouselProps = {
  projects: PortfolioItem[];
  onOpenPreview?: (project: PortfolioItem) => void;
};

export const PortfolioHighlightsCarousel = ({
  projects,
  onOpenPreview,
}: PortfolioHighlightsCarouselProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
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
        border: isLight
          ? `1px solid ${theme.palette.divider}`
          : '1px solid rgba(156,187,217,0.26)',
        bgcolor: isLight
          ? alpha(theme.palette.primary.main, 0.04)
          : 'rgba(11,18,32,0.82)',
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
          {highlightedProjects.map((project, index) => {
            const previewMediaUrl = getPreviewMediaUrl(project);
            const projectUrl = project.project_url?.trim() ?? '';
            const categories = getProjectDisplayCategories(project.tech_stack);

            return (
              <Box
                key={project.id}
                data-testid={`portfolio-highlight-slide-${project.id}`}
                aria-hidden={index !== activeIndex}
                sx={{
                  boxSizing: 'border-box',
                  width: '100%',
                  minWidth: '100%',
                  p: { xs: 1.25, sm: 2, md: 2.5, lg: 3 },
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    minWidth: 0,
                    gap: { xs: 1.5, sm: 2, md: 2.5, lg: 3 },
                    gridTemplateColumns: {
                      xs: '1fr',
                      lg: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
                    },
                    alignItems: 'stretch',
                  }}
                >
                  <Box
                    role={onOpenPreview ? 'button' : undefined}
                    tabIndex={onOpenPreview ? 0 : undefined}
                    onClick={
                      onOpenPreview
                        ? () => {
                            onOpenPreview(project);
                          }
                        : undefined
                    }
                    onKeyDown={
                      onOpenPreview
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onOpenPreview(project);
                            }
                          }
                        : undefined
                    }
                    sx={{
                      position: 'relative',
                      minWidth: 0,
                      aspectRatio: { xs: '4 / 3', sm: '16 / 9' },
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      bgcolor: isLight
                        ? alpha(theme.palette.primary.main, 0.06)
                        : 'rgba(56,132,210,0.10)',
                      border: isLight
                        ? `1px solid ${theme.palette.divider}`
                        : '1px solid rgba(156,187,217,0.18)',
                      cursor: onOpenPreview ? 'pointer' : 'default',
                    }}
                  >
                    {previewMediaUrl ? (
                      <Box
                        component="img"
                        src={previewMediaUrl}
                        alt={project.title}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <PortfolioPreviewFallback
                        project={project}
                        label={
                          project.title?.trim() ||
                          getProjectPreviewFallbackLabel(project)
                        }
                        compact
                      />
                    )}
                  </Box>

                  <Stack spacing={1.5} sx={{ minWidth: 0, width: '100%' }}>
                    <Typography
                      variant="overline"
                      sx={{
                        color: 'secondary.light',
                        letterSpacing: 1.2,
                        fontWeight: 700,
                      }}
                    >
                      Highlights
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.1,
                        fontSize: { xs: '1.3rem', sm: '1.5rem' },
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {project.title}
                    </Typography>
                    {categories.length > 0 ? (
                      <Box
                        sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
                      >
                        {categories.map((category) => (
                          <Box
                            component="span"
                            key={`${project.id}-highlight-${category}`}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              bgcolor: 'rgba(156,187,217,0.18)',
                              color: 'text.secondary',
                              border: '1px solid rgba(156,187,217,0.32)',
                              fontSize: '0.8125rem',
                              fontWeight: 500,
                              cursor: 'default',
                              userSelect: 'none',
                            }}
                          >
                            {category}
                          </Box>
                        ))}
                      </Box>
                    ) : null}
                    {project.description ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: { xs: 4, md: 5 },
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {project.description}
                      </Typography>
                    ) : null}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      sx={{ pt: 0.5 }}
                    >
                      {onOpenPreview ? (
                        <Button
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => onOpenPreview(project)}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            width: { xs: '100%', sm: 'auto' },
                          }}
                        >
                          Preview
                        </Button>
                      ) : null}
                      {projectUrl ? (
                        <Button
                          variant="contained"
                          href={projectUrl}
                          target={
                            isExternalUrl(projectUrl) ? '_blank' : undefined
                          }
                          rel={
                            isExternalUrl(projectUrl)
                              ? 'noopener noreferrer'
                              : undefined
                          }
                          endIcon={<OpenInNewIcon />}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            width: { xs: '100%', sm: 'auto' },
                          }}
                        >
                          Open artifact
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: { xs: 1, sm: 2, md: 2.5 },
          py: { xs: 0.75, sm: 1 },
          borderTop: '1px solid rgba(156,187,217,0.18)',
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
