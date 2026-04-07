/**
 * Shared media upload / processing UX bridge.
 * Keeps UI copy and banner wiring consistent without pulling upload intake into `mediaStatus`.
 */

import type { MediaStatusInput } from './mediaStatus';
import type { SharedUploadState } from './uploadIntake';

export type { SharedUploadState } from './uploadIntake';

/** Stable hook for e2e and support tooling. */
export const MEDIA_STATUS_BANNER_TEST_ID = 'media-status-banner';

export function sharedUploadStateToMediaStatusInput(
  upload: SharedUploadState,
): MediaStatusInput {
  if (upload.status === 'failed') {
    return {
      stage: 'failed',
      message: upload.message,
      retryable: upload.retryable,
      diagnostics: upload.diagnostics,
    };
  }

  return {
    stage: upload.stage,
    message: upload.message,
    retryable: false,
    diagnostics: upload.diagnostics,
  };
}

export function isSharedUploadState(
  value: MediaStatusInput | SharedUploadState | null | undefined,
): value is SharedUploadState {
  return (
    value != null &&
    typeof value === 'object' &&
    'fingerprint' in value &&
    'surface' in value
  );
}

/** Normalizes banner input from intake state objects or plain `MediaStatusInput`. */
export function normalizeMediaBannerState(
  state: MediaStatusInput | SharedUploadState | null,
): MediaStatusInput | null {
  if (state == null) return null;
  if (isSharedUploadState(state)) {
    return sharedUploadStateToMediaStatusInput(state);
  }
  return state;
}
