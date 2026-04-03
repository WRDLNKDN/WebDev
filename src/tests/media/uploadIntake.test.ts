import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_THUMBNAIL_HARD_MAX_BYTES } from '../../lib/media/mediaSizePolicy';

const {
  processAvatarForUploadMock,
  processResumeThumbnailImageForUploadMock,
  tryOptimizePdfForUploadMock,
  reportMediaTelemetryAsyncMock,
} = vi.hoisted(() => ({
  processAvatarForUploadMock: vi.fn(),
  processResumeThumbnailImageForUploadMock: vi.fn(),
  tryOptimizePdfForUploadMock: vi.fn(),
  reportMediaTelemetryAsyncMock: vi.fn(),
}));

vi.mock('../../lib/utils/avatarResize', () => ({
  processAvatarForUpload: processAvatarForUploadMock,
}));

vi.mock('../../lib/portfolio/processResumeThumbnailImage', () => ({
  processResumeThumbnailImageForUpload:
    processResumeThumbnailImageForUploadMock,
}));

vi.mock('../../lib/portfolio/optimizePdfForUpload', () => ({
  tryOptimizePdfForUpload: tryOptimizePdfForUploadMock,
}));

vi.mock('../../lib/media/telemetry', () => ({
  reportMediaTelemetryAsync: reportMediaTelemetryAsyncMock,
}));

import {
  detectUploadMime,
  getSharedUploadPlanFromDescriptor,
  getSharedUploadRejectionReason,
  runSharedUploadIntake,
} from '../../lib/media/uploadIntake';

