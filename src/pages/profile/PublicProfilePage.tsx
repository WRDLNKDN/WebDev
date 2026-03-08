import {
  Box,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { PortfolioFrame } from '../../components/portfolio/PortfolioFrame';
import { PortfolioHighlightsCarousel } from '../../components/portfolio/PortfolioHighlightsCarousel';
import { PortfolioPreviewModal } from '../../components/portfolio/PortfolioPreviewModal';
import { ProjectCard } from '../../components/portfolio/ProjectCard';
import { ResumeCard } from '../../components/portfolio/ResumeCard';
import { IdentityHeader } from '../../components/profile/IdentityHeader';
import { ProfileLinksWidget } from '../../components/profile/ProfileLinksWidget';
import { NotFoundPage } from '../misc/NotFoundPage';
import { supabase } from '../../lib/auth/supabaseClient';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import { getIndustryDisplayLabels } from '../../lib/profile/industryGroups';
import {
  buildPortfolioCategorySections,
  portfolioCategoryToSectionTestId,
} from '../../lib/portfolio/portfolioSections';
import type { PortfolioItem } from '../../types/portfolio';
import type { NerdCreds, SocialLink } from '../../types/profile';
import { safeStr } from '../../utils/stringUtils';

type PublicProfilePayload = {
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
const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizePublicSocials = (
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

async function fetchPublicProfileByHandleOrId(
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

export const PublicProfilePage = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [data, setData] = useState<PublicProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [previewProject, setPreviewProject] = useState<PortfolioItem | null>(
    null,
  );

  useEffect(() => {
    if (!shareToken?.trim()) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const trimmedToken = shareToken.trim();
      let payload: PublicProfilePayload | null = null;
      let error: { message?: string } | null = null;

      // Directory fallback routes:
      // /p/h~<handle> and /p/i~<id>
      if (trimmedToken.startsWith('h~')) {
        payload = await fetchPublicProfileByHandleOrId(
          'handle',
          safeDecode(trimmedToken.slice(2)),
        );
      } else if (trimmedToken.startsWith('i~')) {
        payload = await fetchPublicProfileByHandleOrId(
          'id',
          safeDecode(trimmedToken.slice(2)),
        );
      } else {
        const rpcResult = await supabase.rpc(
          'get_public_profile_by_share_token',
          {
            p_token: trimmedToken,
          },
        );
        payload = (rpcResult.data as PublicProfilePayload | null) ?? null;
        error = rpcResult.error;
      }

      if (cancelled) return;
      if (error || payload == null) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const parsed = payload as unknown as PublicProfilePayload;
      if (!parsed.profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setData(parsed);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress aria-label="Loading profile" />
      </Box>
    );
  }

  if (notFound || !data) {
    return <NotFoundPage />;
  }

  const { profile: p, portfolio } = data;
  const creds = (
    p.nerd_creds && typeof p.nerd_creds === 'object' ? p.nerd_creds : {}
  ) as NerdCreds;
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
  const selectedSkills = Array.isArray(creds.skills)
    ? (creds.skills as string[]).map((s) => String(s).trim()).filter(Boolean)
    : typeof creds.skills === 'string'
      ? creds.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const industryChips = getIndustryDisplayLabels(p)
    .filter(Boolean)
    .map((label) => ({ label: `Industry: ${label}`, key: label }));
  if (p.niche_field) {
    industryChips.push({ label: p.niche_field, key: `niche-${p.niche_field}` });
  }
  const socials = normalizePublicSocials(p.socials);
  const showLinksInIdentity =
    socials.length > 0 || hasVisibleSocialLinks(p.socials);

  const projects: PortfolioItem[] = (portfolio ?? []).map((item) => ({
    id: item.id,
    owner_id: p.id,
    title: item.title,
    description: item.description ?? null,
    image_url: item.image_url ?? null,
    project_url: item.project_url ?? null,
    tech_stack: item.tech_stack ?? [],
    created_at: '',
    is_highlighted: Boolean(item.is_highlighted),
    sort_order: item.sort_order ?? 0,
    normalized_url: item.normalized_url ?? null,
    embed_url: item.embed_url ?? null,
    resolved_type: item.resolved_type ?? null,
    thumbnail_url: item.thumbnail_url ?? null,
    thumbnail_status:
      (item.thumbnail_status as PortfolioItem['thumbnail_status']) ?? null,
  }));
  const portfolioSections = buildPortfolioCategorySections(projects);

  return (
    <>
      <Helmet>
        <title>{safeStr(p.display_name)} | WRDLNKDN</title>
        <meta name="description" content={safeStr(p.display_name)} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          py: 3,
          px: 2,
        }}
      >
        <Container maxWidth="lg" disableGutters>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography
              component={RouterLink}
              to="/"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                fontSize: '0.875rem',
                '&:hover': { color: 'primary.main' },
              }}
            >
              WRDLNKDN
            </Typography>
          </Box>

          <IdentityHeader
            displayName={safeStr(p.display_name)}
            tagline={p.tagline ?? undefined}
            bio={safeStr(creds.bio)}
            bioIsPlaceholder={false}
            avatarUrl={p.avatar ?? undefined}
            statusEmoji={safeStr(creds.status_emoji, '⚡')}
            statusMessage={safeStr(creds.status_message)}
            slotLeftOfAvatar={
              showLinksInIdentity ? (
                <ProfileLinksWidget
                  socials={socials}
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
          />

          <Grid
            container
            spacing={{ xs: 2, md: 4 }}
            sx={{ mt: { xs: 2, md: 4 } }}
          >
            <Grid size={12} sx={{ minWidth: 0 }}>
              <PortfolioFrame title="Portfolio">
                <PortfolioHighlightsCarousel
                  projects={projects}
                  onOpenPreview={setPreviewProject}
                />
                <ResumeCard
                  url={p.resume_url ?? undefined}
                  fileName={resumeFileName}
                  thumbnailUrl={resumeThumbnailUrl ?? undefined}
                  thumbnailStatus={resumeThumbnailStatus ?? undefined}
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
    </>
  );
};
