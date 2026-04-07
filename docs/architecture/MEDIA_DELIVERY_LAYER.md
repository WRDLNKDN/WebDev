# Media delivery layer (UAT & Prod)

**See also:**
[MEDIA_UNIFIED_ASSET_MIGRATION.md](./MEDIA_UNIFIED_ASSET_MIGRATION.md) (legacy →
`media_assets`, backfill, cutover),
[MEDIA_OBSERVABILITY_AND_QA.md](./MEDIA_OBSERVABILITY_AND_QA.md) (telemetry,
health dashboard, tests), [MEDIA_MODERATION.md](./MEDIA_MODERATION.md)
(moderation status, quarantine, GIF policy).

This document defines how **originals**, **display derivatives**, and
**thumbnails** are stored, cached, and delivered across WRDLNKDN. Implementation
lives primarily in `src/lib/media/` (client) and `backend/lib/mediaService.js`
(API); policy constants are mirrored in `backend/lib/mediaDelivery.js` for Node.

---

## 1. Storage layout (Supabase Storage)

### 1.1 Structured asset prefix

For uploads that use the **structured pipeline** (`uploadStructuredPublicAsset`,
structured chat attachments), objects share a common directory per asset:

```text
{bucket}/{ownerId}/{scope}/{assetId}/original.{ext}
{bucket}/{ownerId}/{scope}/{assetId}/display.{ext}   # derivative
{bucket}/{ownerId}/{scope}/{assetId}/thumbnail.{ext}
```

- **Stems** are fixed: `original`, `display`, `thumbnail` (`MEDIA_*_FILE_STEM`
  in `src/lib/media/assets.ts`).
- **Sibling paths** are derived by replacing only the terminal filename
  (`deriveSiblingStoragePath`).
- **Extensions** depend on media type and MIME (e.g. WebP/PNG display + JPG
  thumbnail for images; MP4 display for transcoded GIFs; SVG for document
  previews). See `getStructuredMediaDerivativeExtensions`.

Path construction:
`buildStructuredMediaStoragePath({ ownerId, scope, assetId?, extension, stem? })`.

### 1.2 Buckets (representative)

| Area                           | Bucket / usage                                         | Typical URL access                            |
| ------------------------------ | ------------------------------------------------------ | --------------------------------------------- |
| Feed / portfolio public images | e.g. `project-sources`, `project-images`, feed buckets | **Public** object URLs                        |
| Avatars, resumes               | `avatars`, `resumes`                                   | **Public** URLs from client after upload      |
| Chat attachments               | `chat-attachments`                                     | **Signed** URLs at read time (private bucket) |

Legacy rows may store a single path without `original.` / `display.` /
`thumbnail.`; resolvers fall back to flat paths and still derive sibling names
when possible (`createChatAttachmentStorageDescriptor`,
`getStructuredDerivativePaths` in `AttachmentPreview.tsx`).

---

## 2. Logical layers: originals vs derivatives

| Layer         | Role                                                     | Typical content                            |
| ------------- | -------------------------------------------------------- | ------------------------------------------ |
| **Original**  | Authoritative upload or external source                  | User file, linked URL, or generated source |
| **Display**   | Sized/encoded for UI (feed, chat inline, portfolio card) | WebP/PNG/GIF/MP4/SVG depending on type     |
| **Thumbnail** | Small preview / poster                                   | JPEG or SVG                                |

Rendering order for “what to show” is centralized in
`buildPlatformMediaRenderingReferences` (`src/lib/media/contract.ts`):
safe-to-render checks, then display → thumbnail → original/fallback as needed.

---

## 3. Delivery metadata (`delivery_metadata`)

`buildPlatformMediaDelivery` (`src/lib/media/delivery.ts`) attaches
**per-variant** policy to each derivative:

- **`storageVersion`** — integer; starts at `1`, incremented on invalidation
  (see below).
- **`storagePrefix`** — directory prefix for the structured asset (parent folder
  of `original.*`).
- **`invalidationToken`** — string derived from `assetId`, `storageVersion`, and
  timestamps; used for **cache-busting semantics** when clients or
  intermediaries key off metadata.
- **Per-variant fields** (`original` / `display` / `thumbnail`): `visibility`,
  `cacheProfile`, `cacheControl`, optional `signedUrlTtlSeconds`, optional
  `invalidationToken`.

### 3.1 Visibility rules (conceptual)

| `visibility` | Meaning                                                                             |
| ------------ | ----------------------------------------------------------------------------------- |
| `public`     | Object has a stable **public** URL (`getPublicUrl`); path may still be listed in DB |
| `signed`     | Object is accessed via **short-lived signed URL** (path without public URL in DB)   |
| `private`    | Not for public embedding; `cacheProfile` → `no_store`                               |

Derivation in code: if `storagePath` exists and no `url`, treat as **signed**;
if `url` is set, **public**; external-only links rely on `revalidate` unless
they are Supabase storage URLs (then **immutable** profile).

### 3.2 Cache profiles (browser / CDN intent)

These are **declared** on `PlatformMediaDeliveryVariantPolicy` for consistency
across surfaces; Supabase Storage may apply its own headers—treat these as
**platform contract** for clients and edge logic.

| Profile        | `cacheControl` (intent)                             | When                                             |
| -------------- | --------------------------------------------------- | ------------------------------------------------ |
| `immutable`    | `public, max-age=31536000, immutable`               | Structured storage paths or Supabase object URLs |
| `revalidate`   | `public, max-age=300, stale-while-revalidate=86400` | External HTTP URLs, non-storage                  |
| `signed_short` | `private, max-age=60, stale-while-revalidate=30`    | Signed access pattern                            |
| `no_store`     | `no-store`                                          | Private                                          |

