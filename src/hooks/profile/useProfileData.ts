import {
  getCategoryForPlatform,
  isValidLinkCategory,
} from '../../constants/platforms';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  detectPlatformFromUrl,
  findDuplicateNormalizedUrl,
  normalizeUrlForDedup,
} from '../../lib/utils/linkPlatform';
import { toMessage } from '../../lib/utils/errors';
import type { PortfolioItem } from '../../types/portfolio';
import type {
  DashboardProfile,
  NerdCreds,
  SocialLink,
} from '../../types/profile';
import type { Json } from '../../types/supabase';
import { normalizeSocials } from './useProfileHelpers';

type FetchDataParams = {
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setProfile: (value: DashboardProfile | null) => void;
  setProjects: (value: PortfolioItem[]) => void;
};

export const fetchProfileData = async ({
  setLoading,
  setError,
  setProfile,
  setProjects,
}: FetchDataParams) => {
  try {
    setLoading(true);
    setError(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) {
      setLoading(false);
      return;
    }

    // Parallelize profile and projects fetch for mobile performance
    const [profileResult, projectsResult] = await Promise.allSettled([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('portfolio_items')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true }),
    ]);

    const profileResponse =
      profileResult.status === 'fulfilled' ? profileResult.value : null;
    const { data, error: profileError } = profileResponse || {
      data: null,
      error: profileResult.status === 'rejected' ? profileResult.reason : null,
    };
    if (profileError) throw profileError;

    let profileData = data as DashboardProfile | null;
    if (!profileData) {
      const email = session.user.email ?? '';
      const baseHandle =
        email.split('@')[0]?.toLowerCase().replace(/\W/g, '') || 'user';
      let attempts = 0;
      while (attempts < 10) {
        const payload = {
          id: session.user.id,
          email,
          handle: attempts === 0 ? baseHandle : `${baseHandle}${attempts}`,
          display_name:
            session.user.user_metadata?.full_name ?? email.split('@')[0],
          status: 'approved',
        };

        const { data: upserted, error: upsertErr } = await supabase
          .from('profiles')
          .upsert(payload, { onConflict: 'id', ignoreDuplicates: true })
          .select('*')
          .maybeSingle();

        if (!upsertErr && upserted) {
          profileData = upserted as unknown as DashboardProfile;
          break;
        }

        if (upsertErr?.code === '23505') {
          const { data: existing } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (existing) {
            profileData = existing as unknown as DashboardProfile;
            break;
          }
          attempts += 1;
          continue;
        }

        if (upsertErr) break;

        const { data: existing } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (existing) {
          profileData = existing as unknown as DashboardProfile;
          break;
        }
        attempts += 1;
      }

      if (!profileData) {
        setLoading(false);
        setError(
          "We couldn't create your profile. Please try again, or contact support if this keeps happening.",
        );
        return;
      }
    }

    const rawCreds = profileData.nerd_creds;
    const safeNerdCreds: NerdCreds =
      rawCreds && typeof rawCreds === 'object'
        ? (rawCreds as unknown as NerdCreds)
        : ({} as NerdCreds);

    setProfile({
      ...profileData,
      nerd_creds: safeNerdCreds,
      socials: normalizeSocials(profileData.socials),
    } as DashboardProfile);

    // Handle projects result from parallel fetch
    if (projectsResult.status === 'fulfilled') {
      const { data: projectsData, error: projectsError } = projectsResult.value;
      if (!projectsError) setProjects((projectsData || []) as PortfolioItem[]);
      else setProjects([]);
    } else {
      setProjects([]);
    }
  } catch (cause) {
    console.error('SYSTEM_LOG: Data Load Error:', cause);
    setError(toMessage(cause));
  } finally {
    setLoading(false);
  }
};

type UpdateProfileParams = {
  profile: DashboardProfile | null;
  updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> };
  fetchData: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<DashboardProfile | null>>;
};

export const updateProfileData = async ({
  profile,
  updates,
  fetchData,
  setProfile,
}: UpdateProfileParams) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    throw new Error('You need to sign in to update your profile.');

  const currentCreds = (profile?.nerd_creds as Record<string, unknown>) || {};
  const newCreds = (updates.nerd_creds as Record<string, unknown>) || {};
  const merged = { ...currentCreds, ...newCreds };
  delete merged.status_message;

  const topLevelUpdates = { ...updates };
  delete topLevelUpdates.nerd_creds;
  const payload: Record<string, unknown> = { ...topLevelUpdates };
  if (updates.nerd_creds !== undefined)
    payload.nerd_creds = merged as unknown as Json;

  let normalizedSocials: SocialLink[] | undefined;
  if (Array.isArray(payload.socials)) {
    const socials = payload.socials as SocialLink[];
    const duplicateUrl = findDuplicateNormalizedUrl(
      socials.map((link) => link.url),
    );
    if (duplicateUrl) {
      throw new Error(
        'Duplicate URLs are not allowed. Each link must have a unique URL.',
      );
    }

    normalizedSocials = socials.map((link) => {
      const normalizedUrl = normalizeUrlForDedup(link.url) || link.url.trim();
      const platform =
        link.platform?.trim() || detectPlatformFromUrl(normalizedUrl);
      const category = isValidLinkCategory(link.category)
        ? link.category
        : getCategoryForPlatform(platform);
      return { ...link, url: normalizedUrl, platform, category };
    });
    payload.socials = normalizedSocials as unknown as Json;
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from('profiles')
    .update(payload as Record<string, unknown>)
    .eq('id', session.user.id)
    .select('id')
    .maybeSingle();

  if (updateError) {
    const code = (updateError as { code?: string }).code;
    const msg = String(
      (updateError as { message?: string }).message || '',
    ).toLowerCase();
    const is409 =
      code === '409' || msg.includes('409') || msg.includes('conflict');
    if (is409) {
      await fetchData();
      throw new Error(
        'Profile was updated elsewhere. Please try saving again.',
      );
    }
    if (msg.includes('rls') || msg.includes('row-level security')) {
      throw new Error(
        "You don't have permission to update your profile. Try signing in again.",
      );
    }
    if (msg.includes('duplicate') || msg.includes('unique')) {
      throw new Error('That handle may already be taken. Try a different one.');
    }
    throw new Error(
      (updateError as { message?: string }).message ||
        "We couldn't save your profile. Please try again.",
    );
  }

  if (!updatedRow) {
    throw new Error(
      "We couldn't save your profile changes right now. Please refresh and try again.",
    );
  }

  setProfile((prev) => {
    if (!prev) return null;
    const next: DashboardProfile = {
      ...prev,
      ...topLevelUpdates,
      nerd_creds: merged,
    } as DashboardProfile;
    if (normalizedSocials !== undefined) next.socials = normalizedSocials;
    return next;
  });
};
