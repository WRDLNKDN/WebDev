import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUserAvatar } from '../../context/AvatarContext';
import { useProfile } from '../../hooks/useProfile';
import { getIndustryDisplayLabels } from '../../lib/profile/industryGroups';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import type { NerdCreds, SocialLink } from '../../types/profile';
import type { PortfolioItem } from '../../types/portfolio';
import { safeStr } from '../../utils/stringUtils';

export const useDashboardController = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioItem | null>(
    null,
  );
  const [isLinksOpen, setIsLinksOpen] = useState(false);
  const [previewProject, setPreviewProject] = useState<PortfolioItem | null>(
    null,
  );
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareTokenError, setShareTokenError] = useState<string | null>(null);
  const [shareTokenLoading, setShareTokenLoading] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const [editFocusBio, setEditFocusBio] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [savedLinksOverride, setSavedLinksOverride] = useState<
    SocialLink[] | null
  >(null);

  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { openEditDialog?: boolean } | undefined;

  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const lastLinksRef = useRef<SocialLink[]>([]);

  const profileState = useProfile();
  const { avatarUrl: ctxAvatarUrl, refresh: refreshAvatar } =
    useCurrentUserAvatar();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate('/');
      else setSession(data.session);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!state?.openEditDialog) return;
    setIsEditOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [state?.openEditDialog, navigate, location.pathname]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setShareTokenError(null);

    void (async () => {
      setShareTokenLoading(true);
      const { data, error } = await supabase.rpc(
        'get_or_create_profile_share_token',
      );
      if (cancelled) return;

      if (error) {
        setShareToken(null);
        const err = error as { code?: string; message?: string };
        const isRpcMissing =
          err.code === 'PGRST301' ||
          (typeof err.message === 'string' &&
            (err.message.includes('404') || err.message.includes('not found')));
        setShareTokenError(
          isRpcMissing
            ? "Share link isn't available right now. Please try again later."
            : toMessage(error),
        );
      } else {
        setShareToken(typeof data === 'string' ? data : null);
        setShareTokenError(null);
      }

      setShareTokenLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (savedLinksOverride !== null) return;
    if (
      !Array.isArray(profileState.profile?.socials) ||
      profileState.profile.socials.length === 0
    )
      return;
    setSavedLinksOverride(profileState.profile.socials);
  }, [profileState.profile?.socials, savedLinksOverride]);

  useEffect(() => {
    if (
      Array.isArray(profileState.profile?.socials) &&
      profileState.profile.socials.length > 0
    ) {
      lastLinksRef.current = profileState.profile.socials;
    }
  }, [profileState.profile?.socials]);

  const socialsArray = useMemo(() => {
    const fromOverride = savedLinksOverride ?? [];
    const fromProfile = Array.isArray(profileState.profile?.socials)
      ? profileState.profile.socials
      : [];
    if (fromOverride.length > 0) return fromOverride;
    if (fromProfile.length > 0) return fromProfile;
    return lastLinksRef.current.length > 0 ? lastLinksRef.current : [];
  }, [savedLinksOverride, profileState.profile?.socials]);

  const displayName = safeStr(
    profileState.profile?.display_name ||
      session?.user.user_metadata?.full_name,
    'Verified Generalist',
  );

  const resolvedAvatarUrl =
    profileState.profile?.avatar || session?.user.user_metadata?.avatar_url;
  const avatarUrl = ctxAvatarUrl ?? safeStr(resolvedAvatarUrl);

  const safeNerdCreds =
    profileState.profile?.nerd_creds &&
    typeof profileState.profile.nerd_creds === 'object'
      ? (profileState.profile.nerd_creds as unknown as NerdCreds)
      : ({} as NerdCreds);

  const selectedSkills =
    Array.isArray(safeNerdCreds.skills) &&
    safeNerdCreds.skills.every((skill) => typeof skill === 'string')
      ? (safeNerdCreds.skills as string[])
          .map((skill) => skill.trim())
          .filter(Boolean)
      : typeof safeNerdCreds.skills === 'string'
        ? safeNerdCreds.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [];

  const selectedIndustries = getIndustryDisplayLabels(profileState.profile);
  const nicheField = (
    profileState.profile as unknown as { niche_field?: string }
  )?.niche_field?.trim();

  const descriptionFromJoin = safeStr(
    profileState.profile?.additional_context,
  ).trim();
  const descriptionFromBio = safeStr(safeNerdCreds.bio).trim();
  const hasDescription = Boolean(descriptionFromJoin || descriptionFromBio);
  const bio = hasDescription ? descriptionFromJoin || descriptionFromBio : '';

  return {
    session,
    state: {
      isEditOpen,
      setIsEditOpen,
      isProjectDialogOpen,
      setIsProjectDialogOpen,
      editingProject,
      setEditingProject,
      isLinksOpen,
      setIsLinksOpen,
      previewProject,
      setPreviewProject,
      shareToken,
      setShareToken,
      shareTokenError,
      shareTokenLoading,
      regenerateConfirmOpen,
      setRegenerateConfirmOpen,
      regenerating,
      setRegenerating,
      isShareDialogOpen,
      setIsShareDialogOpen,
      profileMenuAnchor,
      setProfileMenuAnchor,
      addMenuAnchor,
      setAddMenuAnchor,
      editFocusBio,
      setEditFocusBio,
      snack,
      setSnack,
      savedLinksOverride,
      setSavedLinksOverride,
      lastLinksRef,
      resumeFileInputRef,
    },
    profileState,
    avatar: {
      ctxAvatarUrl,
      refreshAvatar,
      resolvedAvatarUrl,
      avatarUrl,
    },
    derived: {
      socialsArray,
      displayName,
      safeNerdCreds,
      selectedSkills,
      selectedIndustries,
      nicheField,
      hasDescription,
      bio,
    },
  };
};
