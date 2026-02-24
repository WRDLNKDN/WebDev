import { describe, expect, it } from 'vitest';
import {
  createOpeningImagePreviewState,
  getWrappedPreviewIndex,
  reduceImagePreviewErrored,
  reduceImagePreviewLoaded,
} from '../../lib/feed/imagePreviewState';

describe('image preview state transitions', () => {
  it('transitions from loading to loaded', () => {
    const opening = createOpeningImagePreviewState(
      'https://media.example.com/photo.png',
    );

    expect(opening.loading).toBe(true);
    expect(opening.error).toBeNull();

    const loaded = reduceImagePreviewLoaded(opening);
    expect(loaded.loading).toBe(false);
    expect(loaded.error).toBeNull();
    expect(loaded.url).toBe('https://media.example.com/photo.png');
  });

  it('transitions from loading to error', () => {
    const opening = createOpeningImagePreviewState(
      'https://media.example.com/photo.png',
    );

    const errored = reduceImagePreviewErrored(opening);
    expect(errored.loading).toBe(false);
    expect(errored.error).toBe('load_failed');
    expect(errored.url).toBe('https://media.example.com/photo.png');
  });

  it('wraps preview index in both directions', () => {
    expect(getWrappedPreviewIndex(2, 'next', 3)).toBe(0);
    expect(getWrappedPreviewIndex(0, 'previous', 3)).toBe(2);
    expect(getWrappedPreviewIndex(1, 'next', 3)).toBe(2);
    expect(getWrappedPreviewIndex(1, 'previous', 3)).toBe(0);
  });
});
