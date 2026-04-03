import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

import {
  buildDocumentPreviewSvg,
  detectDocumentKind,
  getDocumentDefaultActionMode,
  getDocumentTypeLabel,
  type DocumentActionMode,
  type DocumentKind,
  type DocumentPreviewStrategy,
} from '../src/lib/media/documents.ts';

const execFile = promisify(execFileCallback);
const PDF_RENDER_WIDTH = 1200;
const PDF_RENDER_HEIGHT = 675;
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = 270;

export type SharedDocumentPreviewMetadata = {
  kind: DocumentKind;
  label: string;
  originalFilename: string;
  mimeType: string | null;
  extension: string;
  excerpt: string | null;
  pageCount: number | null;
  wordCount: number | null;
  previewStrategy: DocumentPreviewStrategy;
  actionMode: DocumentActionMode;
};

export type GeneratedDocumentPreview = {
  display: Buffer;
  thumbnail: Buffer;
  metadata: SharedDocumentPreviewMetadata;
};

const escapePreviewText = (value: string): string =>
  value
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const getFileNameFromPath = (storagePath: string): string =>
  storagePath.split('/').filter(Boolean).pop() ?? 'document';

const getExtensionFromName = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : '';
};

const countWords = (text: string | null): number | null => {
  if (!text) return null;
  const count = text.split(/\s+/).filter(Boolean).length;
  return count > 0 ? count : null;
};

async function extractLegacyDocText(buffer: Buffer): Promise<string> {
  try {
    const mod = await import('word-extractor');
    const WordExtractor = mod.default as new () => {
      extract: (input: Buffer) => Promise<{ getBody: () => string }>;
    };
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    return escapePreviewText(doc.getBody() ?? '');
  } catch {
    const ooxml = await mammoth.extractRawText({ buffer });
    return escapePreviewText(ooxml.value ?? '');
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return escapePreviewText(result.value ?? '');
}

async function withTempDocumentFile<T>(
  extension: string,
  fileBuffer: Buffer,
  run: (filePath: string, tempDir: string) => Promise<T>,
): Promise<T> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'wrdlnkdn-doc-'));
  const filePath = path.join(tempDir, `source${extension || '.bin'}`);

  try {
    await writeFile(filePath, fileBuffer);
    return await run(filePath, tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function tryExtractPdfText(
  fileBuffer: Buffer,
  extension: string,
): Promise<string> {
  if (extension !== '.pdf') return '';

  try {
    return await withTempDocumentFile(
      extension,
      fileBuffer,
      async (filePath) => {
        const { stdout } = await execFile('pdftotext', [
          '-f',
          '1',
          '-l',
          '1',
          '-nopgbrk',
          filePath,
          '-',
        ]);
        return escapePreviewText(stdout ?? '');
      },
    );
  } catch {
    return '';
  }
}

async function tryGetPdfPageCount(fileBuffer: Buffer): Promise<number | null> {
  try {
    const pdf = await PDFDocument.load(fileBuffer);
    const pageCount = pdf.getPageCount();
    return pageCount > 0 ? pageCount : null;
  } catch {
    return null;
  }
}

async function tryRenderPdfFirstPage(
  fileBuffer: Buffer,
): Promise<Buffer | null> {
  try {
    return await withTempDocumentFile(
      '.pdf',
      fileBuffer,
      async (filePath, tempDir) => {
        const outputBase = path.join(tempDir, 'preview');
        await execFile('pdftoppm', [
          '-f',
          '1',
          '-l',
          '1',
          '-singlefile',
          '-jpeg',
          '-scale-to-x',
          String(PDF_RENDER_WIDTH),
          '-scale-to-y',
          String(PDF_RENDER_HEIGHT),
          filePath,
          outputBase,
        ]);
        const imagePath = `${outputBase}.jpg`;
        return await readFile(imagePath);
      },
    );
  } catch {
    return null;
  }
}

export async function extractDocumentPlainText(
  fileBuffer: Buffer,
  extension: string,
): Promise<string> {
  const normalizedExtension = extension.toLowerCase();

  try {
    if (normalizedExtension === '.doc') {
      return await extractLegacyDocText(fileBuffer);
    }
    if (normalizedExtension === '.docx') {
      return await extractDocxText(fileBuffer);
    }
    if (normalizedExtension === '.txt' || normalizedExtension === '.md') {
      return escapePreviewText(fileBuffer.toString('utf8'));
    }
    if (normalizedExtension === '.pdf') {
      return await tryExtractPdfText(fileBuffer, normalizedExtension);
    }
    return '';
  } catch {
    return '';
  }
}

function buildFallbackPreviewSvg(params: {
  fileName: string;
  mimeType: string | null;
  excerpt: string | null;
  actionMode: DocumentActionMode;
}): Buffer {
  return Buffer.from(
    buildDocumentPreviewSvg({
      fileName: params.fileName,
      mimeType: params.mimeType,
      excerpt: params.excerpt,
      actionMode: params.actionMode,
    }),
    'utf8',
  );
}

async function rasterizeSvgToJpeg(svg: Buffer): Promise<Buffer> {
  return sharp(svg).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

async function createThumbnail(display: Buffer): Promise<Buffer> {
  return sharp(display)
    .resize({
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

export async function generateDocumentPreviewImages(params: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType?: string | null;
}): Promise<GeneratedDocumentPreview> {
  const extension = getExtensionFromName(params.fileName);
  const kind =
    detectDocumentKind({
      fileName: params.fileName,
      mimeType: params.mimeType,
    }) ?? 'document';
  const actionMode = getDocumentDefaultActionMode(kind);
  const extractedText = await extractDocumentPlainText(
    params.fileBuffer,
    extension,
  );
  const pageCount =
    kind === 'pdf' ? await tryGetPdfPageCount(params.fileBuffer) : null;
  let previewStrategy: DocumentPreviewStrategy = extractedText
    ? 'generated_card'
    : 'fallback_icon';

  let display =
    kind === 'pdf' ? await tryRenderPdfFirstPage(params.fileBuffer) : null;
  if (display) {
    previewStrategy = 'rendered_first_page';
  } else {
    const svg = buildFallbackPreviewSvg({
      fileName: params.fileName,
      mimeType: params.mimeType ?? null,
      excerpt: extractedText,
      actionMode,
    });
    display = await rasterizeSvgToJpeg(svg);
  }

  const thumbnail = await createThumbnail(display);

  return {
    display,
    thumbnail,
    metadata: {
      kind,
      label: getDocumentTypeLabel(kind),
      originalFilename: params.fileName,
      mimeType: params.mimeType?.trim() || null,
      extension,
      excerpt: extractedText || null,
      pageCount,
      wordCount: countWords(extractedText),
      previewStrategy,
      actionMode,
    },
  };
}

export const getDocumentStorageExtension = (storagePath: string): string =>
  getExtensionFromName(getFileNameFromPath(storagePath));

export async function generateDocumentPreviewJpeg(
  fileBuffer: Buffer,
  storagePath: string,
): Promise<Buffer> {
  const fileName = getFileNameFromPath(storagePath);
  const preview = await generateDocumentPreviewImages({
    fileBuffer,
    fileName,
  });
  return preview.thumbnail;
}
