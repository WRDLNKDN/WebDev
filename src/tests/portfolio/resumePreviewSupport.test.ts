import { describe, expect, it } from 'vitest';
import { getProjectPreviewFallbackLabel } from '../../lib/portfolio/projectPreview';
import { resumePublicUrlLooksWord } from '../../lib/portfolio/resumePreviewSupport';
import { RESUME_ITEM_ID, type PortfolioItem } from '../../types/portfolio';

describe('resumePublicUrlLooksWord', () => {
  it('returns false when the public URL is a PDF even if the filename is .docx', () => {
    expect(
      resumePublicUrlLooksWord(
        'Resume.docx',
        'https://x.supabase.co/storage/v1/object/public/resumes/u/resume.pdf',
      ),
    ).toBe(false);
  });

  it('returns true when the URL points at Word on storage', () => {
    expect(
      resumePublicUrlLooksWord(
        'Resume.docx',
        'https://x.supabase.co/storage/v1/object/public/resumes/u/resume.docx',
      ),
    ).toBe(true);
  });
});

describe('getProjectPreviewFallbackLabel (resume slot)', () => {
  const baseResumeProject = {
    id: RESUME_ITEM_ID,
    owner_id: '',
    title: 'Resume.pdf',
    description: null,
    image_url: null,
    project_url:
      'https://x.supabase.co/storage/v1/object/public/resumes/u/resume.pdf',
    tech_stack: [],
    created_at: '',
  } satisfies PortfolioItem;

  it('uses resume-specific copy for PDF', () => {
    expect(getProjectPreviewFallbackLabel(baseResumeProject)).toBe(
      'PDF resume',
    );
  });
});
