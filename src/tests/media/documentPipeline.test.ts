import { describe, expect, it } from 'vitest';
import { generateDocumentPreviewImages } from '../../../backend/documentPipeline.ts';

const JPEG_HEADER_HEX_PREFIX = 'ffd8ff';

describe('documentPipeline', () => {
  it('builds jpeg previews and metadata for text files', async () => {
    const result = await generateDocumentPreviewImages({
      fileBuffer: Buffer.from('Quarterly notes\nThis document should preview.'),
      fileName: 'notes.txt',
      mimeType: 'text/plain',
    });

    expect(result.metadata.kind).toBe('text');
    expect(result.metadata.previewStrategy).toBe('generated_card');
    expect(result.metadata.wordCount).toBeGreaterThan(0);
    expect(result.display.subarray(0, 3).toString('hex')).toBe(
      JPEG_HEADER_HEX_PREFIX,
    );
    expect(result.thumbnail.subarray(0, 3).toString('hex')).toBe(
      JPEG_HEADER_HEX_PREFIX,
    );
  });

  it('falls back to a shared icon card for unsupported preview extraction', async () => {
    const result = await generateDocumentPreviewImages({
      fileBuffer: Buffer.from('not-a-real-presentation'),
      fileName: 'deck.pptx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    expect(result.metadata.kind).toBe('presentation');
    expect(result.metadata.previewStrategy).toBe('fallback_icon');
    expect(result.thumbnail.subarray(0, 3).toString('hex')).toBe(
      JPEG_HEADER_HEX_PREFIX,
    );
  });
});
