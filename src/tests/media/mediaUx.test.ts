import { describe, expect, it } from 'vitest';
import {
  isSharedUploadState,
  normalizeMediaBannerState,
  sharedUploadStateToMediaStatusInput,
} from '../../lib/media/mediaUx';
import type { SharedUploadState } from '../../lib/media/uploadIntake';

describe('media UX bridge', () => {
  it('maps shared upload intake state to banner input', () => {
    const validating: SharedUploadState = {
      status: 'validating',
      stage: 'validating',
      message: 'Checking file before upload...',
      fingerprint: 'fp-1',
      surface: 'chat_attachment',
      retryable: false,
      diagnostics: {
        id: 'fp-1',
        surface: 'chat_attachment',
        mimeType: 'image/png',
        code: null,
      },
    };
    expect(sharedUploadStateToMediaStatusInput(validating)).toEqual({
      stage: 'validating',
      message: 'Checking file before upload...',
      retryable: false,
      diagnostics: validating.diagnostics,
    });

    const failed: SharedUploadState = {
      status: 'failed',
      stage: 'failed',
      message: 'Network error',
      fingerprint: 'fp-2',
      surface: 'feed_post_image',
      retryable: true,
      diagnostics: {
        id: 'fp-2',
        surface: 'feed_post_image',
        code: 'upload_failed',
        mimeType: 'image/jpeg',
      },
    };
    expect(sharedUploadStateToMediaStatusInput(failed)).toEqual({
      stage: 'failed',
      message: 'Network error',
      retryable: true,
      diagnostics: failed.diagnostics,
    });
  });

  it('normalizes shared upload objects for MediaStatusBanner', () => {
    const upload: SharedUploadState = {
      status: 'uploading',
      stage: 'uploading',
      message: null,
      fingerprint: 'fp-3',
      surface: 'chat_attachment',
      retryable: false,
      diagnostics: { id: 'fp-3', surface: 'chat_attachment' },
    };
    expect(normalizeMediaBannerState(upload)).toEqual({
      stage: 'uploading',
      message: null,
      retryable: false,
      diagnostics: upload.diagnostics,
    });

    expect(
      normalizeMediaBannerState({
        stage: 'ready',
        message: 'Done',
      }),
    ).toEqual({
      stage: 'ready',
      message: 'Done',
    });
  });

  it('detects shared upload state by fingerprint + surface', () => {
    expect(
      isSharedUploadState({
        stage: 'uploading',
        fingerprint: 'x',
        surface: 'chat_attachment',
      } as SharedUploadState),
    ).toBe(true);
    expect(isSharedUploadState({ stage: 'uploading' })).toBe(false);
  });
});
