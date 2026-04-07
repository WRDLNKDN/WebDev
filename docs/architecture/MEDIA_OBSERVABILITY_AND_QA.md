# Media observability & QA (UAT & Prod)

This document describes how WRDLNKDN **monitors**, **measures**, and **tests**
the shared media system (ingestion, processing, preview, rendering).
Implementation is split across client telemetry, server persistence, admin
aggregation, and automated tests.

**Related:** [MEDIA_DELIVERY_LAYER.md](./MEDIA_DELIVERY_LAYER.md),
[MEDIA_UNIFIED_ASSET_MIGRATION.md](./MEDIA_UNIFIED_ASSET_MIGRATION.md),
[MEDIA_MODERATION.md](./MEDIA_MODERATION.md).

---

## 1. Pipeline stages (canonical)

Stages align with `MEDIA_TELEMETRY_STAGES` in `src/lib/media/telemetry.ts` and
`MEDIA_HEALTH_STAGES` in `backend/lib/mediaObservability.js`:

| Stage          | Typical events                         |
| -------------- | -------------------------------------- |
| `validation`   | Upload intake validation               |
| `upload`       | Storage upload start/complete          |
| `optimization` | Derivative compression, PDF resave     |
| `conversion`   | GIF→video, transcoding                 |
| `preview`      | Thumbnails, GIF picker, link previews  |
| `render`       | `AssetThumbnail` ready/fallback/failed |

**Inference:** `inferStage()` in `mediaObservability.js` maps `eventName` +
`stage` when clients omit explicit `stage` (e.g. `media_render_*` → `render`,
`gif_picker_*` → `preview`).

---

## 2. Structured logging

### 2.1 Client → API

- `reportMediaTelemetry` / `reportMediaTelemetryAsync`
  (`src/lib/media/telemetry.ts`) send JSON to `POST /api/media/telemetry` (see
  `backend/appCore.js`) when authenticated.
- Payloads are normalized by `normalizeClientMediaTelemetryPayload` before
  persistence.

### 2.2 Server console (all persisted client events)

- `persistClientMediaTelemetry` (`backend/lib/mediaObservability.js`) logs
  **`[media-observability]`** with `eventName`, `stage`, `surface`, `pipeline`,
  `status`, `failureCode`, `failureReason`, and `meta` — failures use
  `console.warn`, success `console.info`.

### 2.3 Audit trail

- Rows are inserted into **`audit_log`** with
  `action = 'MEDIA_CLIENT_TELEMETRY'` and structured `meta` (mirrors the
  normalized event).

### 2.4 Asset pipeline

- `media_asset_events` (and server-side media service telemetry) supply
  **`source: 'asset'`** events for `fetchAdminMediaHealthSnapshot`.

---

## 3. Metrics & failure categories

`summarizeMediaHealth()` aggregates:

- **Per-stage:** total events, failure count, latest timestamp.
- **Per-surface:** totals and failures (e.g. `feed`, `chat-attachments`,
  `shared_gif_picker`).
- **Failure buckets:** `uploadFailures`, `previewFailures`,
  `conversionFailures`, `renderFailures`, `gifFailures` (GIF-related failures
  increment `gifFailures` heuristically from event names / `gif_search_failed`).

**Asset table counts:** active `media_assets` by `processing_state`, plus
**stale processing** (still `processing` with `updated_at` older than 30
minutes).

### 3.1 Moderation & quarantine (ops)

Use this alongside [MEDIA_MODERATION.md](./MEDIA_MODERATION.md) when tuning
safety hooks or investigating takedowns.

- **Quarantine spikes:** Watch counts of `media_assets` with
  `moderation_status = 'quarantined'` (and failures whose metadata references
  `MEDIA_QUARANTINED`) after deploys or upstream provider changes.
- **Telemetry:** Client events still flow through the same pipeline; correlate
  admin **render** / **preview** failure buckets with new `failureCode` values
  if you add moderation-stage instrumentation.
