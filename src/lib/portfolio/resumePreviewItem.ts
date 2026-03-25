import { getLinkType } from './linkUtils';
import { getResumeDisplayName } from './resumeDisplayName';
import { RESUME_ITEM_ID, type PortfolioItem } from '../../types/portfolio';

type ResumePreviewItemInput = {
  url?: string | null;
  fileName?: string | null;
  thumbnailUrl?: string | null;
  thumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
};

export const buildResumePreviewItem = ({
  url,
  fileName,
  thumbnailUrl,
  thumbnailStatus,
}: ResumePreviewItemInput): PortfolioItem | null => {
  const projectUrl = url?.trim() ?? '';
  if (!projectUrl) return null;

  const resolvedType = getLinkType(projectUrl);

  return {
    id: RESUME_ITEM_ID,
    owner_id: '',
    title: getResumeDisplayName({ fileName, url: projectUrl }),
    description: null,
    image_url: null,
    project_url: projectUrl,
    tech_stack: [],
    created_at: '',
    sort_order: 0,
    is_highlighted: false,
    normalized_url: projectUrl,
    embed_url: null,
    resolved_type: resolvedType,
    thumbnail_url: thumbnailUrl ?? null,
    thumbnail_status:
      thumbnailStatus === 'complete' ? 'generated' : (thumbnailStatus ?? null),
  };
};
