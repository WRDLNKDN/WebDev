import { describe, expect, it } from 'vitest';
import {
  getPortfolioThumbnailStoragePathFromPublicUrl,
  getProjectImageStoragePathFromPublicUrl,
} from '../../lib/portfolio/projectStorage';

describe('project storage URL helpers', () => {
  it('extracts project-images path from Supabase public URL', () => {
    const url =
      'https://xyz.supabase.co/storage/v1/object/public/project-images/user-1/project-123.png';
    expect(getProjectImageStoragePathFromPublicUrl(url)).toBe(
      'user-1/project-123.png',
    );
  });

  it('extracts portfolio-thumbnails path from public URL', () => {
    const url =
      'https://xyz.supabase.co/storage/v1/object/public/portfolio-thumbnails/user-2/thumb-777.png';
    expect(getPortfolioThumbnailStoragePathFromPublicUrl(url)).toBe(
      'user-2/thumb-777.png',
    );
  });

  it('handles encoded paths and query strings', () => {
    const url =
      'https://xyz.supabase.co/storage/v1/object/public/project-images/user-1/my%20image.png?download=1';
    expect(getProjectImageStoragePathFromPublicUrl(url)).toBe(
      'user-1/my image.png',
    );
  });

  it('returns null for non-matching bucket or empty URL', () => {
    expect(
      getProjectImageStoragePathFromPublicUrl(
        'https://xyz.supabase.co/storage/v1/object/public/avatars/user-1/a.png',
      ),
    ).toBe(null);
    expect(getProjectImageStoragePathFromPublicUrl('')).toBe(null);
    expect(getPortfolioThumbnailStoragePathFromPublicUrl('')).toBe(null);
  });
});
