// src/pages/LandingPage.tsx
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Snackbar,
  Stack,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';

// MODULAR COMPONENTS
import { LandingPageSkeleton } from '../components/layout/LandingPageSkeleton';
import { PortfolioFrame } from '../components/portfolio/PortfolioFrame';
import { ProjectCard } from '../components/portfolio/ProjectCard';
import { ResumeCard } from '../components/portfolio/ResumeCard';
import {
  IdentityBadges,
  IdentityHeader,
} from '../components/profile/IdentityHeader';
import { ViewTagsSkillsDialog } from '../components/profile/ViewTagsSkillsDialog';

// --- NEW WIDGET SECTOR ---
import { ProfileLinksWidget } from '../components/profile/ProfileLinksWidget';

// --- SYSTEM UPGRADE: THE DIVERGENCE COMPONENT ---
import { NotFoundPage } from './NotFoundPage';

const DivergencePage = lazy(() =>
  import('./DivergencePage').then((m) => ({ default: m.DivergencePage })),
);

// LOGIC & TYPES
import { toMessage } from '../lib/errors';
import { supabase } from '../lib/supabaseClient';
import { GLASS_CARD } from '../theme/candyStyles';
import type { PortfolioItem } from '../types/portfolio';
import type { DashboardProfile, NerdCreds } from '../types/profile';
import { safeStr } from '../utils/stringUtils';

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
  const [tagsSkillsDialogOpen, setTagsSkillsDialogOpen] = useState(false);

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
      setSnack(toMessage(e));
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
  const showConnect =
    !!viewer && viewer.id !== profile.id && followCheckDone && !isSecretHandle;

  const connectActions = showConnect ? (
    <Stack direction="row" spacing={2} alignItems="center">
      {isFollowing ? (
        <>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            disabled
            size="medium"
          >
            Following
          </Button>
          <Button
            variant="text"
            size="medium"
            disabled={connectionLoading}
            onClick={() => void unfollow()}
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

      <Box component="main" sx={{ position: 'relative', py: 8 }}>
        <Container maxWidth="lg">
          {/* 1. IDENTITY HEADER (Full Width) */}
          <IdentityHeader
            displayName={safeStr(profile.display_name)}
            tagline={profile.tagline ?? undefined}
            bio={safeStr(creds.bio)}
            avatarUrl={safeStr(profile.avatar)}
            statusEmoji={safeStr(creds.status_emoji, '⚡')}
            statusMessage={safeStr(creds.status_message)}
            badges={
              <IdentityBadges
                onTagsClick={() => setTagsSkillsDialogOpen(true)}
                onSkillsClick={() => setTagsSkillsDialogOpen(true)}
              />
            }
            actions={connectActions}
          />
          <ViewTagsSkillsDialog
            open={tagsSkillsDialogOpen}
            onClose={() => setTagsSkillsDialogOpen(false)}
            tagline={profile.tagline ?? undefined}
            skills={
              Array.isArray(creds.skills)
                ? (creds.skills as string[])
                : undefined
            }
          />

          {/* 2. THE GRID LAYOUT */}
          {/* Note: 'container' prop is preserved for spacing context */}
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {/* LEFT COLUMN: The "Widget" Sector */}
            {/* FIXED: Removed 'item', used 'size={{ xs: 12, md: 4 }}' */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  ...GLASS_CARD,
                  p: 3,
                  mb: 4,
                  position: { md: 'sticky' },
                  top: { md: 24 },
                }}
              >
                <ProfileLinksWidget socials={profile.socials || []} />
              </Paper>
            </Grid>

            {/* RIGHT COLUMN: The "Main Content" Sector */}
            {/* FIXED: Removed 'item', used 'size={{ xs: 12, md: 8 }}' */}
            <Grid size={{ xs: 12, md: 8 }}>
              <PortfolioFrame title="Portfolio Frame">
                <ResumeCard url={profile.resume_url} />

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
