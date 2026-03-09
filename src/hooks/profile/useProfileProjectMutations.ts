import { supabase } from '../../lib/auth/supabaseClient';
import { getLinkType, normalizeGoogleUrl } from '../../lib/portfolio/linkUtils';
import { getPortfolioUrlSafetyError } from '../../lib/portfolio/linkValidation';
import { toMessage } from '../../lib/utils/errors';
import type { NewProject, PortfolioItem } from '../../types/portfolio';
import { isExternalProjectUrl } from './useProfileHelpers';

type Params = {
  setProjects: React.Dispatch<React.SetStateAction<PortfolioItem[]>>;
};

export const toggleProjectHighlightItem = async ({
  projectId,
  isHighlighted,
  setProjects,
}: {
  projectId: string;
  isHighlighted: boolean;
} & Params) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You need to sign in to update project highlights.');
  }

  const { data, error: updateError } = await supabase
    .from('portfolio_items')
    .update({ is_highlighted: isHighlighted })
    .eq('id', projectId)
    .eq('owner_id', session.user.id)
    .select()
    .single();

  if (updateError) throw updateError;

  setProjects((prev) =>
    prev.map((project) =>
      project.id === projectId ? (data as PortfolioItem) : project,
    ),
  );
};

export const updateProjectItem = async ({
  projectId,
  updates,
  imageFile,
  setProjects,
}: {
  projectId: string;
  updates: NewProject;
  imageFile?: File;
} & Params) => {
  const url = updates.project_url?.trim() ?? '';
  if (!url) throw new Error('View project URL is required');
  if (!isExternalProjectUrl(url)) {
    throw new Error('Project URL must be an external URL (e.g. https://...).');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You need to sign in to update a project.');
  }

  let finalImageUrl = updates.image_url;
  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `project-${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(filePath, imageFile);
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('project-images').getPublicUrl(filePath);
    finalImageUrl = publicUrl;
  }

  const projectUrlTrimmed = updates.project_url.trim();
  const projectUrlSafetyError = getPortfolioUrlSafetyError(projectUrlTrimmed);
  if (projectUrlSafetyError) throw new Error(projectUrlSafetyError);

  const linkType = getLinkType(projectUrlTrimmed);
  const normalizedUrl =
    linkType === 'google_doc' ||
    linkType === 'google_sheet' ||
    linkType === 'google_slides'
      ? normalizeGoogleUrl(projectUrlTrimmed)
      : projectUrlTrimmed;
  const embedUrl =
    linkType === 'google_doc' ||
    linkType === 'google_sheet' ||
    linkType === 'google_slides'
      ? normalizedUrl !== projectUrlTrimmed
        ? normalizedUrl
        : null
      : null;

  const thumbnailStatus = finalImageUrl ? null : 'pending';

  const { data, error: updateError } = await supabase
    .from('portfolio_items')
    .update({
      title: updates.title,
      description: updates.description,
      project_url: projectUrlTrimmed,
      image_url: finalImageUrl,
      tech_stack: updates.tech_stack,
      is_highlighted: Boolean(updates.is_highlighted),
      normalized_url: normalizedUrl,
      embed_url: embedUrl ?? undefined,
      resolved_type: linkType,
      thumbnail_status: thumbnailStatus,
      thumbnail_url: null,
    })
    .eq('id', projectId)
    .eq('owner_id', session.user.id)
    .select()
    .single();

  if (updateError) throw new Error(toMessage(updateError));

  setProjects((prev) =>
    prev.map((project) =>
      project.id === projectId ? (data as PortfolioItem) : project,
    ),
  );
};
