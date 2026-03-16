import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { NotFoundPage } from '../misc/NotFoundPage';
import { supabase } from '../../lib/auth/supabaseClient';
import { normalizeIndustryGroups } from '../../lib/profile/industryGroups';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import { buildPortfolioCategorySections } from '../../lib/portfolio/portfolioSections';
import type { PortfolioItem } from '../../types/portfolio';
import type { NerdCreds } from '../../types/profile';
import {
  fetchPublicProfileByHandleOrId,
  normalizePublicSocials,
  safeDecode,
  type PublicProfilePayload,
} from './publicProfileData';
import { PublicProfileContent } from './components/PublicProfileContent';

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

      if (error || payload == null || !payload.profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setData(payload);
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

  const { profile, portfolio } = data;
  const creds = (
    profile.nerd_creds && typeof profile.nerd_creds === 'object'
      ? profile.nerd_creds
      : {}
  ) as NerdCreds;
  const socials = normalizePublicSocials(profile.socials);
  const hasLinks = socials.length > 0 || hasVisibleSocialLinks(profile.socials);
  const industryGroups = normalizeIndustryGroups(profile);
  const nicheField = profile.niche_field ?? null;
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
    ? creds.skills.map((skill) => String(skill).trim()).filter(Boolean)
    : typeof creds.skills === 'string'
      ? creds.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
      : [];
  const selectedInterests =
    Array.isArray(creds.interests) &&
    creds.interests.every((i) => typeof i === 'string')
      ? (creds.interests as string[])
          .map((i) => String(i).trim())
          .filter(Boolean)
      : typeof creds.interests === 'string'
        ? (creds.interests as string)
            .split(',')
            .map((i) => i.trim())
            .filter(Boolean)
        : [];

  const projects: PortfolioItem[] = (portfolio ?? []).map((item) => ({
    id: item.id,
    owner_id: profile.id,
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
    <PublicProfileContent
      profile={profile}
      creds={creds}
      socials={socials}
      hasLinks={hasLinks}
      selectedSkills={selectedSkills}
      selectedInterests={selectedInterests}
      industryGroups={industryGroups}
      nicheField={nicheField}
      projects={projects}
      portfolioSections={portfolioSections}
      resumeFileName={resumeFileName}
      resumeThumbnailUrl={resumeThumbnailUrl}
      resumeThumbnailStatus={resumeThumbnailStatus}
      previewProject={previewProject}
      onOpenPreview={setPreviewProject}
    />
  );
};
