/**
 * @vitest-environment jsdom
 */
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WhyWrdlnkdnVideo } from '../../components/home/WhyWrdlnkdnVideo';

const MANUAL_PLAY_SRC =
  'https://www.youtube.com/embed/Qc4D5W2kuBI?playsinline=1&rel=0&autoplay=1';
const AUTOPLAY_SRC =
  'https://www.youtube.com/embed/Qc4D5W2kuBI?playsinline=1&rel=0&autoplay=1&mute=1';

describe('WhyWrdlnkdnVideo', () => {
  let container: HTMLDivElement;
  let root: Root;
  let intersectionCallback: IntersectionObserverCallback | null = null;
  let disconnectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    disconnectSpy = vi.fn();
    intersectionCallback = null;

    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnectSpy;
      takeRecords = vi.fn();
      root = null;
      rootMargin = '0px 0px -10% 0px';
      thresholds = [0.6, 0.8];

      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
      }
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  const renderVideo = async () => {
    await act(async () => {
      root.render(<WhyWrdlnkdnVideo />);
    });
  };

  const getPreviewButton = () =>
    container.querySelector('button') as HTMLButtonElement | null;

  const expectNoIframe = () => {
    expect(container.querySelector('iframe')).toBeNull();
  };

  const expectIframeSrc = (expectedSrc: string) => {
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe(
      expectedSrc,
    );
  };

  const clickPreviewButton = async () => {
    const preview = getPreviewButton();
    expect(preview).toBeTruthy();

    await act(async () => {
      preview?.click();
    });
  };

  const triggerIntersection = async () => {
    const section = container.querySelector('section') as Element;

    await act(async () => {
      intersectionCallback?.(
        [
          {
            isIntersecting: true,
            intersectionRatio: 0.72,
            target: section,
            time: 0,
            boundingClientRect: section.getBoundingClientRect(),
            intersectionRect: section.getBoundingClientRect(),
            rootBounds: null,
          },
        ] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      );
    });
  };

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('renders the iframe without autoplay before the section is in view', async () => {
    await renderVideo();

    const preview = getPreviewButton();
    expect(preview?.getAttribute('aria-label')).toBe('Play Why WRDLNKDN video');
    expectNoIframe();
  });

  it('enables one-time autoplay after the section is materially visible', async () => {
    await renderVideo();

    expect(intersectionCallback).toBeTypeOf('function');
    expectNoIframe();

    await triggerIntersection();

    expectIframeSrc(AUTOPLAY_SRC);
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('lets keyboard and pointer users start playback manually before auto-start', async () => {
    await renderVideo();
    await clickPreviewButton();

    expectIframeSrc(MANUAL_PLAY_SRC);
  });

  it('keeps the preview in place on mobile until the user taps play', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        media: '(pointer: coarse)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    await renderVideo();

    expect(intersectionCallback).toBeNull();
    expectNoIframe();
    await clickPreviewButton();

    expectIframeSrc(MANUAL_PLAY_SRC);
  });
});
