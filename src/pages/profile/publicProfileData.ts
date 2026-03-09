import { ProfileLinksWidget } from '../../components/profile/links/ProfileLinksWidget';
import { supabase } from '../../lib/auth/supabaseClient';
import type { SocialLink, NerdCreds } from '../../types/profile';

export type PublicProfilePayload = {
  profile: {
    id: string;
    display_name: string | null;
    tagline: string | null;
    avatar: string | null;
    nerd_creds: NerdCreds | null;
    socials: unknown;
    resume_url: string | null;
    industries?: unknown;
    industry?: string | null;
    secondary_industry?: string | null;
    niche_field?: string | null;
    location?: string | null;
    pronouns?: string | null;
  };
  portfolio: Array<{
    id: string;
    title: string;
    description: string | null;
    project_url: string | null;
    image_url: string | null;
    tech_stack: string[];
    is_highlighted?: boolean;
    sort_order?: number;
    normalized_url?: string | null;
    embed_url?: string | null;
    resolved_type?: string | null;
    thumbnail_url?: string | null;
    thumbnail_status?: string | null;
  }>;
};

const PUBLIC_PROFILE_SELECT =
  'id,display_name,tagline,avatar,nerd_creds,socials,resume_url,industries,industry,secondary_industry,niche_field,location,pronouns';

export const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const normalizePublicSocials = (
  rawSocials: unknown,
): Parameters<typeof ProfileLinksWidget>[0]['socials'] => {
  type WidgetSocial = Parameters<
    typeof ProfileLinksWidget
  >[0]['socials'][number];

  if (Array.isArray(rawSocials)) {
    return rawSocials
      .filter(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof (item as { url?: unknown }).url === 'string' &&
          (item as { isVisible?: unknown }).isVisible !== false,
      )
      .map((item) => item as WidgetSocial);
  }

  if (rawSocials && typeof rawSocials === 'object') {
    const legacy = rawSocials as Record<string, unknown>;
    const map: Array<{
      key: string;
      label: string;
      category: SocialLink['category'];
    }> = [
      { key: 'discord', label: 'Discord', category: 'Social' },
      { key: 'reddit', label: 'Reddit', category: 'Social' },
      { key: 'github', label: 'GitHub', category: 'Professional' },
    ];

    return map.reduce<WidgetSocial[]>((acc, entry, index) => {
      const value = legacy[entry.key];
      if (typeof value !== 'string' || !value.trim()) return acc;
      acc.push({
        id: `legacy-${entry.key}`,
        category: entry.category,
        platform: entry.label,
        url: value.trim(),
        label: entry.label,
        isVisible: true,
        order: index,
      });
      return acc;
    }, []);
  }

  return [];
};

export async function fetchPublicProfileByHandleOrId(
  key: 'handle' | 'id',
  value: string,
): Promise<PublicProfilePayload | null> {
  if (!value.trim()) return null;

  let query = supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .eq('status', 'approved')
    .limit(1);
  query = key === 'handle' ? query.eq('handle', value) : query.eq('id', value);

  const { data: profileRows, error: profileError } = await query;
  if (profileError || !Array.isArray(profileRows) || profileRows.length === 0) {
    return null;
  }

  const profile = profileRows[0] as PublicProfilePayload['profile'];
  const { data: portfolioRows } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('owner_id', profile.id);

  const normalizedPortfolio = Array.isArray(portfolioRows)
    ? (portfolioRows as Array<Record<string, unknown>>)
        .map((row) => ({
          id: String(row.id ?? ''),
          title:
            typeof row.title === 'string' && row.title.trim()
              ? row.title
              : 'Untitled project',
          description:
            typeof row.description === 'string' ? row.description : null,
          project_url:
            typeof row.project_url === 'string' ? row.project_url : null,
          image_url: typeof row.image_url === 'string' ? row.image_url : null,
          tech_stack: Array.isArray(row.tech_stack)
            ? (row.tech_stack as string[])
            : [],
          is_highlighted: Boolean(row.is_highlighted),
          sort_order:
            typeof row.sort_order === 'number' ? row.sort_order : undefined,
          normalized_url:
            typeof row.normalized_url === 'string' ? row.normalized_url : null,
          embed_url: typeof row.embed_url === 'string' ? row.embed_url : null,
          resolved_type:
            typeof row.resolved_type === 'string' ? row.resolved_type : null,
          thumbnail_url:
            typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
          thumbnail_status:
            typeof row.thumbnail_status === 'string'
              ? row.thumbnail_status
              : null,
        }))
        .filter((row) => row.id !== '')
        .sort((a, b) => {
          const orderA = typeof a.sort_order === 'number' ? a.sort_order : 0;
          const orderB = typeof b.sort_order === 'number' ? b.sort_order : 0;
          return orderA - orderB || a.id.localeCompare(b.id);
        })
    : [];

  return {
    profile,
    portfolio: normalizedPortfolio,
  };
}
