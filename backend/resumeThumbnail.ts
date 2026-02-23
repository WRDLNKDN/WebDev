import mammoth from 'mammoth';
import sharp from 'sharp';

const SUPPORTED_THUMBNAIL_EXTENSIONS = new Set(['.doc', '.docx']);

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
        `<text x="48" y="${145 + index * 31}" font-size="23" fill="#1f2937" font-family="Inter, Arial, sans-serif">${escapeXml(line)}</text>`,
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
    <text x="48" y="84" font-size="32" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-weight="700">Resume Preview</text>
    <text x="48" y="117" font-size="20" fill="#334155" font-family="Inter, Arial, sans-serif">${safeTitle}</text>
    <line x1="48" y1="133" x2="852" y2="133" stroke="#e2e8f0" stroke-width="2"/>
    ${lineBlocks}
  </svg>`;
};

const extractDocxText = async (buffer: Buffer): Promise<string> => {
  const result = await mammoth.extractRawText({ buffer });
  return normalizePreviewText(result.value ?? '');
};

const extractDocText = async (buffer: Buffer): Promise<string> => {
  const mod = await import('word-extractor');
  const WordExtractor = mod.default as new () => {
    extract: (input: Buffer) => Promise<{ getBody: () => string }>;
  };
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  return normalizePreviewText(doc.getBody() ?? '');
};

export const getResumeExtension = (storagePath: string): string =>
  storagePath.slice(storagePath.lastIndexOf('.')).toLowerCase();

export const isSupportedResumeThumbnailExtension = (
  extension: string,
): boolean => SUPPORTED_THUMBNAIL_EXTENSIONS.has(extension.toLowerCase());

export const generateResumeThumbnailPng = async (
  fileBuffer: Buffer,
  storagePath: string,
): Promise<Buffer> => {
  const extension = getResumeExtension(storagePath);
  const extracted =
    extension === '.doc'
      ? await extractDocText(fileBuffer)
      : await extractDocxText(fileBuffer);
  const lines = toPreviewLines(extracted);
  const svg = buildSvg(storagePath.split('/').pop() ?? 'resume', lines);
  return sharp(Buffer.from(svg, 'utf8')).png({ quality: 90 }).toBuffer();
};
