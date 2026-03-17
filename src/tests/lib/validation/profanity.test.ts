import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/auth/supabaseClient', () => ({
  supabase: {
    from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
  },
}));

import {
  clearProfanityOverridesCache,
  PROFANITY_ERROR_MESSAGE,
  validateProfanity,
} from '../../../lib/validation/profanity';

describe('validateProfanity', () => {
  it('allows empty or whitespace-only text', () => {
    expect(() => validateProfanity('', [])).not.toThrow();
    expect(() => validateProfanity('   ', [])).not.toThrow();
    expect(() => validateProfanity('', ['bad'])).not.toThrow();
  });

  it('allows clean text when overrides are empty', () => {
    expect(() => validateProfanity('Community Tooling', [])).not.toThrow();
    expect(() => validateProfanity('Coffee', [])).not.toThrow();
  });

  it('throws with standard message when override word appears in text', () => {
    expect(() => validateProfanity('hello badword here', ['badword'])).toThrow(
      PROFANITY_ERROR_MESSAGE,
    );
    expect(() => validateProfanity('BadWord', ['badword'])).toThrow(
      PROFANITY_ERROR_MESSAGE,
    );
    expect(() => validateProfanity('something blocked', ['blocked'])).toThrow(
      PROFANITY_ERROR_MESSAGE,
    );
  });

  it('does not throw when override word is not in text', () => {
    expect(() =>
      validateProfanity('hello world', ['badword', 'other']),
    ).not.toThrow();
  });

  it('throws when leo-profanity dictionary detects profanity', () => {
    expect(() => validateProfanity('boob', [])).toThrow(
      PROFANITY_ERROR_MESSAGE,
    );
  });

  it('does not throw when OSS-matched word is in allowlist', () => {
    expect(() => validateProfanity('boob', [], ['boob'])).not.toThrow();
  });
});

describe('clearProfanityOverridesCache', () => {
  it('exists and can be called without error', () => {
    expect(() => clearProfanityOverridesCache()).not.toThrow();
  });
});
