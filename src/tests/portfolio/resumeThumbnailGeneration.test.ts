import { describe, expect, it } from 'vitest';
import { generateResumeThumbnailJpeg } from '../../../backend/resumeThumbnail.ts';

/** JPEG SOI + APP0 marker start */
const JPEG_HEADER_HEX_PREFIX = 'ffd8ff';
const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5mHq8AAAAASUVORK5CYII=';

describe('generateResumeThumbnailJpeg', () => {
  it('falls back to a generic thumbnail when .docx parsing fails', async () => {
    const renamedPngBuffer = Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64');

    const output = await generateResumeThumbnailJpeg(
      renamedPngBuffer,
      'user-123/resume.docx',
    );

    expect(output.byteLength).toBeGreaterThan(0);
    expect(output.subarray(0, 3).toString('hex')).toBe(JPEG_HEADER_HEX_PREFIX);
  });

  it('falls back to a generic thumbnail when .doc parsing fails', async () => {
    const invalidDocBuffer = Buffer.from('not-a-real-doc-file', 'utf8');

    const output = await generateResumeThumbnailJpeg(
      invalidDocBuffer,
      'user-123/resume.doc',
    );

    expect(output.byteLength).toBeGreaterThan(0);
    expect(output.subarray(0, 3).toString('hex')).toBe(JPEG_HEADER_HEX_PREFIX);
  });

  it('generates a placeholder thumbnail for .pdf', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 dummy content', 'utf8');

    const output = await generateResumeThumbnailJpeg(
      pdfBuffer,
      'user-123/resume.pdf',
    );

    expect(output.byteLength).toBeGreaterThan(0);
    expect(output.subarray(0, 3).toString('hex')).toBe(JPEG_HEADER_HEX_PREFIX);
  });
});
