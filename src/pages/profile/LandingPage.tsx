// src/pages/LandingPage.tsx
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useParams } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';

// MODULAR COMPONENTS
import { LandingPageSkeleton } from '../../components/layout/LandingPageSkeleton';
import { PortfolioFrame } from '../../components/portfolio/layout/PortfolioFrame';
import { PortfolioHighlightsCarousel } from '../../components/portfolio/layout/PortfolioHighlightsCarousel';
import { PortfolioPreviewModal } from '../../components/portfolio/dialogs/PortfolioPreviewModal';
import { ProjectCard } from '../../components/portfolio/cards/ProjectCard';
import { ResumeCard } from '../../components/portfolio/cards/ResumeCard';
import { IdentityHeader } from '../../components/profile/identity/IdentityHeader';

// --- NEW WIDGET SECTOR ---
import { ProfileLinksWidget } from '../../components/profile/links/ProfileLinksWidget';

// --- SYSTEM UPGRADE: THE DIVERGENCE COMPONENT ---
import { NotFoundPage } from '../misc/NotFoundPage';

const DivergencePage = lazy(async () => {
  const m = await import('../misc/DivergencePage');
  return { default: m.DivergencePage };
});

// LOGIC & TYPES
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { toMessage } from '../../lib/utils/errors';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import { getIndustryDisplayLabels } from '../../lib/profile/industryGroups';
import {
  buildPortfolioCategorySections,
  portfolioCategoryToSectionTestId,
} from '../../lib/portfolio/portfolioSections';
import { supabase } from '../../lib/auth/supabaseClient';
import type { PortfolioItem } from '../../types/portfolio';
import type { DashboardProfile, NerdCreds } from '../../types/profile';
import { safeStr } from '../../utils/stringUtils';

export const LandingPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [followCheckDone, setFollowCheckDone] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [previewProject, setPreviewProject] = useState<PortfolioItem | null>(
    null,
  );
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(
    null,
  );
  const { avatarUrl: currentUserAvatarUrl } = useCurrentUserAvatar();

  // Easter Egg Check
  const isSecretHandle =
    handle?.toLowerCase() === 'glitch' || handle?.toLowerCase() === 'neo';

  // Viewer session for Connect button
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setViewer(session?.user ?? null);
    };
    void init();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void init();
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check if viewer is already following this profile
  useEffect(() => {
    if (!viewer || !profile || viewer.id === profile.id) {
      setFollowCheckDone(!!viewer && !!profile);
      setIsFollowing(false);
      return;
    }
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from('feed_connections')
        .select('connected_user_id')
        .eq('user_id', viewer.id)
        .eq('connected_user_id', profile.id)
        .maybeSingle();
      if (!cancelled) {
        setIsFollowing(!!data);
        setFollowCheckDone(true);
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [viewer, profile]);

  const follow = useCallback(async () => {
    if (!viewer || !profile || viewer.id === profile.id) return;
    setConnectionLoading(true);
    try {
      const { error } = await supabase.from('feed_connections').insert({
        user_id: viewer.id,
        connected_user_id: profile.id,
      });
      if (error) throw error;
      setIsFollowing(true);
    } catch (e) {
      console.error('Follow failed:', e);
      setSnack("We couldn't connect right now. Please try again.");
    } finally {
      setConnectionLoading(false);
    }
  }, [viewer, profile]);

  const unfollow = useCallback(async () => {
    if (!viewer || !profile) return;
    setConnectionLoading(true);
    try {
      const { error } = await supabase
        .from('feed_connections')
        .delete()
        .eq('user_id', viewer.id)
        .eq('connected_user_id', profile.id);
      if (error) throw error;
      setIsFollowing(false);
    } catch (e) {
      console.error('Unfollow failed:', e);
      setSnack(toMessage(e));
    } finally {
      setConnectionLoading(false);
    }
  }, [viewer, profile]);

  // /profile/:handle is owner-only. Non-owners get 404 (no leak). Use RPC so only owner can load by handle.
  useEffect(() => {
    const fetchOwnerProfile = async () => {
      if (isSecretHandle || !handle?.trim()) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) {
          setProfile(null);
          setLoading(false);
          return;
        }
        const { data: rows, error: profileError } = await supabase.rpc(
          'get_own_profile_by_handle',
          { p_handle: handle.trim() },
        );
        if (profileError) throw profileError;
        const profileData = Array.isArray(rows) ? rows[0] : rows;
        if (!profileData) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const verifiedProfile = profileData as unknown as DashboardProfile;
        const safeNerdCreds =
          verifiedProfile.nerd_creds &&
          typeof verifiedProfile.nerd_creds === 'object'
            ? (verifiedProfile.nerd_creds as unknown as NerdCreds)
            : ({} as NerdCreds);

        setProfile({ ...verifiedProfile, nerd_creds: safeNerdCreds });
        setResolvedAvatarUrl(verifiedProfile.avatar ?? null);

        const { data: projectsData, error: projectsError } = await supabase
          .from('portfolio_items')
          .select('*')
          .eq('owner_id', verifiedProfile.id)
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });

        if (projectsError) throw projectsError;
        setProjects((projectsData || []) as PortfolioItem[]);
      } catch (err) {
        console.error('Profile load error:', err);
        setSnack(toMessage(err));
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    void fetchOwnerProfile();
  }, [handle, isSecretHandle]);

  if (loading) return <LandingPageSkeleton />;

  // --- DIVERGENCE CHECK ---
  if (isSecretHandle)
    return (
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress aria-label="Loading game" />
          </Box>
        }
      >
        <DivergencePage />
      </Suspense>
    );

  if (!profile) return <NotFoundPage />;

  const creds = profile.nerd_creds as Record<string, unknown>;
  const resumeThumbnailUrl =
    typeof creds.resume_thumbnail_url === 'string'
      ? creds.resume_thumbnail_url
      : null;
  const resumeFileName =
    typeof creds.resume_file_name === 'string' ? creds.resume_file_name : null;
  const resumeThumbnailStatus =
    creds.resume_thumbnail_status === 'pending' ||
    creds.resume_thumbnail_status === 'complete' ||
    creds.resume_thumbnail_status === 'failed'
      ? creds.resume_thumbnail_status
      : null;
  const isOwner = !!viewer && viewer.id === profile.id;
  const showConnect =
    !!viewer && viewer.id !== profile.id && followCheckDone && !isSecretHandle;
  const selectedSkills =
    Array.isArray(creds.skills) &&
    creds.skills.every((skill) => typeof skill === 'string')
      ? (creds.skills as string[]).map((skill) => skill.trim()).filter(Boolean)
      : typeof creds.skills === 'string'
        ? creds.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [];
  const nicheField = safeStr(
    (profile as unknown as { niche_field?: string }).niche_field,
  );
  const industryChips = getIndustryDisplayLabels(profile)
    .filter(Boolean)
    .map((label) => ({ label: `Industry: ${label}`, key: label }));
  if (nicheField)
    industryChips.push({ label: nicheField, key: `niche-${nicheField}` });
  const showLinksInIdentity = hasVisibleSocialLinks(profile.socials);
  const portfolioSections = buildPortfolioCategorySections(projects);

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
            onClick={() => void unfollow()}
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
          onClick={() => void follow()}
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
          {/* 1. IDENTITY HEADER (Full Width) */}
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
                  grouped
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

          {/* 2. PORTFOLIO SECTION */}
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
