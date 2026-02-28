# generate-portfolio-thumbnail

Edge Function that processes `portfolio_items` with
`thumbnail_status = 'pending'` and no manual `image_url`: fetches image (or
calls optional thumbnail service for PDF/Office/Google), uploads to
`portfolio-thumbnails` bucket, and updates the row.

- **Image links:** Fetched and uploaded as-is (cached in our storage).
- **Other types:** Require `THUMBNAIL_SERVICE_URL` (POST `{ "url" }` → binary
  image); otherwise marked `failed`.

Invoke via cron (every 1–2 min) or Database Webhook. See
[docs/architecture/portfolio-thumbnail-generation.md](../../../docs/architecture/portfolio-thumbnail-generation.md).
