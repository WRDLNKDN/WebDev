import { supabase } from '../../lib/auth/supabaseClient';
import { normalizeProjectCategories } from '../../lib/portfolio/categoryUtils';
import { getLinkType, normalizeGoogleUrl } from '../../lib/portfolio/linkUtils';
import {
  invokePortfolioThumbnailGeneration,
  uploadPublicProjectAsset,
} from '../../lib/portfolio/projectMedia';
import {
  getPortfolioUrlSafetyError,
  sanitizePortfolioUrlInput,
} from '../../lib/portfolio/linkValidation';
import { toMessage } from '../../lib/utils/errors';
import type {
  NewProject,
  PortfolioItem,
  ProjectUploadFiles,
} from '../../types/portfolio';
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
  files,
  setProjects,
}: {
  projectId: string;
  updates: NewProject;
  files?: ProjectUploadFiles;
} & Params) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You need to sign in to update a project.');
  }

  const sourceFile = files?.sourceFile;
  const thumbnailFile = files?.thumbnailFile;

  let projectUrlTrimmed = sanitizePortfolioUrlInput(updates.project_url);
  if (sourceFile) {
    projectUrlTrimmed = await uploadPublicProjectAsset({
      userId: session.user.id,
      file: sourceFile,
      bucket: 'project-sources',
      prefix: 'project-source',
    });
  }
  if (!projectUrlTrimmed) {
    throw new Error('Choose a project source file or enter a Project URL.');
  }
  if (!sourceFile && !isExternalProjectUrl(projectUrlTrimmed)) {
    throw new Error('Project URL must be an external URL (e.g. https://...).');
  }

  let finalImageUrl =
    sanitizePortfolioUrlInput(updates.image_url ?? '') || null;
  if (thumbnailFile) {
    finalImageUrl = await uploadPublicProjectAsset({
      userId: session.user.id,
      file: thumbnailFile,
      bucket: 'project-images',
      prefix: 'project-thumbnail',
    });
  }

  if (!sourceFile) {
    const projectUrlSafetyError = getPortfolioUrlSafetyError(projectUrlTrimmed);
    if (projectUrlSafetyError) throw new Error(projectUrlSafetyError);
  }

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
      title: updates.title.trim(),
      description: updates.description.trim() || null,
      project_url: projectUrlTrimmed,
      image_url: finalImageUrl,
      tech_stack: normalizeProjectCategories(updates.tech_stack, 1),
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

  let finalRow = data as PortfolioItem;
  if (thumbnailStatus === 'pending') {
    await invokePortfolioThumbnailGeneration();
    const { data: refreshed } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();
    if (refreshed) finalRow = refreshed as PortfolioItem;
  }

  setProjects((prev) =>
    prev.map((project) => (project.id === projectId ? finalRow : project)),
  );
};
