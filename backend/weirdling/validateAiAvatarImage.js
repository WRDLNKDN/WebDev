/**
 * Validates AI Weirdling avatar URLs: ≤1MB and max 512×512 (sharp metadata).
 */
import sharp from 'sharp';

const MAX_BYTES = 1024 * 1024;
const MAX_DIM = 512;

/**
 * @param {string | null | undefined} url
 * @returns {Promise<{ ok: true } | { ok: false; error: string }>}
 */
export async function validateAiAvatarImageUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { ok: true };
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { ok: true };
  }
  try {
    const res = await fetch(trimmed, { redirect: 'follow' });
    if (!res.ok || !res.body) {
      return {
        ok: false,
        error: 'Image could not be loaded for verification.',
      };
    }
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        return {
          ok: false,
          error: 'Image must be 1MB or smaller.',
        };
      }
      chunks.push(Buffer.from(value));
    }
    const buf = Buffer.concat(chunks);
    if (buf.length === 0) {
      return { ok: false, error: 'Empty image response.' };
    }
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w > MAX_DIM || h > MAX_DIM) {
      return {
        ok: false,
        error: `Image must be at most ${MAX_DIM}×${MAX_DIM} pixels (got ${w}×${h}).`,
      };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Input buffer') || msg.includes('unsupported')) {
      return { ok: false, error: 'Image format could not be read.' };
    }
    return { ok: false, error: 'Image could not be verified.' };
  }
}
