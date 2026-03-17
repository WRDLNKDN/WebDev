import { describe, expect, it } from 'vitest';
import { generateResumeThumbnailPng } from '../../../backend/resumeThumbnail.ts';

const PNG_HEADER_HEX = '89504e470d0a1a0a';
const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5mHq8AAAAASUVORK5CYII=';

describe('generateResumeThumbnailPng', () => {
  it('falls back to a generic thumbnail when .docx parsing fails', async () => {
    const renamedPngBuffer = Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64');

    const output = await generateResumeThumbnailPng(
      renamedPngBuffer,
      'user-123/resume.docx',
    );

    expect(output.byteLength).toBeGreaterThan(0);
    expect(output.subarray(0, 8).toString('hex')).toBe(PNG_HEADER_HEX);
  });

  it('falls back to a generic thumbnail when .doc parsing fails', async () => {
    const invalidDocBuffer = Buffer.from('not-a-real-doc-file', 'utf8');

    const output = await generateResumeThumbnailPng(
      invalidDocBuffer,
      'user-123/resume.doc',
    );

    expect(output.byteLength).toBeGreaterThan(0);
    expect(output.subarray(0, 8).toString('hex')).toBe(PNG_HEADER_HEX);
  });

  it('generates a placeholder thumbnail for .pdf', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 dummy content', 'utf8');

    const output = await generateResumeThumbnailPng(
      pdfBuffer,
      'user-123/resume.pdf',
    );

    expect(output.byteLength).toBeGreaterThan(0);
    expect(output.subarray(0, 8).toString('hex')).toBe(PNG_HEADER_HEX);
  });
});