- **Dashboard:** `/admin/media-health` surfaces stage/surface failures; for
  asset-level review, use admin moderation flows and DB queries on
  `moderation_status` + `failure` JSON as needed.

---

## 4. Media health dashboard (admin)

| Route | `src/pages/admin/ops/AdminMediaHealthPage.tsx` | | API |
`GET /api/admin/media-health?windowHours=` (`requireAdmin`) | | Client |
`fetchAdminMediaHealth` in `src/lib/api/adminMediaHealthApi.ts` |

**UI sections:** asset summary cards, failure metric buckets, telemetry coverage
(pipeline vs client event counts), stage table, surface table, recent failures,
**synthetic checks**, **regression guards**, **browser validation matrix**
(sourced from `src/lib/media/mediaQaMatrix.ts`).

---

## 5. QA matrix (single source of truth)

| Export                    | File                             | Purpose                                               |
| ------------------------- | -------------------------------- | ----------------------------------------------------- |
| `MEDIA_SYNTHETIC_CHECKS`  | `src/lib/media/mediaQaMatrix.ts` | Unit / E2E tests that act as smoke/regression anchors |
| `MEDIA_REGRESSION_GUARDS` | same                             | Known bug IDs + files that must stay green            |
| `MEDIA_VALIDATION_MATRIX` | same                             | Browser / platform / viewport manual follow-up        |

Update the matrix when adding tests so the admin page stays accurate.

---

## 6. Automated coverage (major surfaces)

| Area                                | Tests                                                                 |
| ----------------------------------- | --------------------------------------------------------------------- |
| Upload intake                       | `src/tests/media/uploadIntake.test.ts`                                |
| Renderers / layout                  | `src/tests/media/AssetRenderers.test.tsx`                             |
| GIF picker                          | `src/tests/chat/GifPickerDialog.test.tsx`                             |
| Observability rollup                | `src/tests/media/mediaObservability.test.ts`                          |
| E2E chat upload UX                  | `src/tests/e2e/media/media-upload-shared-ux.spec.ts`                  |
| E2E platform smoke (groups media)   | `src/tests/e2e/media/media-platform-smoke.spec.ts`                    |
| E2E chat files                      | `src/tests/e2e/chat/chat-file-upload.spec.ts`                         |
| E2E GIF picker (no rating controls) | `src/tests/e2e/chat/gif-picker-close.spec.ts`                         |
| E2E portfolio resume                | `src/tests/e2e/portfolio/portfolio-resume-preview.spec.ts`            |
| Accessibility                       | `src/tests/e2e/accessibility.spec.ts` (when run with valid `baseURL`) |

---

## 7. Regression guards (documented bugs)

| ID                           | Intent                                                                             | Primary test               |
| ---------------------------- | ---------------------------------------------------------------------------------- | -------------------------- |
| `gif-picker-initial-failure` | GIF picker must not open already failed                                            | `GifPickerDialog.test.tsx` |
| `inline-media-clipping`      | Prefer display derivatives; inline layout respects presentation (contain vs cover) | `AssetRenderers.test.tsx`  |

---

## 8. Manual / matrix follow-up

`MEDIA_VALIDATION_MATRIX` lists **Firefox**, **WebKit**, **mobile** viewports as
**manual follow-up** for behaviors that are expensive to automate (autoplay,
Safari downloads, tap targets).

---

## 9. Operations checklist (UAT / Prod)

1. Open **`/admin/media-health`** — confirm non-zero telemetry when traffic
   exists; investigate spikes in **render** or **GIF failures**, and spot-check
   **quarantined** asset volume (`moderation_status`) if safety hooks or
   providers changed.
2. Compare **stale processing** vs stuck jobs; align with `reprocess` queue /
   `media_assets.processing_state`.
3. Before releases: run **`npm run test`** (or CI) including
   `mediaObservability`, `uploadIntake`, `AssetRenderers`, `GifPickerDialog`;
   run Playwright media specs if E2E is configured.
4. After incidents: add a **regression guard** or **synthetic check** row and
   extend `mediaObservability` tests if new event shapes are introduced.
