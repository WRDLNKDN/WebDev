import { Box, Typography } from '@mui/material';
import { PortfolioFrame } from '../../../components/portfolio/layout/PortfolioFrame';
import { PortfolioHighlightsCarousel } from '../../../components/portfolio/layout/PortfolioHighlightsCarousel';
import { ProjectCard } from '../../../components/portfolio/cards/ProjectCard';
import { ResumeCard } from '../../../components/portfolio/cards/ResumeCard';
import { buildResumePreviewItem } from '../../../lib/portfolio/resumePreviewItem';
import { portfolioCategoryToSectionTestId } from '../../../lib/portfolio/portfolioSections';
import type { PortfolioItem } from '../../../types/portfolio';

export type ProfilePortfolioShowcaseProps = {
  frameTitle: string;
  projects: PortfolioItem[];
  portfolioSections: Array<{ category: string; projects: PortfolioItem[] }>;
  resumeUrl: string | null | undefined;
  resumeFileName: string | null | undefined;
  resumeThumbnailUrl: string | null | undefined;
  resumeThumbnailStatus: 'pending' | 'complete' | 'failed' | null | undefined;
  onOpenPreview: (project: PortfolioItem | null) => void;
};

/**
 * Shared portfolio frame: highlights carousel, resume card, and category grids.
 */
export const ProfilePortfolioShowcase = ({
  frameTitle,
  projects,
  portfolioSections,
  resumeUrl,
  resumeFileName,
  resumeThumbnailUrl,
  resumeThumbnailStatus,
  onOpenPreview,
}: ProfilePortfolioShowcaseProps) => {
  const resumePreviewProject = buildResumePreviewItem({
    url: resumeUrl ?? undefined,
    fileName: resumeFileName ?? undefined,
    thumbnailUrl: resumeThumbnailUrl ?? undefined,
    thumbnailStatus: resumeThumbnailStatus ?? undefined,
  });

  return (
    <PortfolioFrame title={frameTitle}>
      <PortfolioHighlightsCarousel
        projects={projects}
        onOpenPreview={(p) => onOpenPreview(p)}
      />
      <ResumeCard
        url={resumeUrl}
        fileName={resumeFileName}
        thumbnailUrl={resumeThumbnailUrl}
        thumbnailStatus={resumeThumbnailStatus}
        onOpenPreview={onOpenPreview}
        previewProject={resumePreviewProject}
      />
      {portfolioSections.map((section) => (
        <Box
          key={section.category}
          data-testid={portfolioCategoryToSectionTestId(section.category)}
          sx={{ width: '100%' }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              fontWeight: 700,
              letterSpacing: 1.1,
              mb: 1.5,
              color: 'text.secondary',
            }}
          >
            {section.category}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 1.5, sm: 2, md: 2.5 },
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              alignItems: 'stretch',
            }}
          >
            {section.projects.map((project) => (
              <ProjectCard
                key={`${section.category}-${project.id}`}
                project={project}
                variant="showcase"
                onOpenPreview={(p) => onOpenPreview(p)}
              />
            ))}
          </Box>
        </Box>
      ))}
    </PortfolioFrame>
  );
};
