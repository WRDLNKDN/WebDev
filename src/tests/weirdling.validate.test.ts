import { describe, expect, it } from 'vitest';
import { validateWeirdlingResponse } from '../../backend/weirdling/validate';

describe('validateWeirdlingResponse', () => {
  const valid = {
    displayName: 'Test Weirdling',
    handle: 'testweird',
    roleVibe: 'Builder',
    industryTags: ['infra', 'frontend'],
    tone: 0.5,
    tagline: 'A short tagline.',
    boundaries: 'No politics.',
    promptVersion: 'v1',
    modelVersion: 'mock',
  };

  it('accepts valid response', () => {
    const result = validateWeirdlingResponse(valid);
    expect(result.displayName).toBe('Test Weirdling');
    expect(result.handle).toBe('testweird');
    expect(result.tagline).toBe('A short tagline.');
  });

  it('rejects missing displayName', () => {
    expect(() =>
      validateWeirdlingResponse({ ...valid, displayName: '' }),
    ).toThrow(/displayName/);
  });

  it('rejects invalid tone', () => {
    expect(() => validateWeirdlingResponse({ ...valid, tone: 2 })).toThrow(
      /tone/,
    );
  });

  it('rejects missing tagline', () => {
    expect(() => validateWeirdlingResponse({ ...valid, tagline: '' })).toThrow(
      /tagline/,
    );
  });
});
