/**
 * Best-effort PDF re-save before upload (object streams). May reduce size for
 * some PDFs; never throws — returns the original file on failure or if larger.
 */
const PDF_OPTIMIZE_MIN_BYTES = 48 * 1024;

export async function tryOptimizePdfForUpload(file: File): Promise<File> {
  const lower = file.name.toLowerCase();
  if (file.type !== 'application/pdf' && !lower.endsWith('.pdf')) {
    return file;
  }
  if (file.size < PDF_OPTIMIZE_MIN_BYTES) return file;

  try {
    const { PDFDocument } = await import('pdf-lib');
    const raw = new Uint8Array(await file.arrayBuffer());
    const doc = await PDFDocument.load(raw, { ignoreEncryption: true });
    const saved = await doc.save({ useObjectStreams: true });
    if (saved.byteLength === 0 || saved.byteLength >= raw.byteLength) {
      return file;
    }
    const asBlobPart = saved as unknown as BlobPart;
    return new File([asBlobPart], file.name, {
      type: 'application/pdf',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
