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
}));

vi.mock('../../lib/chat/gifApi', () => ({
  searchChatGifs: gifApiMocks.searchChatGifs,
  getTrendingChatGifs: gifApiMocks.getTrendingChatGifs,
  normalizeGifErrorMessage: gifApiMocks.normalizeGifErrorMessage,
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

  it('retries the failed request and recovers results', async () => {
    gifApiMocks.getTrendingChatGifs
      .mockRejectedValueOnce(
        new Error('GIF search failed. Check your connection or try again.'),
      )
      .mockResolvedValueOnce([
        {
          id: 'gif-1',
          title: 'Recovered GIF',
          previewUrl: 'https://example.com/preview.gif',
          gifUrl: 'https://example.com/original.gif',
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

    expect(document.body.textContent).toContain(
      'GIF search failed. Check your connection or try again.',
    );

    const retryButton = Array.from(
      document.body.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Try again'));
    expect(retryButton).toBeTruthy();

    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(
      document.body.querySelector('img[alt="Recovered GIF"]'),
    ).toBeTruthy();
    expect(gifApiMocks.getTrendingChatGifs).toHaveBeenCalledTimes(2);
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
  });
});
