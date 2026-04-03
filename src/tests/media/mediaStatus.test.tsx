/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MediaStatusBanner } from '../../components/media/MediaStatusBanner';
import {
  describeMediaStatus,
  formatMediaDiagnosticsLabel,
} from '../../lib/media/mediaStatus';

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
});
