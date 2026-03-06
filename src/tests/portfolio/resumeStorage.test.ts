import { describe, expect, it } from 'vitest';
import { getResumeStoragePathFromPublicUrl } from '../../lib/portfolio/resumeStorage';

describe('getResumeStoragePathFromPublicUrl', () => {
  it('extracts path after /resumes/', () => {
    const url =
      'https://xxx.supabase.co/storage/v1/object/public/resumes/abc-123-uuid/resume.pdf';
    expect(getResumeStoragePathFromPublicUrl(url)).toBe(
      'abc-123-uuid/resume.pdf',
    );
  });

  it('handles .doc and .docx', () => {
    const url =
      'https://bucket.supabase.co/storage/v1/object/public/resumes/user-id/resume.docx';
    expect(getResumeStoragePathFromPublicUrl(url)).toBe('user-id/resume.docx');
  });

  it('returns null when URL has no /resumes/ segment', () => {
    expect(
      getResumeStoragePathFromPublicUrl('https://example.com/file.pdf'),
    ).toBe(null);
    expect(getResumeStoragePathFromPublicUrl('')).toBe(null);
  });
});
