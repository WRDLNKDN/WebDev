/**
 * Avatar image processing: resize to max 512×512, compress to ≤1MB.
 * Used before upload to Supabase avatars bucket.
 */

const MAX_SIZE = 512;
const MAX_BYTES = 1_048_576; // 1MB
const JPEG_QUALITY_START = 0.9;
const JPEG_QUALITY_MIN = 0.5;

type ProcessedAvatar = { blob: Blob; isProcessed: boolean };

export async function processAvatarForUpload(
  file: File,
): Promise<ProcessedAvatar> {
  const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!supported.includes(file.type)) {
    throw new Error('Avatar must be JPEG, PNG, GIF, or WebP');
  }

  const needsResize =
    file.size > MAX_BYTES ||
    (await imageDimensions(file)).some((d) => d > MAX_SIZE);

  if (!needsResize) {
    return { blob: file, isProcessed: false };
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const img = await loadImage(file);
  const { width, height } = img;

  const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height, 1);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const usePng = outputMime === 'image/png';

  let quality = JPEG_QUALITY_START;
  let blob: Blob;

  while (true) {
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        usePng ? 'image/png' : 'image/jpeg',
        usePng ? undefined : quality,
      );
    });

    if (blob.size <= MAX_BYTES) break;
    if (usePng) {
      quality = JPEG_QUALITY_START;
      break;
    }
    quality -= 0.1;
    if (quality < JPEG_QUALITY_MIN) break;
  }

  const finalBlob =
    blob.size > MAX_BYTES ? await compressMore(canvas, blob) : blob;
  if (finalBlob.size > MAX_BYTES) {
    throw new Error('Image is too large. Try a smaller or simpler image.');
  }

  return {
    blob: finalBlob,
    isProcessed: true,
  };
}

async function imageDimensions(file: File): Promise<[number, number]> {
  const img = await loadImage(file);
  return [img.width, img.height];
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}

async function compressMore(
  sourceCanvas: HTMLCanvasElement,
  _lastBlob: Blob,
): Promise<Blob> {
  const scale = 0.8;
  const w = Math.max(64, Math.round(sourceCanvas.width * scale));
  const h = Math.max(64, Math.round(sourceCanvas.height * scale));
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return _lastBlob;
  ctx.drawImage(
    sourceCanvas,
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
    0,
    0,
    w,
    h,
  );

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.5,
    );
  });
}
