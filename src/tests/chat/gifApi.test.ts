import { describe, expect, it } from 'vitest';
import { normalizeGifErrorMessage } from '../../lib/chat/gifApi';

describe('normalizeGifErrorMessage', () => {
  it('maps API key errors to user-friendly message', () => {
    expect(
      normalizeGifErrorMessage(
        'GIF search failed: API key not valid. Please pass a valid API key.',
      ),
    ).toBe('GIF search is unavailable right now.');
    expect(normalizeGifErrorMessage('Invalid API key or apikey missing')).toBe(
      'GIF search is unavailable right now.',
    );
    expect(normalizeGifErrorMessage('error: not valid key')).toBe(
      'GIF search is unavailable right now.',
    );
  });

  it('returns original message when not API-key related', () => {
    const msg = 'GIF search failed. Check your connection or try again.';
    expect(normalizeGifErrorMessage(msg)).toBe(msg);
    expect(normalizeGifErrorMessage('Network error')).toBe('Network error');
  });
});
