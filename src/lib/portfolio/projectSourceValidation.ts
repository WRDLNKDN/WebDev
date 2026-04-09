import { isExternalHttpUrl } from './linkUtils';
import { getProjectSourceFileError } from './projectSourceFileGate';

/** Mutual exclusivity: file upload vs project URL (shared UI + server validation). */
export const PROJECT_SOURCE_MUTEX_ERROR =
  'Choose either an uploaded file or a project URL, not both.' as const;

export const PROJECT_SOURCE_REQUIRED_ERROR =
  'Add a file or a project URL before saving.' as const;

export const PROJECT_URL_EXTERNAL_REQUIRED_ERROR =
  'Project URL must be an external URL (e.g. https://...).' as const;

export function assertCanAddProjectSource(params: {
  projectUrlTrimmed: string;
  sourceFile?: File | undefined;
}): void {
  const hasUrl = Boolean(params.projectUrlTrimmed.trim());
  const hasFile = Boolean(params.sourceFile);
  if (hasFile && hasUrl) {
    throw new Error(PROJECT_SOURCE_MUTEX_ERROR);
  }
  if (!hasFile && !hasUrl) {
    throw new Error(PROJECT_SOURCE_REQUIRED_ERROR);
  }
  if (!hasFile) {
    if (!isExternalHttpUrl(params.projectUrlTrimmed)) {
      throw new Error(PROJECT_URL_EXTERNAL_REQUIRED_ERROR);
    }
    return;
  }

  const sourceError = getProjectSourceFileError(params.sourceFile!);
  if (sourceError) throw new Error(sourceError);
}

export function assertCanUpdateProjectSource(params: {
  projectUrlTrimmed: string;
  sourceFile?: File | undefined;
  hasExistingStorageUrl: boolean;
}): void {
  const hasUrl = Boolean(params.projectUrlTrimmed.trim());
  const hasFile = Boolean(params.sourceFile);
  if (hasFile && hasUrl) {
    throw new Error(PROJECT_SOURCE_MUTEX_ERROR);
  }
  if (!hasFile && !hasUrl && !params.hasExistingStorageUrl) {
    throw new Error(PROJECT_SOURCE_REQUIRED_ERROR);
  }
  if (params.sourceFile) {
    const sourceError = getProjectSourceFileError(params.sourceFile);
    if (sourceError) throw new Error(sourceError);
    return;
  }

  const hasValidProjectUrl =
    params.hasExistingStorageUrl || isExternalHttpUrl(params.projectUrlTrimmed);
  if (!hasValidProjectUrl) {
    throw new Error(PROJECT_URL_EXTERNAL_REQUIRED_ERROR);
  }
}
