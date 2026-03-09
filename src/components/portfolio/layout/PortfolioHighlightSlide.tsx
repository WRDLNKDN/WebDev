import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import type { PortfolioItem } from '../../../types/portfolio';

const getPreviewMediaUrl = (project: PortfolioItem): string | null =>
  project.image_url || project.thumbnail_url || null;

const isExternalUrl = (url: string): boolean => {
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

type PortfolioHighlightSlideProps = {
  project: PortfolioItem;
  index: number;
  activeIndex: number;
  onOpenPreview?: (project: PortfolioItem) => void;
};

export const PortfolioHighlightSlide = ({
  project,
  index,
  activeIndex,
  onOpenPreview,
}: PortfolioHighlightSlideProps) => {
  const previewMediaUrl = getPreviewMediaUrl(project);
  const projectUrl = project.project_url?.trim() ?? '';
  const categories = (project.tech_stack ?? [])
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Box
      key={project.id}
      data-testid={`portfolio-highlight-slide-${project.id}`}
      aria-hidden={index !== activeIndex}
      sx={{ minWidth: '100%', p: { xs: 1.25, sm: 2, md: 2.5, lg: 3 } }}
    >
      <Box
        sx={{
          display: 'grid',
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
          onClick={onOpenPreview ? () => onOpenPreview(project) : undefined}
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
            aspectRatio: { xs: '4 / 3', sm: '16 / 9' },
            borderRadius: 2.5,
            overflow: 'hidden',
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: onOpenPreview ? 'pointer' : 'default',
          }}
        >
          {previewMediaUrl ? (
            <Box
              component="img"
              src={previewMediaUrl}
              alt={project.title}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                width: '100%',
                height: '100%',
                px: 3,
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography variant="body2">Preview media unavailable</Typography>
            </Stack>
          )}
        </Box>

        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
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
            }}
          >
            {project.title}
          </Typography>
          {categories.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {categories.map((category) => (
                <Chip
                  key={`${project.id}-highlight-${category}`}
                  size="small"
                  label={category}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.08)',
                    color: 'text.secondary',
                    border: '1px solid rgba(255,255,255,0.16)',
                  }}
                />
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
                target={isExternalUrl(projectUrl) ? '_blank' : undefined}
                rel={
                  isExternalUrl(projectUrl) ? 'noopener noreferrer' : undefined
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
};
