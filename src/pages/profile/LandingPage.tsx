// src/pages/LandingPage.tsx
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Snackbar,
  Stack,
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
import { PortfolioFrame } from '../../components/portfolio/PortfolioFrame';
import { ProjectCard } from '../../components/portfolio/ProjectCard';
import { ResumeCard } from '../../components/portfolio/ResumeCard';
import { IdentityHeader } from '../../components/profile/IdentityHeader';

// --- NEW WIDGET SECTOR ---
import { ProfileLinksWidget } from '../../components/profile/ProfileLinksWidget';

// --- SYSTEM UPGRADE: THE DIVERGENCE COMPONENT ---
import { NotFoundPage } from '../misc/NotFoundPage';

const DivergencePage = lazy(async () => {
  const m = await import('../misc/DivergencePage');
  return { default: m.DivergencePage };
});

// LOGIC & TYPES
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { GLASS_CARD } from '../../theme/candyStyles';
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

  useEffect(() => {
    const fetchPublicData = async () => {
      if (isSecretHandle) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq(handle ? 'handle' : 'id', handle || '')
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData) return;

        const verifiedProfile = profileData as unknown as DashboardProfile;
        const safeNerdCreds =
          verifiedProfile.nerd_creds &&
          typeof verifiedProfile.nerd_creds === 'object'
            ? (verifiedProfile.nerd_creds as unknown as NerdCreds)
            : ({} as NerdCreds);

        setProfile({ ...verifiedProfile, nerd_creds: safeNerdCreds });

        // For own profile, useCurrentUserAvatar provides resolved avatar.
        // For others, profile.avatar only (weirdlings RLS blocks client read).
        setResolvedAvatarUrl(verifiedProfile.avatar ?? null);

        const { data: projectsData, error: projectsError } = await supabase
          .from('portfolio_items')
          .select('*')
          .eq('owner_id', verifiedProfile.id)
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;
        setProjects((projectsData || []) as PortfolioItem[]);
      } catch (err) {
        console.error('Public Data Load Error:', err);
        setSnack(toMessage(err));
      } finally {
        setLoading(false);
      }
    };
    void fetchPublicData();
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
  const selectedIndustries = safeStr(profile.industry)
    .split(',')
    .map((industry) => industry.trim())
    .filter(Boolean);

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
          py: { xs: 4, md: 8 },
          px: { xs: 2, md: 3 },
        }}
      >
        <Container maxWidth="lg" disableGutters>
          {/* 1. IDENTITY HEADER (Full Width) */}
          <IdentityHeader
            displayName={safeStr(profile.display_name)}
            tagline={profile.tagline ?? undefined}
            bio={safeStr(creds.bio)}
            avatarUrl={
              viewer?.id === profile.id
                ? (currentUserAvatarUrl ?? resolvedAvatarUrl ?? profile.avatar)
                : (resolvedAvatarUrl ?? profile.avatar ?? undefined)
            }
            statusEmoji={safeStr(creds.status_emoji, '⚡')}
            statusMessage={safeStr(creds.status_message)}
            badges={
              selectedSkills.length > 0 || selectedIndustries.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {selectedIndustries.map((industry) => (
                    <Chip
                      key={`industry-${industry}`}
                      size="small"
                      label={`Industry: ${industry}`}
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

          {/* 2. THE GRID LAYOUT */}
          <Grid container spacing={{ xs: 3, md: 4 }} sx={{ mt: 2 }}>
            {/* LEFT COLUMN: The "Widget" Sector */}
            {/* FIXED: Removed 'item', used 'size={{ xs: 12, md: 4 }}' */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
              <Paper
                elevation={0}
                sx={{
                  ...GLASS_CARD,
                  p: { xs: 2, md: 3 },
                  mb: 4,
                  position: { md: 'sticky' },
                  top: { md: 24 },
                }}
              >
                <ProfileLinksWidget socials={profile.socials || []} grouped />
              </Paper>
            </Grid>

            {/* RIGHT COLUMN: The "Main Content" Sector */}
            {/* FIXED: Removed 'item', used 'size={{ xs: 12, md: 8 }}' */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
              <PortfolioFrame title="Portfolio">
                <ResumeCard
                  url={profile.resume_url}
                  thumbnailUrl={resumeThumbnailUrl}
                  thumbnailStatus={resumeThumbnailStatus}
                />

                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </PortfolioFrame>
            </Grid>
          </Grid>
        </Container>
      </Box>
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
