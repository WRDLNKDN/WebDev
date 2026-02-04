// src/pages/LandingPage.tsx
import { Box, CircularProgress, Container } from '@mui/material';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

// MODULAR COMPONENTS
import { LandingPageSkeleton } from '../components/layout/LandingPageSkeleton';
import { PortfolioFrame } from '../components/portfolio/PortfolioFrame';
import { ProjectCard } from '../components/portfolio/ProjectCard';
import { ResumeCard } from '../components/portfolio/ResumeCard';
import { IdentityHeader } from '../components/profile/IdentityHeader';

// --- SYSTEM UPGRADE: THE DIVERGENCE COMPONENT (lazy to avoid large chunk in main bundle) ---
import { lazy, Suspense } from 'react';
import { NotFoundPage } from './NotFoundPage';

const DivergencePage = lazy(() =>
  import('./DivergencePage').then((m) => ({ default: m.DivergencePage })),
);

// LOGIC & TYPES
import { supabase } from '../lib/supabaseClient';
import { SYNERGY_BG } from '../theme/candyStyles'; // Using global asset
import type { PortfolioItem } from '../types/portfolio';
import type { DashboardProfile, NerdCreds } from '../types/profile';
import { safeStr } from '../utils/stringUtils';

const HERO_HALO =
  'radial-gradient(circle at 50% 30%, rgba(66, 165, 245, 0.15) 0%, transparent 70%)';

export const LandingPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Easter Egg Check
  const isSecretHandle =
    handle?.toLowerCase() === 'glitch' || handle?.toLowerCase() === 'neo';

  useEffect(() => {
    const fetchPublicData = async () => {
      // Don't fetch if it's a secret handle, just let it fall through
      if (isSecretHandle) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Explicit typing to clear red squiggles
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
      } finally {
        setLoading(false);
      }
    };
    void fetchPublicData();
  }, [handle, isSecretHandle]);

  if (loading) return <LandingPageSkeleton />;

  // --- DIVERGENCE CHECK ---
  // 1. If it's a secret handle, show the game (lazy-loaded).
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

  // 2. If it's just a missing profile, show the Professional 404.
  if (!profile) return <NotFoundPage />;

  const creds = profile.nerd_creds as Record<string, unknown>;

  return (
    <>
      <Helmet>
        <title>{safeStr(profile.display_name)} | Verified Generalist</title>
        <meta name="description" content={safeStr(profile.tagline)} />
      </Helmet>

      <Box
        component="main"
        sx={{
          position: 'relative',
          minHeight: '100vh',
          backgroundImage: SYNERGY_BG,
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed', // Fixed for parallax feel
          py: 8,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: HERO_HALO,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <IdentityHeader
            displayName={safeStr(profile.display_name)}
            tagline={safeStr(profile.tagline)}
            bio={safeStr(creds.bio)}
            avatarUrl={safeStr(profile.avatar)}
            statusEmoji={safeStr(creds.status_emoji, '⚡')}
            statusMessage={safeStr(creds.status_message)}
          />

          <PortfolioFrame title="Portfolio Frame">
            <ResumeCard url={profile.resume_url} />

            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </PortfolioFrame>
        </Container>
      </Box>
    </>
  );
};
