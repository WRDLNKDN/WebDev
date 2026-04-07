/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { createNormalizedAsset } from '../../lib/media/assets';
import { describe, expect, it, vi } from 'vitest';
import { MediaStatusBanner } from '../../components/media/MediaStatusBanner';
import {
  describeMediaStatus,
  formatMediaDiagnosticsLabel,
  normalizedAssetToMediaStatusInput,
} from '../../lib/media/mediaStatus';
import {
  MediaPreviewStatusOverlay,
  MEDIA_PREVIEW_STATUS_OVERLAY_TEST_ID,
} from '../../components/media/MediaPreviewStatusOverlay';

const theme = createTheme();

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('shared media status', () => {
  it('formats diagnostics labels consistently for support and debugging', () => {
    expect(
      formatMediaDiagnosticsLabel({
        id: 'fingerprint-123',
        surface: 'feed_post_image',
        mimeType: 'image/png',
        code: 'upload_failed',
      }),
    ).toBe('feed_post_image • upload_failed • image/png • fingerprint-123');
  });

  it('describes optimizing and failed media states with consistent defaults', () => {
    expect(
      describeMediaStatus({
        stage: 'optimizing',
      }),
    ).toMatchObject({
      title: 'Optimizing media',
      tone: 'info',
      showSpinner: true,
    });

    expect(
      describeMediaStatus({
        stage: 'failed',
        retryable: true,
      }),
    ).toMatchObject({
      title: 'Media failed',
      tone: 'error',
      retryable: true,
      ariaLive: 'assertive',
    });
  });

  it('renders retry affordances and diagnostics for recoverable failures', () => {
    const onRetry = vi.fn();

    renderWithTheme(
      <MediaStatusBanner
        state={{
          stage: 'failed',
          message: 'Preview generation stalled.',
          retryable: true,
          diagnostics: {
            id: 'asset-42',
            surface: 'profile_resume',
            code: 'thumbnail_failed',
          },
        }}
        onRetry={onRetry}
        showDiagnostics
      />,
    );

    expect(screen.getByText('Media failed')).toBeTruthy();
    expect(screen.getByText('Preview generation stalled.')).toBeTruthy();
    expect(
      screen.getByText('profile_resume • thumbnail_failed • asset-42'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('maps normalized assets to a deterministic media status input', () => {
    const ready = createNormalizedAsset({
      sourceType: 'upload',
      mediaType: 'image',
      processingState: 'ready',
    });
    expect(normalizedAssetToMediaStatusInput(ready)).toBeNull();

    const optimizing = createNormalizedAsset({
      sourceType: 'upload',
      mediaType: 'image',
      assetId: 'a1',
      processingState: 'optimizing',
      mimeType: 'image/webp',
    });
    expect(normalizedAssetToMediaStatusInput(optimizing)).toEqual({
      stage: 'optimizing',
      message: null,
      diagnostics: { id: 'a1', mimeType: 'image/webp' },
    });
  });

  it('renders preview overlay with shared banner test id', () => {
    renderWithTheme(
      <MediaPreviewStatusOverlay
        mode="processing"
        state={{ stage: 'uploading', message: 'Saving…' }}
      />,
    );
    expect(
      screen.getByTestId(MEDIA_PREVIEW_STATUS_OVERLAY_TEST_ID),
    ).toBeTruthy();
    expect(screen.getByTestId('media-status-banner')).toBeTruthy();
  });
});
