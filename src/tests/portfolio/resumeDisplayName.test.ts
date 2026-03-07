import { describe, expect, it } from 'vitest';
import { getResumeDisplayName } from '../../lib/portfolio/resumeDisplayName';

describe('getResumeDisplayName', () => {
  it('prefers the stored original filename', () => {
    expect(
      getResumeDisplayName({
        fileName: 'Nick_Clark_Resume_v7.docx',
        url: 'https://example.supabase.co/storage/v1/object/public/resumes/user/resume.docx',
      }),
    ).toBe('Nick_Clark_Resume_v7.docx');
  });

  it('uses non-generic file names from the URL when available', () => {
    expect(
      getResumeDisplayName({
        url: 'https://example.com/files/Nick%20Clark%20Resume.pdf?download=1',
      }),
    ).toBe('Nick Clark Resume.pdf');
  });

  it('falls back to Resume with extension for generic stored paths', () => {
    expect(
      getResumeDisplayName({
        url: 'https://example.supabase.co/storage/v1/object/public/resumes/user-id/resume.pdf',
      }),
    ).toBe('Resume.pdf');

    expect(
      getResumeDisplayName({
        url: 'https://example.supabase.co/storage/v1/object/public/resumes/user-id/resume.docx',
      }),
    ).toBe('Resume.docx');
  });

  it('falls back to Resume when filename is unavailable', () => {
    expect(getResumeDisplayName({})).toBe('Resume');
    expect(getResumeDisplayName({ fileName: '   ', url: '' })).toBe('Resume');
  });
});
