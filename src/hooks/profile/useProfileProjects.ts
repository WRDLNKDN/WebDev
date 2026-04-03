import { supabase } from '../../lib/auth/supabaseClient';
import { deriveSiblingPublicUrl } from '../../lib/media/assets';
import { getLinkType, normalizeGoogleUrl } from '../../lib/portfolio/linkUtils';
import {
  getProjectSourceFileError,
  invokePortfolioThumbnailGeneration,
  toProjectUploadFieldError,
  uploadPublicProjectAsset,
  PROJECT_SOURCE_BUCKET,
} from '../../lib/portfolio/projectMedia';
import { normalizeProjectCategories } from '../../lib/portfolio/categoryUtils';
import {
  getPortfolioUrlSafetyError,
  sanitizePortfolioUrlInput,
} from '../../lib/portfolio/linkValidation';
import {
  getPortfolioThumbnailStoragePathFromPublicUrl,
  getProjectImageStoragePathFromPublicUrl,
  getProjectSourceStoragePathFromPublicUrl,
} from '../../lib/portfolio/projectStorage';
import { toMessage } from '../../lib/utils/errors';
import type {
  NewProject,
  PortfolioItem,
  ProjectUploadFiles,
} from '../../types/portfolio';
import { ensureProfileExists, isExternalProjectUrl } from './useProfileHelpers';

type CommonParams = {
  setProjects: React.Dispatch<React.SetStateAction<PortfolioItem[]>>;
};

type AddProjectInputValidationParams = {
  projectUrlTrimmed: string;
  sourceFile?: ProjectUploadFiles['sourceFile'];
};

type ProjectLinkType = ReturnType<typeof getLinkType>;

function assertCanAddProject({
  projectUrlTrimmed,
  sourceFile,
}: AddProjectInputValidationParams): void {
  if (sourceFile && projectUrlTrimmed) {
    throw new Error(
      'Choose either an uploaded file or a project URL, not both.',
    );
  }
  if (!sourceFile && !projectUrlTrimmed) {
    throw new Error('Add a file or a project URL before saving.');
  }
  if (!sourceFile) {
    if (!isExternalProjectUrl(projectUrlTrimmed)) {
      throw new Error(
        'Project URL must be an external URL (e.g. https://...).',
      );
    }
    return;
  }

  const sourceError = getProjectSourceFileError(sourceFile);
  if (sourceError) throw new Error(sourceError);
}

export async function uploadProjectSourceUrl(params: {
  userId: string;
  projectUrlTrimmed: string;
  sourceFile?: ProjectUploadFiles['sourceFile'];
}): Promise<string> {
  const { userId, projectUrlTrimmed, sourceFile } = params;
  if (!sourceFile) return projectUrlTrimmed;

  const returnVariant = sourceFile.type.toLowerCase().startsWith('image/')
    ? 'original'
    : 'display';
  return uploadPublicProjectAsset({
    userId,
    file: sourceFile,
    bucket: PROJECT_SOURCE_BUCKET,
    prefix: 'project-source',
    returnVariant,
  });
}

export async function uploadProjectThumbnailUrl(params: {
  userId: string;
  imageUrl: string | null;
  thumbnailFile?: ProjectUploadFiles['thumbnailFile'];
}): Promise<string | null> {
  const { userId, imageUrl, thumbnailFile } = params;
  if (!thumbnailFile) return imageUrl;

  try {
    return await uploadPublicProjectAsset({
      userId,
      file: thumbnailFile,
      bucket: 'project-images',
      prefix: 'project-thumbnail',
      returnVariant: 'display',
    });
  } catch (error) {
    throw toProjectUploadFieldError('thumbnail', error);
  }
}

export function assertProjectUrlIsSafe(projectUrlTrimmed: string): void {
  const projectUrlSafetyError = getPortfolioUrlSafetyError(projectUrlTrimmed);
  if (projectUrlSafetyError) throw new Error(projectUrlSafetyError);
}

