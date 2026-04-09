import { deriveSiblingPublicUrl } from '../media/assets';
import type { PortfolioLinkType } from './linkUtils';

/**
 * Direct http(s) image links use `project_url` for display; no server thumbnail job.
 * Unsupported / unknown links also skip the generator (fallback art applies in UI).
 */
export function linkTypeRequiresServerThumbnail(
  linkType: PortfolioLinkType,
): boolean {
  if (linkType === 'image' || linkType === 'unsupported') return false;
  return true;
}

function isUploadedSourceImage(
  sourceFile: File | undefined,
  linkType: PortfolioLinkType,
): boolean {
  if (!sourceFile) return false;
  const mime = sourceFile.type.toLowerCase();
  if (mime.startsWith('image/')) return true;
  return linkType === 'image';
}

export function resolveProjectThumbnailFields(params: {
  finalImageUrl: string | null;
  linkType: PortfolioLinkType;
  projectSourceUrl: string;
  sourceFile?: File;
}): {
  thumbnailStatus: 'pending' | null;
  thumbnailUrl: string | null;
} {
  const { finalImageUrl, linkType, projectSourceUrl, sourceFile } = params;
  const sourceFileIsImage = isUploadedSourceImage(sourceFile, linkType);
  const needsGeneratedThumbnail =
    !finalImageUrl &&
    !sourceFileIsImage &&
    linkTypeRequiresServerThumbnail(linkType);

  const derivedThumbnailUrl =
    sourceFileIsImage && projectSourceUrl.includes('/original.')
      ? deriveSiblingPublicUrl(projectSourceUrl, 'thumbnail', 'jpg')
      : null;

  return {
    thumbnailStatus: needsGeneratedThumbnail ? 'pending' : null,
    thumbnailUrl: finalImageUrl ? null : derivedThumbnailUrl,
  };
}
