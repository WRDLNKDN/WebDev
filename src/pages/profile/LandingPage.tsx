// src/pages/profile/LandingPage.tsx
import { Box, CircularProgress } from '@mui/material';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';

import { LandingPageSkeleton } from '../../components/layout/LandingPageSkeleton';
import { LandingPageContent } from './components/LandingPageContent';
import { NotFoundPage } from '../misc/NotFoundPage';
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useAppToast } from '../../context/AppToastContext';
import { toMessage } from '../../lib/utils/errors';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import { normalizeIndustryGroups } from '../../lib/profile/industryGroups';
import {
  resumeFieldsFromCreds,
  selectedInterestsFromCredsInput,
  selectedSkillsFromCredsInput,
} from '../../lib/profile/nerdCredsDisplay';
import { buildPortfolioCategorySections } from '../../lib/portfolio/portfolioSections';
import { supabase } from '../../lib/auth/supabaseClient';
import type { PortfolioItem } from '../../types/portfolio';
import type { DashboardProfile, NerdCreds } from '../../types/profile';
import { safeStr } from '../../utils/stringUtils';

const DivergencePage = lazy(async () => {
  const m = await import('../misc/DivergencePage');
  return { default: m.DivergencePage };
});

export const LandingPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [followCheckDone, setFollowCheckDone] = useState(false);
  const [previewProject, setPreviewProject] = useState<PortfolioItem | null>(
    null,
  );
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(
    null,
  );
  const { avatarUrl: currentUserAvatarUrl } = useCurrentUserAvatar();
  const { showToast } = useAppToast();

  const isSecretHandle =
    handle?.toLowerCase() === 'glitch' || handle?.toLowerCase() === 'neo';

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
  }, [viewer, profile, showToast]);

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
      showToast({
        message: "We couldn't connect right now. Please try again.",
        severity: 'error',
      });
    } finally {
      setConnectionLoading(false);
    }
  }, [viewer, profile, showToast]);

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
      showToast({ message: toMessage(e), severity: 'error' });
    } finally {
      setConnectionLoading(false);
    }
  }, [viewer, profile, showToast]);

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
        showToast({ message: toMessage(err), severity: 'error' });
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    void fetchOwnerProfile();
  }, [handle, isSecretHandle, showToast]);

  if (loading) return <LandingPageSkeleton />;

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
  const { resumeThumbnailUrl, resumeFileName, resumeThumbnailStatus } =
    resumeFieldsFromCreds(creds);
  const isOwner = !!viewer && viewer.id === profile.id;
  const showConnect =
    !!viewer && viewer.id !== profile.id && followCheckDone && !isSecretHandle;
  const selectedSkills = selectedSkillsFromCredsInput(creds);
  const selectedInterests = selectedInterestsFromCredsInput(creds);
  const nicheFieldRaw = safeStr(
    (profile as unknown as { niche_field?: string }).niche_field,
  );
  const industryGroups = normalizeIndustryGroups(profile);
  const hasLinks = hasVisibleSocialLinks(profile.socials);
  const portfolioSections = buildPortfolioCategorySections(projects);

  return (
    <LandingPageContent
      profile={profile}
      viewer={viewer}
      currentUserAvatarUrl={currentUserAvatarUrl}
      resolvedAvatarUrl={resolvedAvatarUrl}
      creds={creds}
      selectedSkills={selectedSkills}
      selectedInterests={selectedInterests}
      industryGroups={industryGroups}
      nicheField={nicheFieldRaw || null}
      hasLinks={hasLinks}
      projects={projects}
      portfolioSections={portfolioSections}
      previewProject={previewProject}
      setPreviewProject={setPreviewProject}
      resumeThumbnailUrl={resumeThumbnailUrl}
      resumeFileName={resumeFileName}
      resumeThumbnailStatus={resumeThumbnailStatus}
      isOwner={isOwner}
      showConnect={showConnect}
      isFollowing={isFollowing}
      connectionLoading={connectionLoading}
      onFollow={() => void follow()}
      onUnfollow={() => void unfollow()}
      portfolioFrameTitle="Portfolio"
    />
  );
};
