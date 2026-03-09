import { Box, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink } from 'react-router-dom';
import { PortfolioFrame } from '../../../components/portfolio/layout/PortfolioFrame';
import { PortfolioHighlightsCarousel } from '../../../components/portfolio/layout/PortfolioHighlightsCarousel';
import { PortfolioPreviewModal } from '../../../components/portfolio/dialogs/PortfolioPreviewModal';
import { ProjectCard } from '../../../components/portfolio/cards/ProjectCard';
import { ResumeCard } from '../../../components/portfolio/cards/ResumeCard';
import { IdentityHeader } from '../../../components/profile/identity/IdentityHeader';
import { ProfileLinksWidget } from '../../../components/profile/links/ProfileLinksWidget';
import { portfolioCategoryToSectionTestId } from '../../../lib/portfolio/portfolioSections';
import type { PortfolioItem } from '../../../types/portfolio';
import type { NerdCreds } from '../../../types/profile';
import { safeStr } from '../../../utils/stringUtils';
import type { PublicProfilePayload } from '../publicProfileData';

type PublicProfileContentProps = {
  profile: PublicProfilePayload['profile'];
  creds: NerdCreds;
  socials: Parameters<typeof ProfileLinksWidget>[0]['socials'];
  showLinksInIdentity: boolean;
  selectedSkills: string[];
  industryChips: Array<{ label: string; key: string }>;
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
  showLinksInIdentity,
  selectedSkills,
  industryChips,
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

  return (
    <>
      <Helmet>
        <title>{safeStr(profile.display_name)} | WRDLNKDN</title>
        <meta name="description" content={safeStr(profile.display_name)} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Box
        sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3, px: 2 }}
      >
        <Container maxWidth="lg" disableGutters>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography
              component={RouterLink}
              to="/"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                fontSize: '0.875rem',
                '&:hover': { color: 'primary.main' },
              }}
            >
              WRDLNKDN
            </Typography>
          </Box>

          <IdentityHeader
            displayName={safeStr(profile.display_name)}
            tagline={profile.tagline ?? undefined}
            bio={safeStr(creds.bio)}
            bioIsPlaceholder={false}
            avatarUrl={profile.avatar ?? undefined}
            statusEmoji={safeStr(creds.status_emoji, '⚡')}
            statusMessage={safeStr(creds.status_message)}
            slotLeftOfAvatar={
              showLinksInIdentity ? (
                <ProfileLinksWidget
                  socials={socials}
                  grouped
                  collapsible
                  defaultExpanded
                />
              ) : undefined
            }
            badges={
              selectedSkills.length > 0 || industryChips.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {industryChips.map(({ label, key }) => (
                    <Chip
                      key={key}
                      size="small"
                      label={label}
                      sx={{
                        bgcolor: 'rgba(66,165,245,0.15)',
                        color: 'text.primary',
                        border: '1px solid rgba(66,165,245,0.35)',
                      }}
                    />
                  ))}
                  {selectedSkills.map((skill) => (
                    <Chip
                      key={`skill-${skill}`}
                      size="small"
                      label={`Skill: ${skill}`}
                      sx={{
                        bgcolor: 'rgba(236,64,122,0.15)',
                        color: 'text.primary',
                        border: '1px solid rgba(236,64,122,0.35)',
                      }}
                    />
                  ))}
                </Stack>
              ) : undefined
            }
          />

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
                <PortfolioFrame title="Portfolio">
                  <PortfolioHighlightsCarousel
                    projects={projects}
                    onOpenPreview={onOpenPreview}
                  />
                  <ResumeCard
                    url={profile.resume_url ?? undefined}
                    fileName={resumeFileName ?? undefined}
                    thumbnailUrl={resumeThumbnailUrl ?? undefined}
                    thumbnailStatus={resumeThumbnailStatus ?? undefined}
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
