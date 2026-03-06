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
import { PortfolioPreviewModal } from '../../components/portfolio/PortfolioPreviewModal';
import { ProjectCard } from '../../components/portfolio/ProjectCard';
import { ResumeCard } from '../../components/portfolio/ResumeCard';
import { IdentityHeader } from '../../components/profile/IdentityHeader';
import { ProfileLinksWidget } from '../../components/profile/ProfileLinksWidget';
import { NotFoundPage } from '../misc/NotFoundPage';
import { supabase } from '../../lib/auth/supabaseClient';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import type { PortfolioItem } from '../../types/portfolio';
import type { NerdCreds } from '../../types/profile';
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
    sort_order?: number;
    normalized_url?: string | null;
    embed_url?: string | null;
    resolved_type?: string | null;
    thumbnail_url?: string | null;
    thumbnail_status?: string | null;
  }>;
};

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
      const { data: payload, error } = await supabase.rpc(
        'get_public_profile_by_share_token',
        { p_token: shareToken.trim() },
      );
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
  const industryChips = [p.industry, p.secondary_industry]
    .filter(Boolean)
    .map((label) => ({ label: `Industry: ${label}`, key: label }));
  if (p.niche_field) {
    industryChips.push({ label: p.niche_field, key: `niche-${p.niche_field}` });
  }
  const rawSocials = Array.isArray(p.socials)
    ? p.socials
    : p.socials && typeof p.socials === 'object'
      ? (p.socials as { isVisible?: boolean }[])
      : [];
  const socials = rawSocials.filter((l) => l?.isVisible) as Parameters<
    typeof ProfileLinksWidget
  >[0]['socials'];
  const showLinksInIdentity = hasVisibleSocialLinks(p.socials);

  const projects: PortfolioItem[] = (portfolio ?? []).map((item) => ({
    id: item.id,
    owner_id: p.id,
    title: item.title,
    description: item.description ?? null,
    image_url: item.image_url ?? null,
    project_url: item.project_url ?? null,
    tech_stack: item.tech_stack ?? [],
    created_at: '',
    sort_order: item.sort_order ?? 0,
    normalized_url: item.normalized_url ?? null,
    embed_url: item.embed_url ?? null,
    resolved_type: item.resolved_type ?? null,
    thumbnail_url: item.thumbnail_url ?? null,
    thumbnail_status:
      (item.thumbnail_status as PortfolioItem['thumbnail_status']) ?? null,
  }));

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
                <ResumeCard
                  url={p.resume_url ?? undefined}
                  thumbnailUrl={resumeThumbnailUrl ?? undefined}
                  thumbnailStatus={resumeThumbnailStatus ?? undefined}
                />
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpenPreview={setPreviewProject}
                  />
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
