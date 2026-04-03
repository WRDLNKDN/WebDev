import {
  extractDocumentPlainText,
  generateDocumentPreviewJpeg,
  getDocumentStorageExtension,
} from './documentPipeline.js';

const SUPPORTED_RESUME_THUMBNAIL_EXTENSIONS = new Set([
  '.doc',
  '.docx',
  '.pdf',
]);

/** Plain text from Word buffers for thumbnails and PDF generation. */
export const extractResumePlainText = async (
  fileBuffer: Buffer,
  extension: string,
): Promise<string> => extractDocumentPlainText(fileBuffer, extension);

export const getResumeExtension = (storagePath: string): string =>
  getDocumentStorageExtension(storagePath);

export const isSupportedResumeThumbnailExtension = (
  extension: string,
): boolean =>
  SUPPORTED_RESUME_THUMBNAIL_EXTENSIONS.has(extension.toLowerCase());

/** JPEG keeps previews compatible with stricter `resumes` bucket MIME allowlists. */
export const generateResumeThumbnailJpeg = async (
  fileBuffer: Buffer,
  storagePath: string,
): Promise<Buffer> => generateDocumentPreviewJpeg(fileBuffer, storagePath);
