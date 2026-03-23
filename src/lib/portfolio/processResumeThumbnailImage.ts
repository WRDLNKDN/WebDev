/**
 * Client-side resize/compress for user-uploaded resume preview images.
 */

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_LONG_EDGE_START = 1280;

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Returns a JPEG suitable for upload as a custom resume preview (bucket: resumes).
 */
export async function processResumeThumbnailImageForUpload(
  file: File,
): Promise<Blob> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    throw new Error('Preview image must be JPEG, PNG, WebP, or GIF.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image is too large (maximum 15 MB).');
  }

  const img = await loadImageElement(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error('Invalid image dimensions.');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image in this browser.');

  for (let maxEdge = MAX_LONG_EDGE_START; maxEdge >= 480; maxEdge -= 160) {
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    canvas.width = tw;
    canvas.height = th;
    ctx.drawImage(img, 0, 0, tw, th);

    let quality = 0.9;
    while (quality >= 0.45) {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error('Could not encode image.')),
          'image/jpeg',
          quality,
        );
      });
      if (blob.size <= MAX_OUTPUT_BYTES) return blob;
      quality -= 0.07;
    }
  }

  throw new Error(
    'Could not compress the image enough. Try a smaller or simpler image.',
  );
}
