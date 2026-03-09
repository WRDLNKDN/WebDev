import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { PortfolioFrame } from '../../../components/portfolio/layout/PortfolioFrame';
import { PortfolioHighlightsCarousel } from '../../../components/portfolio/layout/PortfolioHighlightsCarousel';
import { PortfolioPreviewModal } from '../../../components/portfolio/dialogs/PortfolioPreviewModal';
import { ProjectCard } from '../../../components/portfolio/cards/ProjectCard';
import { ResumeCard } from '../../../components/portfolio/cards/ResumeCard';
import { IdentityHeader } from '../../../components/profile/identity/IdentityHeader';
import { ProfileLinksWidget } from '../../../components/profile/links/ProfileLinksWidget';
import { portfolioCategoryToSectionTestId } from '../../../lib/portfolio/portfolioSections';
import type { PortfolioItem } from '../../../types/portfolio';
import type { DashboardProfile } from '../../../types/profile';
import { safeStr } from '../../../utils/stringUtils';

type LandingPageContentProps = {
  profile: DashboardProfile;
  viewer: User | null;
  currentUserAvatarUrl: string | null;
  resolvedAvatarUrl: string | null;
  creds: Record<string, unknown>;
  selectedSkills: string[];
  industryChips: Array<{ label: string; key: string }>;
  showLinksInIdentity: boolean;
  projects: PortfolioItem[];
  portfolioSections: Array<{ category: string; projects: PortfolioItem[] }>;
  previewProject: PortfolioItem | null;
  setPreviewProject: (project: PortfolioItem | null) => void;
  resumeThumbnailUrl: string | null;
  resumeFileName: string | null;
  resumeThumbnailStatus: 'pending' | 'complete' | 'failed' | null;
  isOwner: boolean;
  showConnect: boolean;
  isFollowing: boolean;
  connectionLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  snack: string | null;
  setSnack: (value: string | null) => void;
};

export const LandingPageContent = ({
  profile,
  viewer,
  currentUserAvatarUrl,
  resolvedAvatarUrl,
  creds,
  selectedSkills,
  industryChips,
  showLinksInIdentity,
  projects,
  portfolioSections,
  previewProject,
  setPreviewProject,
  resumeThumbnailUrl,
  resumeFileName,
  resumeThumbnailStatus,
  isOwner,
  showConnect,
  isFollowing,
  connectionLoading,
  onFollow,
  onUnfollow,
  snack,
  setSnack,
}: LandingPageContentProps) => {
  const ownerActions = isOwner ? (
    <Button
      component={RouterLink}
      to="/dashboard"
      state={{ openEditDialog: true }}
      variant="outlined"
      startIcon={<EditIcon />}
      size="medium"
      sx={{
        borderColor: 'rgba(255,255,255,0.4)',
        color: 'white',
        width: { xs: '100%', sm: 'auto' },
      }}
    >
      Edit profile
    </Button>
  ) : null;
  const connectActions = showConnect ? (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ width: { xs: '100%', sm: 'auto' } }}
    >
      {isFollowing ? (
        <>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            disabled
            size="medium"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Following
          </Button>
          <Button
            variant="text"
            size="medium"
            disabled={connectionLoading}
            onClick={onUnfollow}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Unfollow
          </Button>
        </>
      ) : (
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          disabled={connectionLoading}
          onClick={onFollow}
          size="medium"
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {connectionLoading ? 'Connecting…' : 'Connect'}
        </Button>
      )}
    </Stack>
  ) : null;

  return (
    <>
      <Helmet>
        <title>{safeStr(profile.display_name)} | Verified Generalist</title>
        <meta name="description" content={safeStr(profile.display_name)} />
      </Helmet>

      <Box
        component="main"
        sx={{
          position: 'relative',
          minWidth: 0,
          overflowX: 'hidden',
          py: { xs: 2, sm: 4, md: 8 },
          px: { xs: 1.25, sm: 2, md: 3 },
        }}
      >
        <Container maxWidth="lg" disableGutters>
          <IdentityHeader
            displayName={safeStr(profile.display_name)}
            tagline={profile.tagline ?? undefined}
            bio={
              safeStr(profile.additional_context).trim() ||
              safeStr(creds.bio).trim()
            }
            bioIsPlaceholder={false}
            avatarUrl={
              viewer?.id === profile.id
                ? (currentUserAvatarUrl ?? resolvedAvatarUrl ?? profile.avatar)
                : (resolvedAvatarUrl ?? profile.avatar ?? undefined)
            }
            statusEmoji={safeStr(creds.status_emoji, '⚡')}
            statusMessage={safeStr(creds.status_message)}
            slotLeftOfAvatar={
              showLinksInIdentity ? (
                <ProfileLinksWidget
                  socials={profile.socials || []}
                  grouped={false}
                  collapsible
                  defaultExpanded={true}
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
            actions={
              <>
                {ownerActions}
                {connectActions}
              </>
            }
          />

          <Grid
            container
            spacing={{ xs: 2, sm: 3, md: 4 }}
            sx={{ mt: { xs: 2, sm: 4, md: 6 } }}
          >
            <Grid size={12} sx={{ minWidth: 0 }}>
              <PortfolioFrame title="Portfolio">
                <PortfolioHighlightsCarousel
                  projects={projects}
                  onOpenPreview={setPreviewProject}
                />
                <ResumeCard
                  url={profile.resume_url}
                  fileName={resumeFileName}
                  thumbnailUrl={resumeThumbnailUrl}
                  thumbnailStatus={resumeThumbnailStatus}
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
                          onOpenPreview={setPreviewProject}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </PortfolioFrame>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <PortfolioPreviewModal
        project={previewProject}
        open={Boolean(previewProject)}
        onClose={() => setPreviewProject(null)}
      />
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={6000}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};
