# Feeds API

MVP activity stream for WRDLNKDN: a user-curated, link-aware feed from people
you're connected to (and yourself). **Not** a LinkedIn mirror—external URLs are
metadata only; no scraping or third-party data ingestion.

## Endpoint

### GET /api/feeds

- **Auth:** Required. `Authorization: Bearer <access_token>` (Supabase JWT).
- **Method:** GET.

### Query parameters

| Param    | Type   | Default | Description                |
| -------- | ------ | ------- | -------------------------- |
| `limit`  | number | 20      | Page size (1–50).          |
| `cursor` | string | —       | Next-page cursor (base64). |

### Response

### 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "kind": "post | profile_update | external_link | repost | reaction",
      "payload": { ... },
      "parent_id": "uuid | null",
      "created_at": "ISO8601",
      "actor": {
        "handle": "string | null",
        "display_name": "string | null"
      }
    }
  ],
  "nextCursor": "base64-string | undefined"
}
```

- **data:** Feed items for the authenticated viewer (self + connected users),
  ordered by `created_at` descending.
- **nextCursor:** Present when more results exist; send as `cursor` on the next
  request for stable pagination.

**4xx/5xx:** JSON `{ "error": "message" }` (e.g. 401 Unauthorized, 500 server
error).

## Content kinds

- **post** — WRDLNKDN-native text post; `payload` may include `body` or `text`.
- **profile_update** — Profile change; `payload` is app-defined.
- **external_link** — User-submitted link; `payload`: `url` (required), `label`
  (optional). URL is **opaque** (stored and displayed only; never fetched by the
  backend).
- **repost** — Repost of another feed item; `parent_id` references the original.
- **reaction** — Reaction to another item; `parent_id` references the target.

## Guardrails

1. **Only WRDLNKDN-permitted content** — Feed is built from `feed_items` and
   `feed_connections`; RLS restricts visibility to the viewer and their
   connections.
2. **External URLs are opaque** — Stored and returned as metadata. No
   server-side fetch, scrape, or preview of third-party URLs.
3. **No third-party data** — No LinkedIn (or other) APIs or OAuth ingestion; no
   ads or sponsored content.
4. **Stable pagination** — Cursor is derived from `(created_at, id)` so ordering
   is consistent across pages.

## Create feed items

### POST /api/feeds

- **Auth:** Required.
- **Method:** POST.

### Request body

Two MVP-supported kinds:

- **Post**

```json
{
  "kind": "post",
  "body": "Text of the post"
}
```

- **External link**

```json
{
  "kind": "external_link",
  "url": "https://example.com/article",
  "label": "Optional display label"
}
```

Notes:

- `kind` must be `"post"` or `"external_link"`.
- For posts, `body` (or `text`) is required, trimmed; empty values are rejected.
- For links, `url` is required; `label` is optional.
- External URLs are **stored only as metadata** in `payload`
  (`{ url, label? }`). The backend never fetches, scrapes, or previews the URL.

### Responses

- **201 Created**

```json
{ "ok": true }
```

- **400 Bad Request** — validation error (missing body/url or unsupported kind).
- **401 Unauthorized** — missing/invalid token.
- **5xx** — server/database error; returns `{ "error": "message" }`.

## Usage

- Frontend: use `src/lib/feedsApi.ts`
  `fetchFeeds({ limit?, cursor?, accessToken? })`, `createFeedPost`, and
  `createFeedExternalLink`.
- Backend: GET/POST `/api/feeds` are implemented in `backend/server.ts`; GET
  calls Supabase RPC `get_feed_page`, POST inserts into `feed_items`.
