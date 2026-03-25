/**
 * Large-body truncation is covered by `buildResumePdfBodyFromPlain` (fast).
 * Optional pdfkit-at-cap integration (slow): `RUN_SLOW_PDF_TEST=1 npx vitest run … -t "pdfkit at cap"`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { extractMock } = vi.hoisted(() => ({
  extractMock: vi.fn(),
}));

vi.mock('../../../backend/resumeThumbnail.ts', () => ({
  extractResumePlainText: extractMock,
}));

import {
  buildResumePdfBodyFromPlain,
  RESUME_PDF_BODY_MAX_CHARS,
  wordBufferToPdf,
} from '../../../backend/resumeWordToPdf.ts';

describe('buildResumePdfBodyFromPlain', () => {
  it('uses default copy when extract is empty or whitespace', () => {
    expect(buildResumePdfBodyFromPlain('')).toContain(
      'No extractable text was found',
    );
    expect(buildResumePdfBodyFromPlain('   \n\t')).toContain(
      'No extractable text was found',
    );
  });

  it('appends truncation notice when plain exceeds cap', () => {
    const plain = 'q'.repeat(RESUME_PDF_BODY_MAX_CHARS + 1);
    const body = buildResumePdfBodyFromPlain(plain);

    expect(body).toContain('[Content truncated for preview.');
    expect(body.startsWith('q'.repeat(RESUME_PDF_BODY_MAX_CHARS))).toBe(true);
    expect(body.length).toBe(
      RESUME_PDF_BODY_MAX_CHARS +
        '\n\n[Content truncated for preview. The original upload is unchanged.]'
          .length,
    );
  });
});

describe('wordBufferToPdf', () => {
  beforeEach(() => {
    extractMock.mockReset();
  });

  it('returns a PDF buffer for normal extracted text', async () => {
    extractMock.mockResolvedValue('Hello resume');

    const pdf = await wordBufferToPdf(Buffer.from('x'), '.docx');

    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(pdf.byteLength).toBeGreaterThan(100);
  });

  it.skipIf(process.env.RUN_SLOW_PDF_TEST !== '1')(
    'pdfkit at cap: completes for body at RESUME_PDF_BODY_MAX_CHARS',
    async () => {
      extractMock.mockResolvedValue('p'.repeat(RESUME_PDF_BODY_MAX_CHARS));

      const pdf = await wordBufferToPdf(Buffer.from('x'), '.docx');

      expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF');
      expect(pdf.byteLength).toBeGreaterThan(5_000);
    },
    90_000,
  );
});
