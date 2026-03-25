import mammoth from 'mammoth';
import sharp from 'sharp';

const SUPPORTED_THUMBNAIL_EXTENSIONS = new Set(['.doc', '.docx', '.pdf']);

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const normalizePreviewText = (value: string): string =>
  value
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const toPreviewLines = (text: string): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return ['No readable text found in this document.'];
  }

  const maxCharsPerLine = 62;
  const maxLines = 24;
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (words.length > 0 && lines.length >= maxLines) {
    lines[maxLines - 1] =
      `${lines[maxLines - 1].slice(0, maxCharsPerLine - 1)}…`;
  }
  return lines;
};

const buildSvg = (name: string, lines: string[]): string => {
  const safeTitle = escapeXml(name);
  const lineBlocks = lines
    .map(
      (line, index) =>
        `<text x="48" y="${145 + index * 31}" font-size="23" fill="#1f2937" font-family="Poppins, sans-serif">${escapeXml(line)}</text>`,
    )
    .join('');

  return `<svg width="900" height="1200" viewBox="0 0 900 1200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f8fafc" />
      </linearGradient>
    </defs>
    <rect width="900" height="1200" fill="url(#bg)"/>
    <rect x="24" y="24" width="852" height="1152" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="48" y="84" font-size="32" fill="#0f172a" font-family="Poppins, sans-serif" font-weight="700">Resume Preview</text>
    <text x="48" y="117" font-size="20" fill="#334155" font-family="Poppins, sans-serif">${safeTitle}</text>
    <line x1="48" y1="133" x2="852" y2="133" stroke="#e2e8f0" stroke-width="2"/>
    ${lineBlocks}
  </svg>`;
};

const extractDocxText = async (buffer: Buffer): Promise<string> => {
  const result = await mammoth.extractRawText({ buffer });
  return normalizePreviewText(result.value ?? '');
};

/** Plain text from Word buffers for thumbnails and PDF generation. */
export const extractResumePlainText = async (
  fileBuffer: Buffer,
  extension: string,
): Promise<string> => {
  const ext = extension.toLowerCase();
  if (ext === '.pdf') return '';
  try {
    if (ext === '.doc') return await extractDocText(fileBuffer);
    if (ext === '.docx') return await extractDocxText(fileBuffer);
    return '';
  } catch {
    return 'Preview text is unavailable for this document. Open the file directly.';
  }
};

/**
 * Legacy `.doc` (OLE) via word-extractor; fallback to mammoth when the file is
 * OOXML (.docx content) saved with a `.doc` extension, or when OLE parse fails.
 */
const extractDocText = async (buffer: Buffer): Promise<string> => {
  try {
    const mod = await import('word-extractor');
    const WordExtractor = mod.default as new () => {
      extract: (input: Buffer) => Promise<{ getBody: () => string }>;
    };
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    return normalizePreviewText(doc.getBody() ?? '');
  } catch {
    const ooxml = await mammoth.extractRawText({ buffer });
    return normalizePreviewText(ooxml.value ?? '');
  }
};

export const getResumeExtension = (storagePath: string): string =>
  storagePath.slice(storagePath.lastIndexOf('.')).toLowerCase();

export const isSupportedResumeThumbnailExtension = (
  extension: string,
): boolean => SUPPORTED_THUMBNAIL_EXTENSIONS.has(extension.toLowerCase());

/** Placeholder SVG for PDF (no first-page render in this stack); produces a consistent thumbnail. */
const buildPdfPlaceholderSvg = (fileName: string): string => {
  const safeTitle = escapeXml(fileName);
  return `<svg width="900" height="1200" viewBox="0 0 900 1200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#e2e8f0" />
      </linearGradient>
    </defs>
    <rect width="900" height="1200" fill="url(#bg)"/>
    <rect x="24" y="24" width="852" height="1152" rx="18" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
    <text x="48" y="84" font-size="32" fill="#0f172a" font-family="Poppins, sans-serif" font-weight="700">PDF Document</text>
    <text x="48" y="130" font-size="20" fill="#334155" font-family="Poppins, sans-serif">${safeTitle}</text>
    <line x1="48" y1="146" x2="852" y2="146" stroke="#e2e8f0" stroke-width="2"/>
    <text x="48" y="200" font-size="18" fill="#64748b" font-family="Poppins, sans-serif">Open the file to view the full document.</text>
  </svg>`;
};

/** JPEG keeps previews compatible with stricter `resumes` bucket MIME allowlists (some envs omit `image/png`). */
export const generateResumeThumbnailJpeg = async (
  fileBuffer: Buffer,
  storagePath: string,
): Promise<Buffer> => {
  const extension = getResumeExtension(storagePath);
  const fileName = storagePath.split('/').pop() ?? 'resume';

  if (extension === '.pdf') {
    const svg = buildPdfPlaceholderSvg(fileName);
    return sharp(Buffer.from(svg, 'utf8'))
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  }

  const extracted = await extractResumePlainText(fileBuffer, extension);
  const lines = toPreviewLines(extracted);
  const svg = buildSvg(fileName, lines);
  return sharp(Buffer.from(svg, 'utf8'))
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
};