function isGoogleWorkspaceLink(linkType: ProjectLinkType): boolean {
  return (
    linkType === 'google_doc' ||
    linkType === 'google_sheet' ||
    linkType === 'google_slides'
  );
}

export function resolveProjectLinkFields(projectSourceUrl: string): {
  linkType: ProjectLinkType;
  normalizedUrl: string;
  embedUrl: string | null;
} {
  const linkType = getLinkType(projectSourceUrl);
  const normalizedUrl = isGoogleWorkspaceLink(linkType)
    ? normalizeGoogleUrl(projectSourceUrl)
    : projectSourceUrl;
  const hasDistinctEmbedUrl =
    isGoogleWorkspaceLink(linkType) && normalizedUrl !== projectSourceUrl;

  return {
    linkType,
    normalizedUrl,
    embedUrl: hasDistinctEmbedUrl ? normalizedUrl : null,
  };
}

export function resolveProjectThumbnailFields(params: {
  finalImageUrl: string | null;
  linkType: ProjectLinkType;
  projectSourceUrl: string;
  sourceFile?: ProjectUploadFiles['sourceFile'];
}): {
  thumbnailStatus: 'pending' | null;
  thumbnailUrl: string | null;
} {
  const { finalImageUrl, linkType, projectSourceUrl, sourceFile } = params;
  const sourceFileIsImage = Boolean(sourceFile && linkType === 'image');
  const needsGeneratedThumbnail = !finalImageUrl && !sourceFileIsImage;
  const derivedThumbnailUrl =
    sourceFileIsImage && projectSourceUrl.includes('/original.')
      ? deriveSiblingPublicUrl(projectSourceUrl, 'thumbnail', 'jpg')
      : null;

  return {
    thumbnailStatus: needsGeneratedThumbnail ? 'pending' : null,
    thumbnailUrl: finalImageUrl ? null : derivedThumbnailUrl,
  };
}

function getNextProjectSortOrder(projects: PortfolioItem[]): number {
  if (projects.length === 0) return 0;
  return (
    Math.max(
      ...projects.map((project) =>
        typeof project.sort_order === 'number' ? project.sort_order : 0,
      ),
    ) + 1
  );
}

export async function refreshProjectAfterThumbnailGeneration(
  project: PortfolioItem,
  thumbnailStatus: 'pending' | null,
): Promise<PortfolioItem> {
  if (thumbnailStatus !== 'pending') return project;

  await invokePortfolioThumbnailGeneration();
  const { data: refreshed } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('id', project.id)
    .maybeSingle();
  return refreshed ? (refreshed as PortfolioItem) : project;
}

