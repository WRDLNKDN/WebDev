import {
  getLinkType,
  getLinkTypeLabel,
  isPreviewableType,
  normalizeGoogleUrl,
  type PortfolioLinkType,
} from './linkUtils';
import { getDocumentInteractionPolicy } from '../media/documents';
import type { PortfolioItem } from '../../types/portfolio';

export type PortfolioPreviewKind = 'image' | 'iframe' | 'none';

export interface PortfolioPreviewModel {
  kind: PortfolioPreviewKind;
  linkType: PortfolioLinkType;
  typeLabel: string;
  openUrl: string;
  downloadUrl: string;
  previewUrl: string;
  previewable: boolean;
  preferDownload: boolean;
  fallbackMessage: string | null;
}

function resolveHttpUrl(rawUrl: string | null | undefined): string {
  const raw = rawUrl?.trim() ?? '';
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^\/\//.test(raw)) return `https:${raw}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(raw)) {
    return `https://${raw}`;
  }
  return '';
}

function buildPreviewUrl(
  linkType: PortfolioLinkType,
  sourceUrl: string,
  embedUrl: string,
): string {
  if (!sourceUrl) return '';

  switch (linkType) {
    case 'image':
      return sourceUrl;
    case 'pdf':
      return `${sourceUrl}#toolbar=0&navpanes=0`;
    case 'google_doc':
    case 'google_sheet':
    case 'google_slides':
      return embedUrl;
    case 'document':
    case 'presentation':
    case 'spreadsheet':
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(sourceUrl)}`;
    default:
      return '';
  }
}

function buildPreviewKind(
  linkType: PortfolioLinkType,
  previewable: boolean,
): PortfolioPreviewKind {
  if (!previewable) return 'none';
  if (linkType === 'image') return 'image';
  return 'iframe';
}

export function getPortfolioPreviewModel(
  project: PortfolioItem | null,
): PortfolioPreviewModel {
  const sourceUrl = resolveHttpUrl(project?.project_url);
  const linkType = sourceUrl ? getLinkType(sourceUrl) : 'unsupported';
  const normalizedEmbedUrl =
    project?.embed_url?.trim() ||
    (linkType === 'google_doc' ||
    linkType === 'google_sheet' ||
    linkType === 'google_slides'
      ? normalizeGoogleUrl(sourceUrl)
      : sourceUrl);
  const documentPolicy =
    linkType === 'pdf' ||
    linkType === 'document' ||
    linkType === 'presentation' ||
    linkType === 'spreadsheet' ||
    linkType === 'text'
      ? getDocumentInteractionPolicy({
          url: sourceUrl,
          fileName: project?.title ?? sourceUrl,
          resolvedType: linkType,
        })
      : null;
  const previewable =
    documentPolicy?.previewable ?? isPreviewableType(linkType);
  const previewUrl = documentPolicy?.previewUrl
    ? documentPolicy.previewUrl
    : buildPreviewUrl(linkType, sourceUrl, normalizedEmbedUrl);

  return {
    kind: buildPreviewKind(linkType, previewable),
    linkType,
    typeLabel: documentPolicy?.typeLabel ?? getLinkTypeLabel(linkType),
    openUrl: sourceUrl,
    downloadUrl: sourceUrl,
    previewUrl,
    previewable,
    preferDownload: documentPolicy?.preferDownload ?? false,
    fallbackMessage: documentPolicy?.fallbackMessage ?? null,
  };
}
