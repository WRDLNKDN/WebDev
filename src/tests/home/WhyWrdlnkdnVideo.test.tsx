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

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('renders the iframe without autoplay before the section is in view', async () => {
    await act(async () => {
      root.render(<WhyWrdlnkdnVideo />);
    });

    const preview = container.querySelector('button');
    expect(preview?.getAttribute('aria-label')).toBe('Play Why WRDLNKDN video');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('enables one-time autoplay after the section is materially visible', async () => {
    await act(async () => {
      root.render(<WhyWrdlnkdnVideo />);
    });

    expect(intersectionCallback).toBeTypeOf('function');
    expect(container.querySelector('iframe')).toBeNull();

    await act(async () => {
      intersectionCallback?.(
        [
          {
            isIntersecting: true,
            intersectionRatio: 0.72,
            target: container.querySelector('section') as Element,
            time: 0,
            boundingClientRect: (
              container.querySelector('section') as Element
            ).getBoundingClientRect(),
            intersectionRect: (
              container.querySelector('section') as Element
            ).getBoundingClientRect(),
            rootBounds: null,
          },
        ] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      );
    });

    expect(container.querySelector('iframe')?.getAttribute('src')).toBe(
      'https://www.youtube.com/embed/Qc4D5W2kuBI?playsinline=1&rel=0&autoplay=1&mute=1',
    );
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('lets keyboard and pointer users start playback manually before auto-start', async () => {
    await act(async () => {
      root.render(<WhyWrdlnkdnVideo />);
    });

    const preview = container.querySelector(
      'button',
    ) as HTMLButtonElement | null;
    expect(preview).toBeTruthy();

    await act(async () => {
      preview?.click();
    });

    expect(container.querySelector('iframe')?.getAttribute('src')).toBe(
      'https://www.youtube.com/embed/Qc4D5W2kuBI?playsinline=1&rel=0&autoplay=1',
    );
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

    await act(async () => {
      root.render(<WhyWrdlnkdnVideo />);
    });

    expect(intersectionCallback).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();

    const preview = container.querySelector(
      'button',
    ) as HTMLButtonElement | null;
    expect(preview).toBeTruthy();

    await act(async () => {
      preview?.click();
    });

    expect(container.querySelector('iframe')?.getAttribute('src')).toBe(
      'https://www.youtube.com/embed/Qc4D5W2kuBI?playsinline=1&rel=0&autoplay=1',
    );
  });
});