function sortProjectsForDisplay(projects: PortfolioItem[]): PortfolioItem[] {
  return [...projects].sort(
    (a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export const addProjectItem = async ({
  newProject,
  files,
  projects,
  setProjects,
}: {
  newProject: NewProject;
  files?: ProjectUploadFiles;
  projects: PortfolioItem[];
} & CommonParams) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You need to sign in to add a project.');

  await ensureProfileExists(
    session.user.id,
    session.user.email ?? '',
    session.user.user_metadata?.full_name ??
      session.user.email?.split('@')[0] ??
      'User',
  );

  const thumbnailFile = files?.thumbnailFile;
  const sourceFile = files?.sourceFile;

  const projectUrlTrimmed = sanitizePortfolioUrlInput(newProject.project_url);
  assertCanAddProject({ projectUrlTrimmed, sourceFile });

  const projectSourceUrl = await uploadProjectSourceUrl({
    userId: session.user.id,
    projectUrlTrimmed,
    sourceFile,
  });

  const initialImageUrl =
    sanitizePortfolioUrlInput(newProject.image_url ?? '') || null;
  const finalImageUrl = await uploadProjectThumbnailUrl({
    userId: session.user.id,
    imageUrl: initialImageUrl,
    thumbnailFile,
  });

  if (!sourceFile) {
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
  const maxOrder = getNextProjectSortOrder(projects);

  const { data, error: insertError } = await supabase
    .from('portfolio_items')
    .insert({
      owner_id: session.user.id,
      title: newProject.title.trim(),
      description: newProject.description.trim() || null,
      project_url: projectSourceUrl,
      image_url: finalImageUrl,
      tech_stack: normalizeProjectCategories(newProject.tech_stack, 1),
      is_highlighted: Boolean(newProject.is_highlighted),
      sort_order: maxOrder,
      normalized_url: normalizedUrl,
      embed_url: embedUrl ?? undefined,
      resolved_type: linkType,
      thumbnail_status: thumbnailStatus,
      thumbnail_url: thumbnailUrl,
    })
    .select()
    .single();
  if (insertError) throw new Error(toMessage(insertError));

  const finalRow = await refreshProjectAfterThumbnailGeneration(
    data as PortfolioItem,
    thumbnailStatus,
  );

  setProjects((prev) => sortProjectsForDisplay([...prev, finalRow]));
};

export const deleteProjectItem = async ({
  projectId,
  setProjects,
}: { projectId: string } & CommonParams) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    throw new Error('You need to sign in to delete a project.');

  const { data: projectRow, error: projectFetchError } = await supabase
    .from('portfolio_items')
    .select('id, owner_id, image_url, project_url, thumbnail_url')
    .eq('id', projectId)
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (projectFetchError) throw projectFetchError;
  if (!projectRow) throw new Error('Artifact not found.');

  const imageStoragePath = getProjectImageStoragePathFromPublicUrl(
    typeof projectRow.image_url === 'string' ? projectRow.image_url : '',
  );
  const sourceStoragePath = getProjectSourceStoragePathFromPublicUrl(
    typeof projectRow.project_url === 'string' ? projectRow.project_url : '',
  );
  const thumbnailStoragePath = getPortfolioThumbnailStoragePathFromPublicUrl(
    typeof projectRow.thumbnail_url === 'string'
      ? projectRow.thumbnail_url
      : '',
  );

  if (imageStoragePath) {
    const { error: removeImageError } = await supabase.storage
      .from('project-images')
      .remove([imageStoragePath]);
    if (removeImageError) throw removeImageError;
  }

  if (sourceStoragePath) {
    const { error: removeSourceError } = await supabase.storage
      .from('project-sources')
      .remove([sourceStoragePath]);
    if (removeSourceError) throw removeSourceError;
  }

  if (thumbnailStoragePath) {
    const { error: removeThumbError } = await supabase.storage
      .from('portfolio-thumbnails')
      .remove([thumbnailStoragePath]);
    if (removeThumbError) throw removeThumbError;
  }

  const { error: deleteError } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', projectId)
    .eq('owner_id', session.user.id);
  if (deleteError) throw deleteError;

  setProjects((prev) => prev.filter((project) => project.id !== projectId));
};

export const reorderProjectItems = async ({
  orderedIds,
  setProjects,
}: {
  orderedIds: string[];
} & CommonParams) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    throw new Error('You need to sign in to reorder projects.');
  if (orderedIds.length < 2) return;

  let previousProjects: PortfolioItem[] = [];
  try {
    setProjects((prev) => {
      previousProjects = prev;
      const byId = new Map(prev.map((project) => [project.id, project]));
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((project): project is PortfolioItem => Boolean(project));
      const missing = prev.filter(
        (project) => !orderedIds.includes(project.id),
      );
      return [...reordered, ...missing].map((project, index) => ({
        ...project,
        sort_order: index,
      }));
    });

    await Promise.all(
      orderedIds.map(async (id, index) => {
        const { error } = await supabase
          .from('portfolio_items')
          .update({ sort_order: index })
          .eq('id', id)
          .eq('owner_id', session.user.id);
        if (error) throw error;
      }),
    );
  } catch {
    if (previousProjects.length > 0) setProjects(previousProjects);
    throw new Error('Could not save artifact order. Please try again.');
  }
};
