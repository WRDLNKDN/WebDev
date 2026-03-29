import { getLinkType, getLinkTypeLabel } from './linkUtils';
import { createNormalizedPortfolioAsset } from '../media/assets';
import { RESUME_ITEM_ID, type PortfolioItem } from '../../types/portfolio';

export const getProjectResolvedType = (project: PortfolioItem) =>
  project.resolved_type && typeof project.resolved_type === 'string'
    ? project.resolved_type
    : getLinkType(project.project_url?.trim() ?? '');

export const getProjectPreviewMediaUrl = (
  project: PortfolioItem,
): string | null => {
  const asset = createNormalizedPortfolioAsset(project);
  return asset.displayUrl ?? asset.thumbnailUrl ?? asset.originalUrl ?? null;
};

export const getProjectPreviewFallbackLabel = (
  project: PortfolioItem,
): string => {
  if (project.id === RESUME_ITEM_ID) {
    const resolvedType = getProjectResolvedType(project);
    if (resolvedType === 'pdf') return 'PDF resume';
    if (resolvedType === 'document') return 'Word resume';
    return 'Resume';
  }
  const resolvedType = getProjectResolvedType(project) as Parameters<
    typeof getLinkTypeLabel
  >[0];
  if (resolvedType === 'unsupported') return 'Link preview';
  return `${getLinkTypeLabel(resolvedType)} preview`;
};
