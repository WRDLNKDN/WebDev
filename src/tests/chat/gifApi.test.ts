import { describe, expect, it } from 'vitest';
import {
  GIPHY_RATING_MAP,
  normalizeGifErrorMessage,
} from '../../lib/chat/gifApi';
import type { GifContentFilter } from '../../lib/chat/gifApi';

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

  it('maps rate limit / 429 to user-friendly message', () => {
    expect(
      normalizeGifErrorMessage(
        'GIF search rate limit exceeded. Free tier allows 100 calls per hour—try again later.',
      ),
    ).toBe(
      'GIF search is temporarily unavailable. You’ve hit the hourly limit—try again later.',
    );
    expect(
      normalizeGifErrorMessage('GIF search failed: 429 Too Many Requests'),
    ).toBe(
      'GIF search is temporarily unavailable. You’ve hit the hourly limit—try again later.',
    );
  });
});

describe('GIPHY rating mapping (GIPHY API fix)', () => {
  it('maps content filter to GIPHY rating string', () => {
    expect(GIPHY_RATING_MAP.off).toBe('r');
    expect(GIPHY_RATING_MAP.low).toBe('pg-13');
    expect(GIPHY_RATING_MAP.medium).toBe('pg');
    expect(GIPHY_RATING_MAP.high).toBe('g');
  });

  it('covers all GifContentFilter values', () => {
    const filters: GifContentFilter[] = ['off', 'low', 'medium', 'high'];
    for (const f of filters) {
      expect(GIPHY_RATING_MAP[f]).toBeDefined();
      expect(typeof GIPHY_RATING_MAP[f]).toBe('string');
    }
  });
});
