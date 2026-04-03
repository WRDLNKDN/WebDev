/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const telemetryMocks = vi.hoisted(() => ({
  reportMediaTelemetryAsync: vi.fn(),
}));

vi.mock('../../lib/media/telemetry', () => ({
  reportMediaTelemetryAsync: telemetryMocks.reportMediaTelemetryAsync,
}));
import {
  AssetAvatar,
  AssetInlinePreview,
  AssetThumbnail,
  classifyInlineMediaShape,
  getInlineMediaPresentation,
  getInlineMediaSurfaceMaxHeight,
} from '../../components/media/AssetThumbnail';
import { LinkPreviewCard } from '../../components/media/LinkPreviewCard';
import { createNormalizedAsset } from '../../lib/media/assets';

const theme = createTheme();

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('shared media renderers', () => {
  beforeEach(() => {
    telemetryMocks.reportMediaTelemetryAsync.mockReset();
  });

  it('renders inline images from display derivatives instead of originals', () => {
    const asset = createNormalizedAsset({
      sourceType: 'upload',
      mediaType: 'image',
      originalUrl: 'https://example.com/original.png',
      displayUrl: 'https://example.com/display.webp',
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      width: 1600,
      height: 900,
    });

    renderWithTheme(<AssetInlinePreview asset={asset} alt="Project image" />);

    expect(screen.getByAltText('Project image').getAttribute('src')).toContain(
      'display.webp',
    );
  });

  it('renders animated media with derivative poster images', () => {
    const asset = createNormalizedAsset({
      sourceType: 'upload',
      mediaType: 'video',
      originalUrl: 'https://example.com/original.mov',
      displayUrl: 'https://example.com/display.mp4',
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
    });

    renderWithTheme(<AssetInlinePreview asset={asset} alt="Animated clip" />);

    const video = screen.getByLabelText('Animated clip');
    expect(video.getAttribute('src')).toContain('display.mp4');
    expect(video.getAttribute('poster')).toContain('thumbnail.jpg');
  });

  it('renders document thumbnails from shared preview derivatives', () => {
    const asset = createNormalizedAsset({
      sourceType: 'upload',
      mediaType: 'doc',
      originalUrl: 'https://example.com/original.pdf',
      displayUrl: 'https://example.com/display.svg',
      thumbnailUrl: 'https://example.com/thumbnail.svg',
      title: 'Resume',
    });

    renderWithTheme(<AssetThumbnail asset={asset} alt="Resume" compact />);

    expect(screen.getByAltText('Resume').getAttribute('src')).toContain(
      'thumbnail.svg',
    );
  });

  it('renders group avatars from shared media assets', () => {
    const asset = createNormalizedAsset({
      sourceType: 'upload',
      mediaType: 'image',
      displayUrl: 'https://example.com/group-display.webp',
      thumbnailUrl: 'https://example.com/group-thumb.jpg',
      title: 'Design Group',
    });

    renderWithTheme(<AssetAvatar asset={asset} alt="Design Group" />);

    expect(screen.getByAltText('Design Group').getAttribute('src')).toContain(
      'group-display.webp',
    );
  });

  it('renders shared link cards with deterministic fallback imagery', () => {
    const { container } = renderWithTheme(
      <LinkPreviewCard
        preview={{
          url: 'https://example.com/post',
          title: 'Example post',
        }}
      />,
    );

    expect(screen.getByText('Example post')).toBeTruthy();
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      'data:image/svg+xml',
    );
  });

  it('classifies portrait, square, landscape, panorama, and unknown assets', () => {
    expect(classifyInlineMediaShape({ width: 900, height: 1600 })).toBe(
      'portrait',
    );
    expect(classifyInlineMediaShape({ width: 1080, height: 1080 })).toBe(
      'square',
    );
    expect(classifyInlineMediaShape({ width: 1600, height: 900 })).toBe(
      'landscape',
    );
    expect(classifyInlineMediaShape({ width: 2400, height: 900 })).toBe(
      'panorama',
    );
    expect(classifyInlineMediaShape({ width: null, height: null })).toBe(
      'unknown',
    );
  });

  it('uses chat surface rules to keep portrait media readable', () => {
    const layout = getInlineMediaPresentation({
      asset: { mediaType: 'image', width: 900, height: 1600 },
      surface: 'chat',
    });
    const mediaSx = layout.mediaSx as { width?: unknown; maxHeight?: unknown };

    expect(layout.shape).toBe('portrait');
    expect(getInlineMediaSurfaceMaxHeight('chat')).toEqual({
      xs: 280,
      sm: 360,
      md: 440,
    });
    expect(mediaSx.width).toBe('auto');
    expect(mediaSx.maxHeight).toEqual({ xs: 280, sm: 360, md: 440 });
  });

  it('uses feed surface rules without forcing landscape media into square boxes', () => {
    const layout = getInlineMediaPresentation({
      asset: { mediaType: 'image', width: 1920, height: 1080 },
      surface: 'feed',
    });
    const mediaSx = layout.mediaSx as { width?: unknown; maxHeight?: unknown };

    expect(layout.shape).toBe('landscape');
    expect(getInlineMediaSurfaceMaxHeight('feed')).toEqual({
      xs: 240,
      sm: 320,
      md: 360,
    });
    expect(mediaSx.width).toBe('100%');
    expect(mediaSx.maxHeight).toEqual({ xs: 240, sm: 320, md: 360 });
  });

  it('reports render failures through the shared media telemetry path', () => {
    const asset = createNormalizedAsset({
      assetId: 'asset-render-failure',
      sourceType: 'upload',
      mediaType: 'image',
      displayUrl: 'https://example.com/display.webp',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      width: 1600,
      height: 900,
    });

    renderWithTheme(
      <AssetInlinePreview asset={asset} alt="Broken preview" surface="feed" />,
    );

    fireEvent.error(screen.getByAltText('Broken preview'));

    expect(telemetryMocks.reportMediaTelemetryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'media_render_failed',
        assetId: 'asset-render-failure',
        pipeline: 'asset_renderer',
        stage: 'render',
        surface: 'feed',
      }),
    );
  });
});
