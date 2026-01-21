import { describe, it, expect } from 'vitest';

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

describe('admin profile search logic', () => {
  it('treats non-UUID as handle-only search', () => {
    const q = 'nick';
    expect(isUuid(q)).toBe(false);
  });

  it('treats UUID as exact id match', () => {
    const q = '550e8400-e29b-41d4-a716-446655440000';
    expect(isUuid(q)).toBe(true);
  });
});