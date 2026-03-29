import { supabase } from '../../lib/auth/supabaseClient';
import { normalizeProjectCategories } from '../../lib/portfolio/categoryUtils';
import {
  getProjectSourceFileError,
  isProjectSourceStorageUrl,
} from '../../lib/portfolio/projectMedia';
import { sanitizePortfolioUrlInput } from '../../lib/portfolio/linkValidation';
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
import {
  assertProjectUrlIsSafe,
  refreshProjectAfterThumbnailGeneration,
  resolveProjectLinkFields,
  resolveProjectThumbnailFields,
  uploadProjectSourceUrl,
  uploadProjectThumbnailUrl,
} from './useProfileProjects';

type Params = {
  setProjects: React.Dispatch<React.SetStateAction<PortfolioItem[]>>;
};

function assertCanUpdateProject(params: {
  projectUrlTrimmed: string;
  sourceFile?: ProjectUploadFiles['sourceFile'];
  hasExistingStorageUrl: boolean;
}) {
  const { projectUrlTrimmed, sourceFile, hasExistingStorageUrl } = params;
  const hasSourceFile = Boolean(sourceFile);
  const hasProjectUrl = Boolean(projectUrlTrimmed);
  if (hasSourceFile && hasProjectUrl) {
    throw new Error(
      'Choose either an uploaded file or a project URL, not both.',
    );
  }
  if (!hasSourceFile && !hasProjectUrl) {
    throw new Error('Add a file or a project URL before saving.');
  }
  if (sourceFile) {
    const sourceError = getProjectSourceFileError(sourceFile);
    if (sourceError) throw new Error(sourceError);
    return;
  }

  const hasValidProjectUrl =
    hasExistingStorageUrl || isExternalProjectUrl(projectUrlTrimmed);
  if (!hasValidProjectUrl) {
    throw new Error('Project URL must be an external URL (e.g. https://...).');
  }
}

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
  assertCanUpdateProject({
    projectUrlTrimmed,
    sourceFile,
    hasExistingStorageUrl,
  });

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

  const projectSourceUrl = await uploadProjectSourceUrl({
    userId: session.user.id,
    projectUrlTrimmed,
    sourceFile,
  });

  const initialImageUrl =
    sanitizePortfolioUrlInput(updates.image_url ?? '') || null;
  const finalImageUrl = await uploadProjectThumbnailUrl({
    userId: session.user.id,
    imageUrl: initialImageUrl,
    thumbnailFile,
  });

  const usesExternalProjectUrl = !sourceFile && !hasExistingStorageUrl;
  if (usesExternalProjectUrl) {
    assertProjectUrlIsSafe(projectUrlTrimmed);
  }

  const { linkType, normalizedUrl, embedUrl } =
    resolveProjectLinkFields(projectSourceUrl);
  const { thumbnailStatus, thumbnailUrl } = resolveProjectThumbnailFields({
    finalImageUrl,
    linkType,
    projectSourceUrl,
    sourceFile,
  });

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
      thumbnail_url: thumbnailUrl,
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

  const finalRow = await refreshProjectAfterThumbnailGeneration(
    data as PortfolioItem,
    thumbnailStatus,
  );

  setProjects((prev) =>
    prev.map((project) => (project.id === projectId ? finalRow : project)),
  );
};
