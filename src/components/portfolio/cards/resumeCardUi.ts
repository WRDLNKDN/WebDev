import {
  resumePublicUrlLooksWord,
  resumeSupportsServerThumbnailGeneration,
} from '../../../lib/portfolio/resumePreviewSupport';
import { getResumeDisplayName } from '../../../lib/portfolio/resumeDisplayName';
export type ResumeCardUiInput = {
  url?: string | null;
  fileName?: string | null;
  thumbnailUrl?: string | null;
  thumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
  thumbnailError?: string | null;
  isOwner?: boolean;
  onRetryThumbnail?: () => void;
  onEditReplaceResume?: (file: File) => void | Promise<void>;
  onEditUploadThumbnail?: (file: File) => void | Promise<void>;
  onEditRegenerateThumbnail?: () => void | Promise<void>;
};

export type ResumeCardUiState = {
  hasResume: boolean;
  hasThumbnail: boolean;
  resumeTitle: string;
  isPdf: boolean;
  isWordResume: boolean;
  serverPreviewEligible: boolean;
  errorSuggestsUnsupported: boolean;
  showRetry: boolean;
  showEdit: boolean;
  canRegenerateFromDocument: boolean;
};

export function computeResumeCardUiState(
  p: ResumeCardUiInput,
): ResumeCardUiState {
  const hasResume = Boolean(p.url);
  const hasThumbnail = Boolean(p.thumbnailUrl);
  const resumeTitle = getResumeDisplayName({
    fileName: p.fileName,
    url: p.url,
  });
  const isPdf =
    (p.fileName?.toLowerCase().endsWith('.pdf') ?? false) ||
    (p.url?.toLowerCase().includes('.pdf') ?? false);
  const isWordResume = resumePublicUrlLooksWord(p.fileName, p.url);
  const serverPreviewEligible = resumeSupportsServerThumbnailGeneration(
    p.fileName,
    p.url,
  );
  const errorSuggestsUnsupported =
    typeof p.thumbnailError === 'string' &&
    (p.thumbnailError.toLowerCase().includes('not supported') ||
      p.thumbnailError.toLowerCase().includes('unsupported') ||
      p.thumbnailError.toLowerCase().includes('file type'));
  const showRetry = Boolean(
    p.isOwner &&
      p.thumbnailStatus === 'failed' &&
      p.onRetryThumbnail &&
      serverPreviewEligible &&
      !errorSuggestsUnsupported &&
      !isWordResume,
  );
  const showEdit =
    Boolean(p.isOwner && hasResume) &&
    Boolean(
      p.onEditReplaceResume ||
        p.onEditUploadThumbnail ||
        p.onEditRegenerateThumbnail,
    );
  const canRegenerateFromDocument =
    Boolean(p.onEditRegenerateThumbnail) && serverPreviewEligible;

  return {
    hasResume,
    hasThumbnail,
    resumeTitle,
    isPdf,
    isWordResume,
    serverPreviewEligible,
    errorSuggestsUnsupported,
    showRetry,
    showEdit,
    canRegenerateFromDocument,
  };
}
