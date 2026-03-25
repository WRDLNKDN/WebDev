import PDFDocument from 'pdfkit';

import { extractResumePlainText } from './resumeThumbnail.ts';

/** Avoid multi-minute pdfkit runs / huge PDFs when mammoth returns very large extracts. */
export const RESUME_PDF_BODY_MAX_CHARS = 200_000;

const DEFAULT_RESUME_PDF_BODY =
  'No extractable text was found in this Word file. The original upload is still stored.';

/**
 * Normalizes extracted plain text and caps length before pdfkit (preview PDF only).
 * Exported for unit tests.
 */
export const buildResumePdfBodyFromPlain = (plain: string): string => {
  let body = plain.trim() || DEFAULT_RESUME_PDF_BODY;
  if (body.length > RESUME_PDF_BODY_MAX_CHARS) {
    body =
      body.slice(0, RESUME_PDF_BODY_MAX_CHARS) +
      '\n\n[Content truncated for preview. The original upload is unchanged.]';
  }
  return body;
};

/**
 * Builds a simple text PDF from Word content (same extraction as thumbnails).
 * Used so `resume_url` and embeds can always point at a PDF.
 */
export const wordBufferToPdf = async (
  fileBuffer: Buffer,
  extension: string,
): Promise<Buffer> => {
  const plain = await extractResumePlainText(fileBuffer, extension);
  const body = buildResumePdfBodyFromPlain(plain);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 54, size: 'LETTER' });
    doc.on('data', (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);
    doc.fontSize(11);
    doc.text(body, { align: 'left' });
    doc.end();
  });
};
