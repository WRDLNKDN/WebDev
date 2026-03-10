import { getPortfolioPreviewModel } from '../../lib/portfolio/previewUtils';
import type { PortfolioItem } from '../../types/portfolio';

function makeProject(overrides: Partial<PortfolioItem> = {}): PortfolioItem {
  return {
    id: 'project-1',
    owner_id: 'user-1',
    title: 'Artifact',
    description: null,
    image_url: null,
    project_url: 'https://example.com/case-study.pdf',
    tech_stack: [],
    created_at: '2026-03-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('getPortfolioPreviewModel', () => {
  it('builds a PDF iframe preview', () => {
    const model = getPortfolioPreviewModel(
      makeProject({ project_url: 'https://example.com/case-study.pdf' }),
    );

    expect(model.kind).toBe('iframe');
    expect(model.previewable).toBe(true);
    expect(model.previewUrl).toBe(
      'https://example.com/case-study.pdf#toolbar=0&navpanes=0',
    );
  });

  it('builds an Office embed preview for docx files', () => {
    const url =
      'https://example.supabase.co/storage/v1/object/public/resumes/user-1/resume.docx';
    const model = getPortfolioPreviewModel(
      makeProject({ project_url: url, title: 'Resume.docx' }),
    );

    expect(model.kind).toBe('iframe');
    expect(model.previewable).toBe(true);
    expect(model.typeLabel).toBe('Document');
    expect(model.previewUrl).toBe(
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`,
    );
  });

  it('normalizes Google Docs links to preview URLs', () => {
    const model = getPortfolioPreviewModel(
      makeProject({
        project_url:
          'https://docs.google.com/document/d/abc123/edit?usp=sharing',
      }),
    );

    expect(model.kind).toBe('iframe');
    expect(model.previewable).toBe(true);
    expect(model.previewUrl).toBe(
      'https://docs.google.com/document/d/abc123/preview',
    );
  });

  it('falls back to download-only for unsupported files', () => {
    const model = getPortfolioPreviewModel(
      makeProject({ project_url: 'https://example.com/archive.zip' }),
    );

    expect(model.kind).toBe('none');
    expect(model.previewable).toBe(false);
    expect(model.openUrl).toBe('https://example.com/archive.zip');
    expect(model.downloadUrl).toBe('https://example.com/archive.zip');
  });
});
