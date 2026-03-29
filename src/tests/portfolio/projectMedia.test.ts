import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getProjectSourceFileError,
  getProjectThumbnailFileError,
  isProjectSourceStorageUrl,
  PROJECT_SOURCE_MAX_BYTES,
  PROJECT_THUMBNAIL_MAX_BYTES,
} from '../../lib/portfolio/projectMedia';

vi.mock('../../lib/auth/supabaseClient', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
    functions: {
      invoke: vi.fn(async () => ({ data: null, error: null })),
    },
  },
}));

describe('project media validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts supported project source files', () => {
    const file = new File(['pdf'], 'artifact.pdf', {
      type: 'application/pdf',
    });

    expect(getProjectSourceFileError(file)).toBeNull();
  });

  it('rejects unsupported project source file types', () => {
    const file = new File(['zip'], 'artifact.zip', {
      type: 'application/zip',
    });

    expect(getProjectSourceFileError(file)).toBe(
      'Project files must be JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MP4, WEBM, or MOV.',
    );
  });

  it('shows size guidance for oversized project source files', () => {
    const file = new File(
      [new Uint8Array(PROJECT_SOURCE_MAX_BYTES + 1)],
      'artifact.pdf',
      { type: 'application/pdf' },
    );

    expect(getProjectSourceFileError(file)).toContain(
      'Project files can be optimized automatically up to about 6 MB.',
    );
  });

  it('rejects unsupported thumbnail file types', () => {
    const file = new File(['pdf'], 'thumbnail.pdf', {
      type: 'application/pdf',
    });

    expect(getProjectThumbnailFileError(file)).toBe(
      'Optional thumbnails must be PNG, JPG, GIF, or WEBP images.',
    );
  });

  it('shows size guidance for oversized thumbnail files', () => {
    const file = new File(
      [new Uint8Array(PROJECT_THUMBNAIL_MAX_BYTES + 1)],
      'thumbnail.png',
      { type: 'image/png' },
    );

    expect(getProjectThumbnailFileError(file)).toContain(
      'Optional thumbnails can be optimized automatically up to about 6 MB.',
    );
  });

  it('detects public project source storage URLs', () => {
    expect(
      isProjectSourceStorageUrl(
        'https://example.supabase.co/storage/v1/object/public/project-sources/user-1/project-source-123.pdf',
      ),
    ).toBe(true);
    expect(isProjectSourceStorageUrl('https://example.com/project.pdf')).toBe(
      false,
    );
  });
});
