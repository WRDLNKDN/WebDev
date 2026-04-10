/**
 * @vitest-environment jsdom
 */
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GifPickerDialog } from '../../components/chat/dialogs/GifPickerDialog';

function setInputValue(input: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  );
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const gifApiMocks = vi.hoisted(() => ({
  searchChatGifs: vi.fn(),
  getTrendingChatGifs: vi.fn(),
  normalizeGifErrorMessage: vi.fn((message: string) => message),
  reportMediaTelemetryAsync: vi.fn(),
}));

vi.mock('../../lib/chat/gifApi', () => ({
  searchChatGifs: gifApiMocks.searchChatGifs,
  getTrendingChatGifs: gifApiMocks.getTrendingChatGifs,
  normalizeGifErrorMessage: gifApiMocks.normalizeGifErrorMessage,
  PLATFORM_GIPHY_GIF_CONTENT_FILTER: 'medium',
}));

vi.mock('../../lib/media/telemetry', () => ({
  reportMediaTelemetryAsync: gifApiMocks.reportMediaTelemetryAsync,
}));

describe('GifPickerDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    gifApiMocks.searchChatGifs.mockReset();
    gifApiMocks.getTrendingChatGifs.mockReset();
    gifApiMocks.normalizeGifErrorMessage.mockClear();
    gifApiMocks.reportMediaTelemetryAsync.mockReset();

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('keeps the initial trending failure in a neutral state and hides rating controls by default', async () => {
    gifApiMocks.getTrendingChatGifs.mockRejectedValueOnce(
      new Error('GIF search failed. Check your connection or try again.'),
    );

    await act(async () => {
      root.render(
        <GifPickerDialog open onClose={() => {}} onPick={() => {}} />,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain(
      'Trending GIFs are unavailable right now. Try searching above.',
    );
    expect(document.body.textContent).not.toContain(
      'GIF search failed. Check your connection or try again.',
    );
    expect(document.body.textContent).not.toContain('PG-13');
    expect(document.body.textContent).not.toContain('Strict');
    expect(document.body.textContent).not.toContain('Content:');
    expect(gifApiMocks.reportMediaTelemetryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'gif_picker_trending_failed',
        failureCode: 'gif_trending_failed',
        pipeline: 'gif_picker',
        stage: 'preview',
      }),
    );
  });

  it('does not re-fetch trending when a search fails after trending loaded; Try again can recover', async () => {
    gifApiMocks.getTrendingChatGifs.mockResolvedValueOnce([
      {
        id: 'trend-1',
        title: 'Trending One',
        previewUrl: 'https://example.com/t1p.gif',
        gifUrl: 'https://example.com/t1.gif',
      },
    ]);
    gifApiMocks.searchChatGifs
      .mockRejectedValueOnce(new Error('GIF search failed (500).'))
      .mockResolvedValueOnce([
        {
          id: 'retry-ok',
          title: 'After Retry',
          previewUrl: 'https://example.com/rp.gif',
          gifUrl: 'https://example.com/r.gif',
        },
      ]);

    await act(async () => {
      root.render(
        <GifPickerDialog open onClose={() => {}} onPick={() => {}} />,
      );
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(gifApiMocks.getTrendingChatGifs).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('img[alt="Trending One"]')).toBeTruthy();

    const input = document.body.querySelector(
      'input[placeholder="Search GIFs"]',
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();

    await act(async () => {
      if (input) setInputValue(input, 'cats');
    });

    const searchButton = Array.from(
      document.body.querySelectorAll('button'),
    ).find((button) => button.textContent?.trim() === 'Search');
    expect(searchButton).toBeTruthy();

    await act(async () => {
      searchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(gifApiMocks.getTrendingChatGifs).toHaveBeenCalledTimes(1);
    expect(gifApiMocks.searchChatGifs).toHaveBeenCalledWith(
      'cats',
      24,
      'medium',
    );

    const tryAgain = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Try again',
    );
    expect(tryAgain).toBeTruthy();

    await act(async () => {
      tryAgain?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.body.querySelector('img[alt="After Retry"]')).toBeTruthy();
    expect(gifApiMocks.searchChatGifs).toHaveBeenCalledTimes(2);
    expect(gifApiMocks.getTrendingChatGifs).toHaveBeenCalledTimes(1);
  });

  it('runs a fresh search after a failure and shows recovered results', async () => {
    gifApiMocks.getTrendingChatGifs.mockRejectedValueOnce(
      new Error('GIF search failed. Check your connection or try again.'),
    );
    gifApiMocks.searchChatGifs.mockResolvedValueOnce([
      {
        id: 'gif-2',
        title: 'Cats Result',
        previewUrl: 'https://example.com/cats-preview.gif',
        gifUrl: 'https://example.com/cats-original.gif',
      },
    ]);

    await act(async () => {
      root.render(
        <GifPickerDialog open onClose={() => {}} onPick={() => {}} />,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const input = document.body.querySelector(
      'input[placeholder="Search GIFs"]',
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();

    await act(async () => {
      if (input) {
        setInputValue(input, 'cats');
      }
    });

    const searchButton = Array.from(
      document.body.querySelectorAll('button'),
    ).find((button) => button.textContent?.trim() === 'Search');
    expect(searchButton).toBeTruthy();

    await act(async () => {
      searchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.body.querySelector('img[alt="Cats Result"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain(
      'GIF search failed. Check your connection or try again.',
    );
    expect(gifApiMocks.searchChatGifs).toHaveBeenCalledWith(
      'cats',
      24,
      'medium',
    );
    expect(gifApiMocks.reportMediaTelemetryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'gif_picker_search_loaded',
        pipeline: 'gif_picker',
        stage: 'preview',
        status: 'ready',
      }),
    );
  });
});
