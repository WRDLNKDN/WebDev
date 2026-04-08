# Media moderation and safety (UAT & Prod)

**See also:** [MEDIA_DELIVERY_LAYER.md](./MEDIA_DELIVERY_LAYER.md) (URLs, cache,
quarantine suppression on render).

WRDLNKDN keeps **moderation state and provider safety** in the media pipeline
and storage layer. Member-facing surfaces stay clean: no ad-hoc “content rating”
pickers for uploads or GIF search.

---

## 1. Asset fields (contract)

- **`moderationStatus`** — One of `unreviewed`, `pending_review`, `approved`,
  `reported`, `quarantined` (`PLATFORM_MEDIA_MODERATION_STATUSES` in
  `src/lib/media/contract.ts`).
- **`moderation`** — `PlatformMediaModerationMetadata`: `safeToRender`,
  `hookStatus`, `provider`, `abuseReport`, `unsafeReasons`, timestamps, etc.

Client **safe render** check: `isPlatformMediaSafeToRender` (and
`buildPlatformMediaRenderingReferences`, which clears URLs when not safe).
Convenience re-exports: `src/lib/media/moderation.ts`.

---

## 2. Backend

- **`backend/lib/mediaModeration.js`** — `resolveMediaModeration` (merges abuse
  report refs, provider safety decisions, quarantine), `runMediaSafetyCheck`,
  `buildQuarantinedFailure`.
- **`backend/lib/mediaService.js`** — Applies moderation updates, quarantine,
  and reprocess guards (see service for entry points).

---

## 3. GIF search (GIPHY)

- **`PLATFORM_GIPHY_GIF_CONTENT_FILTER`** in `src/lib/chat/gifApi.ts` — Single
  fixed GIPHY rating tier for the shared picker (`GifPickerDialog`). Members do
  not choose PG vs G; platform policy + pipeline moderation apply instead.

---

## 4. How to test

### Unit (Vitest)

```bash
npx vitest run \
  src/tests/media/mediaModeration.test.ts \
  src/tests/media/delivery.test.ts \
  src/tests/media/assets.test.ts \
  src/tests/chat/gifApi.test.ts \
  src/tests/chat/GifPickerDialog.test.tsx
```

- **`mediaModeration.test.ts`** — Backend `resolveMediaModeration`,
  `runMediaSafetyCheck`, `buildQuarantinedFailure`.
- **`delivery.test.ts`** — Quarantined assets suppress renderable URLs; imports
  `isPlatformMediaSafeToRender` / `buildPlatformMediaRenderingReferences` from
  `src/lib/media/moderation.ts` (barrel over `contract.ts`) so the public module
  stays covered without a duplicate test file.
- **`assets.test.ts`** — Normalized asset mapping for quarantined rows.
- **`gifApi.test.ts`** — Platform GIF filter constant and GIPHY rating map.
- **`GifPickerDialog.test.tsx`** — Picker does not expose rating labels; search
  uses the platform filter.

### Typecheck

```bash
npm run typecheck
```

### E2E (Playwright)

GIF picker flows that assert **no** GIPHY rating controls (e.g. PG-13 / Strict /
“Content:”) live in `src/tests/e2e/chat/gif-picker-close.spec.ts`. Run with a
valid `baseURL` per project config (same as other authenticated chat/feed
specs).

---

## 5. Admin / abuse

Profile and content moderation UIs live under `src/pages/admin/`. Abuse report
references on assets are normalized in `resolveMediaModeration`
(`abuseReportRef` vs stored `moderation.abuseReport`). Operational detail:
`docs/MODERATION_GUIDE.md` where applicable.
