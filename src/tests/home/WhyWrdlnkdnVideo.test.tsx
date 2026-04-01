/**
 * @vitest-environment jsdom
 */
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WhyWrdlnkdnVideo } from '../../components/home/WhyWrdlnkdnVideo';

describe('WhyWrdlnkdnVideo', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the preview button instead of the iframe on initial load', async () => {
    await act(async () => {
      root.render(<WhyWrdlnkdnVideo />);
    });

    const preview = container.querySelector('button');
    expect(preview?.getAttribute('aria-label')).toBe('Play Why WRDLNKDN video');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('starts playback with autoplay after the user clicks the preview', async () => {
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
});
