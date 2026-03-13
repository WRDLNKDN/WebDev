import { supabase } from '../../lib/auth/supabaseClient';
import { getLinkType, normalizeGoogleUrl } from '../../lib/portfolio/linkUtils';
import {
  invokePortfolioThumbnailGeneration,
  uploadPublicProjectAsset,
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

  const sourceFile = files?.sourceFile;
  const thumbnailFile = files?.thumbnailFile;

  let projectUrlTrimmed = sanitizePortfolioUrlInput(newProject.project_url);
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
    sanitizePortfolioUrlInput(newProject.image_url ?? '') || null;
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
  const maxOrder =
    projects.length > 0
      ? Math.max(
          ...projects.map((project) =>
            typeof project.sort_order === 'number' ? project.sort_order : 0,
          ),
        ) + 1
      : 0;

  const { data, error: insertError } = await supabase
    .from('portfolio_items')
    .insert({
      owner_id: session.user.id,
      title: newProject.title.trim(),
      description: newProject.description.trim() || null,
      project_url: projectUrlTrimmed,
      image_url: finalImageUrl,
      tech_stack: normalizeProjectCategories(newProject.tech_stack, 1),
      is_highlighted: Boolean(newProject.is_highlighted),
      sort_order: maxOrder,
      normalized_url: normalizedUrl,
      embed_url: embedUrl ?? undefined,
      resolved_type: linkType,
      thumbnail_status: thumbnailStatus,
    })
    .select()
    .single();
  if (insertError) throw new Error(toMessage(insertError));

  let finalRow = data as PortfolioItem;
  if (thumbnailStatus === 'pending') {
    await invokePortfolioThumbnailGeneration();
    const { data: refreshed } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', data.id)
      .maybeSingle();
    if (refreshed) finalRow = refreshed as PortfolioItem;
  }

  setProjects((prev) =>
    [...prev, finalRow].sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  );
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
