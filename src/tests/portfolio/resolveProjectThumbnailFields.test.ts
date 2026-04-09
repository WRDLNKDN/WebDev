import { describe, expect, it } from 'vitest';
import {
  linkTypeRequiresServerThumbnail,
  resolveProjectThumbnailFields,
} from '../../lib/portfolio/resolveProjectThumbnailFields';

describe('resolveProjectThumbnailFields', () => {
  it('does not queue server thumbnail for direct image links', () => {
    const r = resolveProjectThumbnailFields({
      finalImageUrl: null,
      linkType: 'image',
      projectSourceUrl: 'https://cdn.example.com/hero.png',
      sourceFile: undefined,
    });
    expect(r.thumbnailStatus).toBeNull();
    expect(r.thumbnailUrl).toBeNull();
  });

  it('queues server thumbnail for PDF links without custom cover', () => {
    const r = resolveProjectThumbnailFields({
      finalImageUrl: null,
      linkType: 'pdf',
      projectSourceUrl: 'https://example.com/slides.pdf',
      sourceFile: undefined,
    });
    expect(r.thumbnailStatus).toBe('pending');
    expect(r.thumbnailUrl).toBeNull();
  });

  it('derives sibling thumbnail for uploaded images with structured original path', () => {
    const base =
      'https://cdn.test/storage/v1/object/public/project-sources/u/p/asset/original.png';
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const r = resolveProjectThumbnailFields({
      finalImageUrl: null,
      linkType: 'image',
      projectSourceUrl: base,
      sourceFile: file,
    });
    expect(r.thumbnailStatus).toBeNull();
    expect(r.thumbnailUrl).toContain('/thumbnail.jpg');
  });

  it('treats uploaded PNG as image even if linkType parsing were wrong', () => {
    const base =
      'https://cdn.test/storage/v1/object/public/project-sources/u/p/asset/original.png';
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const r = resolveProjectThumbnailFields({
      finalImageUrl: null,
      linkType: 'unsupported',
      projectSourceUrl: base,
      sourceFile: file,
    });
    expect(r.thumbnailStatus).toBeNull();
  });

  it('clears derived thumbnail when custom cover image is present', () => {
    const r = resolveProjectThumbnailFields({
      finalImageUrl: 'https://cdn.test/project-images/u/thumb/display.webp',
      linkType: 'pdf',
      projectSourceUrl: 'https://example.com/x.pdf',
      sourceFile: undefined,
    });
    expect(r.thumbnailUrl).toBeNull();
    expect(r.thumbnailStatus).toBeNull();
  });

  it('does not derive thumbnail when uploaded image source is not structured original path', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const r = resolveProjectThumbnailFields({
      finalImageUrl: null,
      linkType: 'image',
      projectSourceUrl:
        'https://cdn.test/storage/v1/object/public/project-sources/u/p/asset/display.webp',
      sourceFile: file,
    });
    expect(r.thumbnailStatus).toBeNull();
    expect(r.thumbnailUrl).toBeNull();
  });

  it('keeps custom thumbnail for direct image links without pending generation', () => {
    const r = resolveProjectThumbnailFields({
      finalImageUrl: 'https://cdn.test/project-images/u/thumb/display.webp',
      linkType: 'image',
      projectSourceUrl: 'https://example.com/banner.png',
      sourceFile: undefined,
    });
    expect(r.thumbnailStatus).toBeNull();
    expect(r.thumbnailUrl).toBeNull();
  });
});

describe('linkTypeRequiresServerThumbnail', () => {
  it('returns false for image and unsupported', () => {
    expect(linkTypeRequiresServerThumbnail('image')).toBe(false);
    expect(linkTypeRequiresServerThumbnail('unsupported')).toBe(false);
  });

  it('returns true for pdf and video', () => {
    expect(linkTypeRequiresServerThumbnail('pdf')).toBe(true);
    expect(linkTypeRequiresServerThumbnail('video')).toBe(true);
  });
});
