import { supabase } from '../../lib/auth/supabaseClient';
import { deriveSiblingPublicUrl } from '../../lib/media/assets';
import { normalizeProjectCategories } from '../../lib/portfolio/categoryUtils';
import { getLinkType, normalizeGoogleUrl } from '../../lib/portfolio/linkUtils';
import {
  getProjectSourceFileError,
  invokePortfolioThumbnailGeneration,
  PROJECT_SOURCE_BUCKET,
  uploadPublicProjectAsset,
  isProjectSourceStorageUrl,
} from '../../lib/portfolio/projectMedia';
import {
  getPortfolioUrlSafetyError,
  sanitizePortfolioUrlInput,
} from '../../lib/portfolio/linkValidation';
import {
  getProjectImageStoragePathFromPublicUrl,
  getProjectSourceStoragePathFromPublicUrl,
} from '../../lib/portfolio/projectStorage';
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

  const thumbnailFile = files?.thumbnailFile;
  const sourceFile = files?.sourceFile;

  const projectUrlTrimmed = sanitizePortfolioUrlInput(updates.project_url);
  const hasExistingStorageUrl = isProjectSourceStorageUrl(projectUrlTrimmed);
  if (sourceFile && projectUrlTrimmed) {
    throw new Error(
      'Choose either an uploaded file or a project URL, not both.',
    );
  }
  if (!sourceFile && !projectUrlTrimmed) {
    throw new Error('Add a file or a project URL before saving.');
  }
  if (sourceFile) {
    const sourceError = getProjectSourceFileError(sourceFile);
    if (sourceError) throw new Error(sourceError);
  } else if (
    !hasExistingStorageUrl &&
    !isExternalProjectUrl(projectUrlTrimmed)
  ) {
    throw new Error('Project URL must be an external URL (e.g. https://...).');
  }

  const { data: existingProject, error: existingProjectError } = await supabase
    .from('portfolio_items')
    .select('image_url, project_url')
    .eq('id', projectId)
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (existingProjectError) throw new Error(toMessage(existingProjectError));

  const existingImagePath = getProjectImageStoragePathFromPublicUrl(
    typeof existingProject?.image_url === 'string'
      ? existingProject.image_url
      : '',
  );
  const existingSourcePath = getProjectSourceStoragePathFromPublicUrl(
    typeof existingProject?.project_url === 'string'
      ? existingProject.project_url
      : '',
  );

  const projectSourceUrl = sourceFile
    ? await uploadPublicProjectAsset({
        userId: session.user.id,
        file: sourceFile,
        bucket: PROJECT_SOURCE_BUCKET,
        prefix: 'project-source',
        returnVariant: sourceFile.type.toLowerCase().startsWith('image/')
          ? 'original'
          : 'display',
      })
    : projectUrlTrimmed;

  let finalImageUrl =
    sanitizePortfolioUrlInput(updates.image_url ?? '') || null;
  if (thumbnailFile) {
    finalImageUrl = await uploadPublicProjectAsset({
      userId: session.user.id,
      file: thumbnailFile,
      bucket: 'project-images',
      prefix: 'project-thumbnail',
      returnVariant: 'display',
    });
  }

  if (!sourceFile && !hasExistingStorageUrl) {
    const projectUrlSafetyError = getPortfolioUrlSafetyError(projectUrlTrimmed);
    if (projectUrlSafetyError) throw new Error(projectUrlSafetyError);
  }

  const linkType = getLinkType(projectSourceUrl);
  const normalizedUrl =
    linkType === 'google_doc' ||
    linkType === 'google_sheet' ||
    linkType === 'google_slides'
      ? normalizeGoogleUrl(projectSourceUrl)
      : projectSourceUrl;
  const embedUrl =
    linkType === 'google_doc' ||
    linkType === 'google_sheet' ||
    linkType === 'google_slides'
      ? normalizedUrl !== projectSourceUrl
        ? normalizedUrl
        : null
      : null;

  const sourceFileIsImage = Boolean(sourceFile && linkType === 'image');
  const derivedThumbnailUrl =
    sourceFileIsImage && projectSourceUrl.includes('/original.')
      ? deriveSiblingPublicUrl(projectSourceUrl, 'thumbnail', 'jpg')
      : null;
  const thumbnailStatus = finalImageUrl || sourceFileIsImage ? null : 'pending';

  const { data, error: updateError } = await supabase
    .from('portfolio_items')
    .update({
      title: updates.title.trim(),
      description: updates.description.trim() || null,
      project_url: projectSourceUrl,
      image_url: finalImageUrl,
      tech_stack: normalizeProjectCategories(updates.tech_stack, 1),
      is_highlighted: Boolean(updates.is_highlighted),
      normalized_url: normalizedUrl,
      embed_url: embedUrl ?? undefined,
      resolved_type: linkType,
      thumbnail_status: thumbnailStatus,
      thumbnail_url: finalImageUrl ? null : derivedThumbnailUrl,
    })
    .eq('id', projectId)
    .eq('owner_id', session.user.id)
    .select()
    .single();

  if (updateError) throw new Error(toMessage(updateError));

  if (
    existingImagePath &&
    typeof existingProject?.image_url === 'string' &&
    existingProject.image_url !== finalImageUrl
  ) {
    await supabase.storage.from('project-images').remove([existingImagePath]);
  }

  if (
    existingSourcePath &&
    typeof existingProject?.project_url === 'string' &&
    existingProject.project_url !== projectSourceUrl
  ) {
    await supabase.storage.from('project-sources').remove([existingSourcePath]);
  }

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
