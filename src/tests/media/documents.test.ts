import { describe, expect, it } from 'vitest';
import {
  buildDocumentPreviewDataUrl,
  detectDocumentKind,
  extractDocumentPreviewTextFromFile,
  getDocumentInteractionPolicy,
} from '../../lib/media/documents';

describe('media documents', () => {
  it('detects supported document kinds from file metadata', () => {
    expect(
      detectDocumentKind({
        fileName: 'deck.pptx',
      }),
    ).toBe('presentation');
    expect(
      detectDocumentKind({
        fileName: 'budget.xlsx',
      }),
    ).toBe('spreadsheet');
    expect(
      detectDocumentKind({
        fileName: 'notes.md',
      }),
    ).toBe('markdown');
  });

  it('builds a deterministic preview card for documents', () => {
    const dataUrl = buildDocumentPreviewDataUrl({
      fileName: 'roadmap.pdf',
      mimeType: 'application/pdf',
      excerpt: 'Preview excerpt',
    });

    expect(dataUrl).toContain('data:image/svg+xml');
    expect(decodeURIComponent(dataUrl)).toContain('roadmap.pdf');
  });

  it('extracts text excerpts from text uploads', async () => {
    const file = new File(['# hello\nThis is a preview body.'], 'notes.md', {
      type: 'text/markdown',
    });

    await expect(extractDocumentPreviewTextFromFile(file)).resolves.toContain(
      'hello',
    );
  });

  it('uses Office embed for public Word docs but download for signed docs', () => {
    const publicPolicy = getDocumentInteractionPolicy({
      url: 'https://example.com/files/spec.docx',
      resolvedType: 'document',
    });
    const signedPolicy = getDocumentInteractionPolicy({
      url: 'https://example.supabase.co/storage/v1/object/sign/chat-attachments/u1/file.docx?token=abc',
      resolvedType: 'document',
    });

    expect(publicPolicy.previewable).toBe(true);
    expect(publicPolicy.previewUrl).toContain(
      'https://view.officeapps.live.com/op/embed.aspx',
    );
    expect(signedPolicy.previewable).toBe(false);
    expect(signedPolicy.preferDownload).toBe(true);
  });
});
