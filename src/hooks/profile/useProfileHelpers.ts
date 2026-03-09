import {
  getCategoryForPlatform,
  isValidLinkCategory,
} from '../../constants/platforms';
import {
  detectPlatformFromUrl,
  normalizeUrlForDedup,
} from '../../lib/utils/linkPlatform';
import { supabase } from '../../lib/auth/supabaseClient';
import type { SocialLink } from '../../types/profile';

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

export const RESUME_THUMBNAIL_REQUEST_TIMEOUT_MS = 120_000;

export const normalizeSocials = (rawSocials: unknown): SocialLink[] => {
  if (Array.isArray(rawSocials)) {
    return rawSocials
      .filter(
        (social) =>
          social &&
          typeof social === 'object' &&
          'id' in social &&
          'url' in social &&
          typeof (social as { url: unknown }).url === 'string',
      )
      .map((social, index) => {
        const rawUrl = (social as { url: string }).url;
        const url = normalizeUrlForDedup(rawUrl) || rawUrl.trim();
        const platform = (() => {
          const candidate = (social as { platform?: unknown }).platform;
          return typeof candidate === 'string' && candidate.trim()
            ? candidate
            : detectPlatformFromUrl(url);
        })();
        const storedCategory = (social as { category?: unknown }).category;
        const category = isValidLinkCategory(storedCategory)
          ? storedCategory
          : getCategoryForPlatform(platform);
        return {
          ...(social as SocialLink),
          platform,
          category,
          isVisible: (social as { isVisible?: boolean }).isVisible !== false,
          order:
            typeof (social as { order?: number }).order === 'number'
              ? (social as { order: number }).order
              : index,
        };
      });
  }

  if (rawSocials && typeof rawSocials === 'object') {
    const legacy = rawSocials as Record<string, unknown>;
    const map: Array<{
      key: string;
      label: string;
      category: 'Social' | 'Professional';
    }> = [
      { key: 'discord', label: 'Discord', category: 'Social' },
      { key: 'reddit', label: 'Reddit', category: 'Social' },
      { key: 'github', label: 'GitHub', category: 'Professional' },
    ];

    return map
      .map((item, index) => {
        const value = legacy[item.key];
        if (typeof value !== 'string' || !value.trim()) return null;
        const normalizedUrl = normalizeUrlForDedup(value) || value.trim();
        const platform = detectPlatformFromUrl(normalizedUrl) || item.label;
        const category = getCategoryForPlatform(platform);
        return {
          id: `legacy-${item.key}`,
          category,
          platform,
          url: normalizedUrl,
          label: item.label,
          isVisible: true,
          order: index,
        } as SocialLink;
      })
      .filter((link): link is SocialLink => Boolean(link));
  }

  return [];
};

export const ensureProfileExists = async (
  userId: string,
  email: string,
  displayName: string,
) => {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (existing) return;

  const baseHandle =
    email.split('@')[0]?.toLowerCase().replace(/\W/g, '') || 'user';

  for (let attempts = 0; attempts < 10; attempts++) {
    const handle = attempts === 0 ? baseHandle : `${baseHandle}${attempts}`;
    const { error: upsertErr } = await supabase.from('profiles').upsert(
      {
        id: userId,
        email,
        handle,
        display_name: displayName,
        status: 'approved',
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    if (!upsertErr || upsertErr.code === '23505') {
      const { data: refetched } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (refetched) return;
    }

    if (upsertErr && upsertErr.code !== '23505') break;
  }

  throw new Error('Could not create profile. Please try again.');
};

export const isExternalProjectUrl = (url: string) =>
  /^https?:\/\//i.test(url.trim());
