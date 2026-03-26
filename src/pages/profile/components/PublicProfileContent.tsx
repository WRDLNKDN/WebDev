import { Box, Container, Grid, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { PortfolioFrame } from '../../../components/portfolio/layout/PortfolioFrame';
import { PortfolioHighlightsCarousel } from '../../../components/portfolio/layout/PortfolioHighlightsCarousel';
import { PortfolioPreviewModal } from '../../../components/portfolio/dialogs/PortfolioPreviewModal';
import { ProjectCard } from '../../../components/portfolio/cards/ProjectCard';
import { ResumeCard } from '../../../components/portfolio/cards/ResumeCard';
import { IdentityHeader } from '../../../components/profile/identity/IdentityHeader';
import { IndustryGroupBlock } from '../../../components/profile/identity/IndustryGroupBlock';
import { SkillsInterestsPills } from '../../../components/profile/identity/SkillsInterestsPills';
import { ProfileLinksWidget } from '../../../components/profile/links/ProfileLinksWidget';
import { buildResumePreviewItem } from '../../../lib/portfolio/resumePreviewItem';
import { portfolioCategoryToSectionTestId } from '../../../lib/portfolio/portfolioSections';
import type { PortfolioItem } from '../../../types/portfolio';
import type { IndustryGroup, NerdCreds } from '../../../types/profile';
import { safeStr } from '../../../utils/stringUtils';
import type { PublicProfilePayload } from '../publicProfileData';

type PublicProfileContentProps = {
  profile: PublicProfilePayload['profile'];
  creds: NerdCreds;
  socials: Parameters<typeof ProfileLinksWidget>[0]['socials'];
  hasLinks: boolean;
  selectedSkills: string[];
  selectedInterests?: string[];
  industryGroups: IndustryGroup[];
  nicheField: string | null;
  projects: PortfolioItem[];
  portfolioSections: Array<{ category: string; projects: PortfolioItem[] }>;
  resumeFileName: string | null;
  resumeThumbnailUrl: string | null;
  resumeThumbnailStatus: 'pending' | 'complete' | 'failed' | null;
  previewProject: PortfolioItem | null;
  onOpenPreview: (project: PortfolioItem | null) => void;
};

export const PublicProfileContent = ({
  profile,
  creds,
  socials,
  hasLinks,
  selectedSkills,
  selectedInterests = [],
  industryGroups,
  nicheField,
  projects,
  portfolioSections,
  resumeFileName,
  resumeThumbnailUrl,
  resumeThumbnailStatus,
  previewProject,
  onOpenPreview,
}: PublicProfileContentProps) => {
  const hasPortfolioArtifacts =
    projects.length > 0 || Boolean(profile.resume_url);
  const resumePreviewProject = buildResumePreviewItem({
    url: profile.resume_url ?? undefined,
    fileName: resumeFileName ?? undefined,
    thumbnailUrl: resumeThumbnailUrl ?? undefined,
    thumbnailStatus: resumeThumbnailStatus ?? undefined,
  });

  return (
    <>
      <Helmet>
        <title>{safeStr(profile.display_name)} | WRDLNKDN</title>
        <meta name="description" content={safeStr(profile.display_name)} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Box
        sx={{
          minHeight: '100dvh',
          bgcolor: 'background.default',
          py: 3,
          px: 2,
        }}
      >
        <Container maxWidth="lg" disableGutters>
          <IdentityHeader
            layoutVariant="three-column"
            displayName={safeStr(profile.display_name)}
            tagline={profile.tagline ?? undefined}
            bio={safeStr(creds.bio)}
            bioIsPlaceholder={false}
            avatarUrl={profile.avatar ?? undefined}
            statusEmoji={safeStr(creds.status_emoji, '⚡')}
            statusMessage={safeStr(creds.status_message)}
            badges={
              <SkillsInterestsPills
                skills={selectedSkills}
                interests={selectedInterests}
              />
            }
            rightColumn={
              industryGroups.length > 0 || nicheField ? (
                <IndustryGroupBlock
                  groups={industryGroups}
                  nicheField={nicheField}
                />
              ) : undefined
            }
          />

          {hasLinks && (
            <Box data-testid="profile-links-section" sx={{ mb: 3 }}>
              <ProfileLinksWidget
                socials={socials}
                grouped
                collapsible
                defaultExpanded
              />
            </Box>
          )}

          {hasPortfolioArtifacts && (
            <Grid
              container
              spacing={{ xs: 2, md: 4 }}
              sx={{ mt: { xs: 2, md: 4 } }}
            >
              <Grid
                size={12}
                sx={{ minWidth: 0 }}
                data-testid="portfolio-section"
              >
                <PortfolioFrame title="Portfolio Showcase">
                  <PortfolioHighlightsCarousel
                    projects={projects}
                    onOpenPreview={onOpenPreview}
                  />
                  <ResumeCard
                    url={profile.resume_url ?? undefined}
                    fileName={resumeFileName ?? undefined}
                    thumbnailUrl={resumeThumbnailUrl ?? undefined}
                    thumbnailStatus={resumeThumbnailStatus ?? undefined}
                    onOpenPreview={onOpenPreview}
                    previewProject={resumePreviewProject}
                  />
                  {portfolioSections.map((section) => (
                    <Box
                      key={section.category}
                      data-testid={portfolioCategoryToSectionTestId(
                        section.category,
                      )}
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
                            onOpenPreview={onOpenPreview}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </PortfolioFrame>
              </Grid>
            </Grid>
          )}
        </Container>
      </Box>
      <PortfolioPreviewModal
        project={previewProject}
        open={Boolean(previewProject)}
        onClose={() => onOpenPreview(null)}
      />
    </>
  );
};
