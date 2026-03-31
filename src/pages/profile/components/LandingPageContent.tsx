import { Box, Button, Container, Grid, Snackbar, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { PortfolioPreviewModal } from '../../../components/portfolio/dialogs/PortfolioPreviewModal';
import { ProfileLinksWidget } from '../../../components/profile/links/ProfileLinksWidget';
import { ProfileThreeColumnIdentityHeader } from './profileIdentityShared';
import { ProfilePortfolioShowcase } from './profilePortfolioShowcase';
import type { PortfolioItem } from '../../../types/portfolio';
import type { DashboardProfile, IndustryGroup } from '../../../types/profile';
import { safeStr } from '../../../utils/stringUtils';

type LandingPageContentProps = {
  profile: DashboardProfile;
  viewer: User | null;
  currentUserAvatarUrl: string | null;
  resolvedAvatarUrl: string | null;
  creds: Record<string, unknown>;
  selectedSkills: string[];
  selectedInterests?: string[];
  industryGroups: IndustryGroup[];
  nicheField: string | null;
  hasLinks: boolean;
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
  /** When both are set, a snackbar is rendered for transient messages. */
  snack?: string | null;
  setSnack?: (value: string | null) => void;
  /** Portfolio frame title (owner `/profile/:handle` uses "Portfolio"). */
  portfolioFrameTitle?: string;
};

export const LandingPageContent = ({
  profile,
  viewer,
  currentUserAvatarUrl,
  resolvedAvatarUrl,
  creds,
  selectedSkills,
  selectedInterests = [],
  industryGroups,
  nicheField,
  hasLinks,
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
  snack = null,
  setSnack,
  portfolioFrameTitle = 'Portfolio Showcase',
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
          <ProfileThreeColumnIdentityHeader
            displayName={safeStr(profile.display_name)}
            memberHandle={profile.handle?.trim() || undefined}
            tagline={profile.tagline ?? undefined}
            bio={
              safeStr(creds.bio).trim() ||
              safeStr(profile.additional_context).trim()
            }
            bioIsPlaceholder={false}
            avatarUrl={
              viewer?.id === profile.id
                ? (currentUserAvatarUrl ?? resolvedAvatarUrl ?? profile.avatar)
                : (resolvedAvatarUrl ?? profile.avatar ?? undefined)
            }
            statusEmoji={safeStr(creds.status_emoji, '⚡')}
            statusMessage={safeStr(creds.status_message)}
            selectedSkills={selectedSkills}
            selectedInterests={selectedInterests}
            industryGroups={industryGroups}
            nicheField={nicheField}
            actions={
              <>
                {ownerActions}
                {connectActions}
              </>
            }
          />

          {hasLinks && (
            <Box sx={{ mb: { xs: 2, sm: 4, md: 6 } }}>
              <ProfileLinksWidget
                socials={profile.socials || []}
                grouped
                collapsible
                defaultExpanded
              />
            </Box>
          )}

          <Grid
            container
            spacing={{ xs: 2, sm: 3, md: 4 }}
            sx={{ mt: { xs: 2, sm: 4, md: 6 } }}
          >
            <Grid size={12} sx={{ minWidth: 0 }}>
              <ProfilePortfolioShowcase
                frameTitle={portfolioFrameTitle}
                projects={projects}
                portfolioSections={portfolioSections}
                resumeUrl={profile.resume_url}
                resumeFileName={resumeFileName}
                resumeThumbnailUrl={resumeThumbnailUrl}
                resumeThumbnailStatus={resumeThumbnailStatus}
                onOpenPreview={setPreviewProject}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
      <PortfolioPreviewModal
        project={previewProject}
        open={Boolean(previewProject)}
        onClose={() => setPreviewProject(null)}
      />
      {setSnack ? (
        <Snackbar
          open={Boolean(snack)}
          autoHideDuration={6000}
          onClose={() => setSnack(null)}
          message={snack ?? ''}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      ) : null}
    </>
  );
};
