import { Box, Container, Grid } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { PortfolioPreviewModal } from '../../../components/portfolio/dialogs/PortfolioPreviewModal';
import { ProfileLinksWidget } from '../../../components/profile/links/ProfileLinksWidget';
import { ProfileThreeColumnIdentityHeader } from './profileIdentityShared';
import { ProfilePortfolioShowcase } from './profilePortfolioShowcase';
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
          <ProfileThreeColumnIdentityHeader
            displayName={safeStr(profile.display_name)}
            tagline={profile.tagline ?? undefined}
            bio={safeStr(creds.bio)}
            bioIsPlaceholder={false}
            avatarUrl={profile.avatar ?? undefined}
            statusEmoji={safeStr(creds.status_emoji, '⚡')}
            statusMessage={safeStr(creds.status_message)}
            selectedSkills={selectedSkills}
            selectedInterests={selectedInterests}
            industryGroups={industryGroups}
            nicheField={nicheField}
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
                <ProfilePortfolioShowcase
                  frameTitle="Portfolio Showcase"
                  projects={projects}
                  portfolioSections={portfolioSections}
                  resumeUrl={profile.resume_url ?? undefined}
                  resumeFileName={resumeFileName}
                  resumeThumbnailUrl={resumeThumbnailUrl}
                  resumeThumbnailStatus={resumeThumbnailStatus}
                  onOpenPreview={onOpenPreview}
                />
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
