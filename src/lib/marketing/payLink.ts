/**
 * GoDaddy Pay Link target. **Keep in sync** with `vercel.json` → `redirects` for `/pay`.
 * User-facing links should use {@link PAY_PATH} (`/pay`), not this URL.
 */
export const GODADDY_PAY_LINK =
  'https://0ce9348c-39fb-4c78-88f3-cde23f784fad.paylinks.godaddy.com/d43df879-0ba0-4c34-9de0-878';

/** In-app and comms-friendly payment entry (production: Vercel 302 → {@link GODADDY_PAY_LINK}). */
export const PAY_PATH = '/pay';

/** QR image URL (external API) encoding an absolute `/pay` URL for the current site. */
export function buildPayQrCodeImageUrl(absolutePayUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(absolutePayUrl)}`;
}