Constants: `PLATFORM_MEDIA_SIGNED_URL_TTL_SECONDS` (**300** s) in delivery
policy. **Note:** the chat attachment UI uses `createSignedUrl(..., 3600)` for
chat previews (`AttachmentPreview.tsx`); align TTLs in a future pass if strict
uniformity is required.

---

## 4. CDN and edge behavior

- **Media bytes** are served from **Supabase Storage** (HTTPS URLs under the
  project’s storage host), not from the Vercel `dist` app shell.
- **Vercel** (`vercel.json`) sets security headers for the SPA; it does **not**
  set long-lived cache for media binaries.
- **Cache invalidation** for updated content is achieved by:
  1. **Bumping `storageVersion`** and rebuilding `invalidationToken` via
     `bumpPlatformMediaDeliveryVersion` when replacing objects or reprocessing.
  2. **Writing new objects** at the same logical paths (overwrite) or new
     paths + updated DB references—either way, clients should rely on **fresh
     URLs or metadata** from the API after updates.

---

## 5. Public vs signed URL rules by asset type

| Asset class                                                      | Read path                                                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Public bucket uploads (portfolio, feed images, avatars, resumes) | `getPublicUrl` after upload; URLs stored or recomputed from `storagePath` + bucket                                                   |
| Chat attachments (private bucket)                                | Client requests **signed URLs** per path; in-memory **promise cache** per path avoids duplicate sign calls (`AttachmentPreview.tsx`) |
| Admin / mail-adjacent one-offs                                   | Backend may use longer signed URLs (e.g. advertiser flows in `backend/routes/advertiseRequest.ts`)                                   |

---

## 6. Lifecycle, cleanup, and retention

`buildPlatformMediaLifecycle` (`delivery.ts`) defines **retention windows**
(also exported for jobs):

| Constant                                 | Days   | Use                                                |
| ---------------------------------------- | ------ | -------------------------------------------------- |
| `PLATFORM_MEDIA_FAILED_RETENTION_DAYS`   | **7**  | Failed processing; asset kept for inspection/retry |
| `PLATFORM_MEDIA_DELETED_RETENTION_DAYS`  | **30** | Soft-deleted assets before physical delete         |
| `PLATFORM_MEDIA_ORPHANED_RETENTION_DAYS` | **3**  | Orphan uploads (e.g. intake without parent)        |

**States** include: `active`, `orphaned`, `failed_retained`, `pending_delete`,
`deleted`. Orphans are detected via metadata (`parentType` / `surface`) or
`cleanupState`.

**Cleanup jobs** (storage GC) should: respect `cleanupAfter` / `deleteAfter`,
remove objects under `storagePrefix` when the row is eligible, and emit
telemetry. Concrete schedulers belong in ops/backend—**policy numbers are
canonical in `delivery.ts`**.

---

## 7. Reprocessing and backfills

- **Eligibility:** `isPlatformMediaReprocessable` — `upload` and `generated`
  sources, not `deleted`.
- **API:** `POST /api/media/assets/:assetId/reprocess` (`reprocessMediaAsset` in
  `backend/lib/mediaService.js`).
- **Default behavior:** bumps **delivery version** (`bumpMediaDeliveryVersion` /
  `bumpPlatformMediaDeliveryVersion`) unless `invalidateDelivery: false` in the
  body—ensures **cache invalidation tokens** refresh when derivatives are
  rebuilt.
- **Lifecycle:** `markPlatformMediaLifecycleReprocessRequested` sets
  `reprocessState: 'queued'` and timestamps for workers.
- **Legacy / migration:** `backend/lib/mediaMigration.js` and
  `src/lib/media/legacyCompatibility.ts` flag rows that need derivative
  backfills (e.g. GIF posters, document previews).

Background workers should poll `media_assets` for `reprocessState = 'queued'`
and `processing_state` transitions, then regenerate derivatives and set `ready`
or `failed` with updated `delivery_metadata`.

---

## 8. Reference map (code)

| Concern                        | Location                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Path stems / sibling paths     | `src/lib/media/assets.ts`                                                          |
| Upload + derivative generation | `src/lib/media/ingestion.ts`                                                       |
| Delivery + lifecycle policy    | `src/lib/media/delivery.ts`                                                        |
| Contract types                 | `src/lib/media/contract.ts`                                                        |
| Rendering URL resolution       | `buildPlatformMediaRenderingReferences` in `contract.ts`                           |
| Chat signed URL resolution     | `src/components/chat/message/AttachmentPreview.tsx`                                |
| Reprocess API                  | `backend/appCore.js` route; `reprocessMediaAsset` in `backend/lib/mediaService.js` |
| Node delivery mirror           | `backend/lib/mediaDelivery.js`                                                     |

---

## 9. Future scale (non–surface-specific)

- Keep **one structured prefix** per asset ID; avoid per-surface path
  conventions.
- Prefer **metadata-driven** `delivery_metadata` + `rendering_references`
  updates over branching in UI components.
- Add **object lifecycle rules** in Supabase (if available) aligned with
  `cleanupAfter` for cold storage.
- Consider a **single worker** queue for reprocess jobs keyed by `assetId` to
  cap concurrency on derivative CPU.
