import { describe, expect, it } from 'vitest';
import { toMessage } from '../src/lib/errors';

describe('toMessage', () => {
  it('handles Error', () => {
    expect(toMessage(new Error('boom'))).toBe('boom');
  });

  it('handles string', () => {
    expect(toMessage('nope')).toBe('nope');
  });

  it('handles unknown', () => {
    expect(toMessage({})).toBe('Request failed');
  });
});
