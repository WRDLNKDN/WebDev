import { describe, expect, it } from 'vitest';
import { toMessage } from '../lib/errors';

describe('toMessage', () => {
  it('handles Error', () => {
    expect(toMessage(new Error('boom'))).toBe('boom');
  });

  it('handles string', () => {
    expect(toMessage('nope')).toBe('nope');
  });

  it('handles unknown', () => {
    expect(toMessage({})).toBe('Something went wrong. Please try again.');
  });
});
