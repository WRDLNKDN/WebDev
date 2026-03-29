# Portfolio Thumbnail Generation (Server-Side)

**Status:** Implemented. Edge Function `generate-portfolio-thumbnail` + optional
cron/webhook.  
**Applies to:** Portfolio items backed by a public URL or uploaded project file.
Resume upload flow is separate and unchanged.

## Overview

Portfolio items use exactly one project source. When a member adds a public URL
or uploads a project file **without** uploading a custom image:

1. The app stores `project_url`, `normalized_url`, `embed_url`, `resolved_type`,
   and sets `thumbnail_status = 'pending'`.
2. The Edge Function **generate-portfolio-thumbnail** (or a cron that invokes
   it) picks up rows with `thumbnail_status = 'pending'` and no `image_url`
   (manual override).
3. The worker generates a thumbnail, uploads it to the `portfolio-thumbnails`
   bucket, then updates `thumbnail_url` and `thumbnail_status = 'generated'` (or
   `'failed'`).
4. **Thumbnail failure must not block saving the portfolio item**; the UI shows
   a deterministic fallback (icon + "Preview unavailable").

## Database Fields (portfolio_items)

| Column             | Purpose                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `project_url`      | Public source URL for the project (external link or uploaded file URL).                                                                      |
| `image_url`        | Manual image override; when set, skip auto thumbnail.                                                                                        |
| `normalized_url`   | Canonical URL (e.g. Google /preview). Set by app on insert/update.                                                                           |
| `embed_url`        | URL used for iframe embed when different from project_url. Set by app.                                                                       |
| `resolved_type`    | Detected type: `image`, `pdf`, `document`, `presentation`, `spreadsheet`, `text`, `google_doc`, `google_sheet`, `google_slides`. Set by app. |
| `thumbnail_url`    | Server-generated thumbnail URL in platform storage. Set by worker.                                                                           |
| `thumbnail_status` | `pending` \| `generated` \| `failed`. App sets `pending` when no manual image; worker sets `generated` or `failed`.                          |

## Worker Contract

1. **Select work:** Rows where `thumbnail_status = 'pending'` and `image_url` is
   null.
2. **Per type:**
   - **Images:** Fetch image, resize/crop to card dimensions, upload to storage
     (e.g. `portfolio-thumbnails/{owner_id}/{item_id}.webp`). Avoid hotlinking;
     cache in storage.
   - **PDF:** Fetch server-side, render page 1 to PNG, upload, set
     `thumbnail_url` and `thumbnail_status = 'generated'`.
   - **DOCX/PPTX:** Convert to PDF or first page/slide image server-side; upload
     thumbnail; update row.
   - **XLSX:** Optional first-sheet image; else leave
     `thumbnail_status = 'failed'` and use fallback icon.
   - **Google Docs/Sheets/Slides:** Use `embed_url` or provider export/preview
     image; if not publicly accessible, set `thumbnail_status = 'failed'`.
3. **On success:**
   `UPDATE portfolio_items SET thumbnail_url = <public URL>, thumbnail_status = 'generated' WHERE id = ?`.
4. **On failure:** `UPDATE portfolio_items SET thumbnail_status = 'failed'` (do
   not clear `thumbnail_url` if a previous run had set it; or set to null for
   deterministic fallback).
5. **No infinite retry;** use a bounded retry or dead-letter. Log failures for
   debugging.

## Caching and Storage

- Generated thumbnails live in platform storage (e.g. Supabase
  `portfolio-thumbnails` bucket).
- Associate with portfolio item via path or metadata.
- Do not regenerate on every page load; only when `thumbnail_status = 'pending'`
  or on explicit “Regenerate” if we add that later.

## UI Behavior (Already Implemented)

- **Manual image:** Always used as card thumbnail; no auto generation.
- **Server thumbnail:** If `thumbnail_url` and `thumbnail_status = 'generated'`,
  show it.
- **Pending:** Show loading skeleton + “Thumbnail generating…”.
- **Failed / no thumbnail:** Show fallback icon + “Preview unavailable”.
- **Image-backed sources:** If no manual image and no server thumbnail yet, the
  app may use `project_url` as thumbnail when `resolved_type === 'image'`
  (client-side); worker can later replace with cached version.

## Error Handling (Deterministic Messages)

The app and worker must not show generic errors. Use:

- Unsupported type: _"This file type is not supported for preview."_
- Not publicly accessible: _"This link is not publicly accessible."_
- Embedding blocked: _"This content cannot be embedded. Open in new tab to
  view."_
- Temporary failure: _"Preview temporarily unavailable. Try again later."_

Thumbnail failure is reflected only by `thumbnail_status = 'failed'` and the
fallback icon; it does not block saving the portfolio item.

---

## Implementation

### Edge Function: `generate-portfolio-thumbnail`

- **Location:** `supabase/functions/generate-portfolio-thumbnail/index.ts`
- **Behavior:** Selects up to 5 rows with `thumbnail_status = 'pending'` and
  `image_url` null. For each:
  - **Image type:** Fetches the URL, uploads the image to
    `portfolio-thumbnails/{owner_id}/{id}.{ext}`, sets `thumbnail_url` and
    `thumbnail_status = 'generated'`.
  - **Other types (PDF, Office, Google):** If env `THUMBNAIL_SERVICE_URL` is
    set, POSTs `{ "url": project_url }` to that endpoint and expects a binary
    image response; uploads it and marks generated. If not set or the service
    fails, sets `thumbnail_status = 'failed'`.
- **Env:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto). Optional:
  `THUMBNAIL_SERVICE_URL` for PDF/Office/Google conversion.

### Invoking the worker

**Option A – Cron (recommended)**  
Schedule an HTTP request every 1–2 minutes to the function URL with the service
role key:

- **URL:**
  `https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-portfolio-thumbnail`
- **Method:** POST
- **Header:** `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

Use Supabase Dashboard → Integrations → Cron (or pg_cron + pg_net), or your own
scheduler (e.g. GitHub Actions, Vercel Cron).

**Option B – Database webhook**  
In Supabase Dashboard → Database → Webhooks, create a webhook on
`portfolio_items` for INSERT and UPDATE, and point it at the function URL above
with the same Authorization header.

### Optional: PDF/Office/Google thumbnails

Set `THUMBNAIL_SERVICE_URL` to an endpoint that accepts
`POST { "url": "<project_url>" }` and returns a binary image (e.g. PNG). The
worker will call it for non-image types and use the response as the thumbnail.
You can implement this with a separate service (e.g. Node + Puppeteer, or a
conversion API).