describe('shared upload intake', () => {
  beforeEach(() => {
    processAvatarForUploadMock.mockReset();
    processResumeThumbnailImageForUploadMock.mockReset();
    tryOptimizePdfForUploadMock.mockReset();
    reportMediaTelemetryAsyncMock.mockReset();
    processAvatarForUploadMock.mockResolvedValue({
      blob: new Blob(['avatar'], { type: 'image/jpeg' }),
      isProcessed: true,
    });
    processResumeThumbnailImageForUploadMock.mockResolvedValue(
      new Blob(['thumb'], { type: 'image/jpeg' }),
    );
    tryOptimizePdfForUploadMock.mockImplementation(async (file: File) => file);
  });

  it('keeps chat GIF planning in the shared intake layer', () => {
    expect(
      getSharedUploadPlanFromDescriptor('chat_attachment', {
        name: 'party.gif',
        type: 'image/gif',
        size: 5 * 1024 * 1024,
      }),
    ).toMatchObject({
      accepted: true,
      mode: 'gif_processing',
    });
  });

  it('sniffs MIME types from file headers before upload dispatch', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    await expect(
      detectUploadMime(
        new File([pngBytes], 'mystery.bin', {
          type: 'application/octet-stream',
        }),
      ),
    ).resolves.toBe('image/png');
  });

  it('accepts processed GIF video attachments through the shared chat policy', () => {
    expect(
      getSharedUploadPlanFromDescriptor('chat_attachment', {
        name: 'party.mp4',
        type: 'video/mp4',
        size: 6 * 1024 * 1024,
      }),
    ).toMatchObject({
      accepted: true,
      mode: 'direct',
    });
  });

  it('reuses shared validation messages for portfolio thumbnails', () => {
    expect(
      getSharedUploadRejectionReason(
        'portfolio_thumbnail',
        new File(
          [new Uint8Array(PROJECT_THUMBNAIL_HARD_MAX_BYTES + 1)],
          'thumb.png',
          {
            type: 'image/png',
          },
        ),
      ),
    ).toContain('Thumbnail images can start up to 15 MB');
  });

  it('accepts transformable thumbnail images above the soft target when they are still within the input ceiling', () => {
    expect(
      getSharedUploadPlanFromDescriptor('portfolio_thumbnail', {
        name: 'thumb.png',
        type: 'image/png',
        size: 8 * 1024 * 1024,
      }),
    ).toMatchObject({
      accepted: true,
      mode: 'optimize',
    });
  });

  it('preprocesses avatar uploads before executing the surface upload callback', async () => {
    const states: Array<{
      stage: string;
      surface: string;
      diagnosticsId: string;
    }> = [];
    const executeUpload = vi.fn<
      (prepared: { file: File; detectedMimeType: string }) => Promise<string>
    >(async () => 'https://example.com/avatar.jpg');

    await expect(
      runSharedUploadIntake({
        surface: 'profile_avatar',
        file: new File(['avatar'], 'me.png', { type: 'image/png' }),
        onStateChange: (state) => {
          states.push({
            stage: state.stage,
            surface: state.surface,
            diagnosticsId: state.diagnostics.id,
          });
        },
        executeUpload,
      }),
    ).resolves.toBe('https://example.com/avatar.jpg');

    expect(executeUpload).toHaveBeenCalledTimes(1);
    const prepared = executeUpload.mock.calls[0]?.[0];
    expect(prepared).toBeDefined();
    if (!prepared) throw new Error('Prepared upload missing');
    expect(prepared.file.type).toBe('image/jpeg');
    expect(prepared.detectedMimeType).toBe('image/jpeg');
    expect(states.map((state) => state.stage)).toEqual([
      'validating',
      'optimizing',
      'uploading',
      'ready',
    ]);
    expect(states.every((state) => state.surface === 'profile_avatar')).toBe(
      true,
    );
    expect(states.every((state) => state.diagnosticsId.length > 0)).toBe(true);
    expect(reportMediaTelemetryAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'media_intake_ready',
        pipeline: 'upload_intake',
        surface: 'profile_avatar',
        stage: 'upload',
        status: 'ready',
      }),
    );
    expect(reportMediaTelemetryAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'media_intake_compression_succeeded',
        surface: 'profile_avatar',
        status: 'ready',
      }),
    );
  });

  it('blocks duplicate in-flight uploads with one shared error message', async () => {
    const lastModified = 1711929600000;
    let releaseFirstUpload: (() => void) | undefined;
    let signalInFlight: (() => void) | null = null;
    const firstInFlight = new Promise<void>((resolve) => {
      signalInFlight = resolve;
    });

    const firstUpload = runSharedUploadIntake({
      surface: 'feed_post_image',
      file: new File(['same-image'], 'photo.png', {
        type: 'image/png',
        lastModified,
      }),
      onStateChange: (state) => {
        if (state.status === 'processing' || state.status === 'uploading') {
          signalInFlight?.();
        }
      },
      executeUpload: async () =>
        new Promise<string>((resolve) => {
          releaseFirstUpload = () => resolve('ok');
        }),
    });

    await firstInFlight;

    await expect(
      runSharedUploadIntake({
        surface: 'feed_post_image',
        file: new File(['same-image'], 'photo.png', {
          type: 'image/png',
          lastModified,
        }),
        executeUpload: async () => 'should-not-run',
      }),
    ).rejects.toThrow(
      'This file is already uploading. Wait a moment and try again.',
    );

    releaseFirstUpload?.();
    await expect(firstUpload).resolves.toBe('ok');
  });

  it('marks validation failures as non-retryable in the shared upload state', async () => {
    const states: Array<{ stage: string; retryable: boolean }> = [];

    await expect(
      runSharedUploadIntake({
        surface: 'group_image',
        file: new File(['bad'], 'logo.svg', { type: 'image/svg+xml' }),
        onStateChange: (state) => {
          states.push({
            stage: state.stage,
            retryable: state.retryable,
          });
        },
        executeUpload: async () => 'should-not-run',
      }),
    ).rejects.toThrow('Group picture must be a PNG, JPG, or WebP image.');

    expect(states.at(-1)).toEqual({
      stage: 'failed',
      retryable: false,
    });
    expect(reportMediaTelemetryAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'media_intake_validation_failed',
        failureCode: 'validation_failed',
        surface: 'group_image',
      }),
    );
  });

  it('fails a resume pdf when optimization still cannot bring it under the final upload ceiling', async () => {
    const executeUpload = vi.fn(async () => 'should-not-run');
    tryOptimizePdfForUploadMock.mockResolvedValue(
      new File([new Uint8Array(7 * 1024 * 1024)], 'resume.pdf', {
        type: 'application/pdf',
      }),
    );

    await expect(
      runSharedUploadIntake({
        surface: 'profile_resume',
        file: new File([new Uint8Array(10 * 1024 * 1024)], 'resume.pdf', {
          type: 'application/pdf',
        }),
        executeUpload,
      }),
    ).rejects.toThrow('Resume is too large');

    expect(executeUpload).not.toHaveBeenCalled();
    expect(reportMediaTelemetryAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'media_intake_prepared_validation_failed',
        failureCode: 'prepared_size_limit_exceeded',
        surface: 'profile_resume',
      }),
    );
  });
});
