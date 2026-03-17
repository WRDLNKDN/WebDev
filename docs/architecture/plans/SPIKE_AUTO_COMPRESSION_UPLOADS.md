# Spike: Auto-Resize, Compress, and Transcode Oversized Uploads

**Status:** Spike complete — recommendation  
**Scope:** Feed, Portfolio, Chats  
**Goal:** Determine whether WRDLNKDN can intelligently reduce file size for
supported media types instead of hard-failing uploads that exceed platform
limits.

---

## 1. Executive Summary

**Recommendation: Yes — support auto-compression for a defined subset of
content, with clear limits and UX.**

- **Images (JPEG, PNG, WebP, GIF where non-animated):** Strong candidates.
  Client-side resize/compress is already proven (avatars). Extend to Feed and
  Chat with a shared pipeline; optional for Portfolio thumbnails.
- **Animated GIFs (Chat):** Already supported via server-side transcode to MP4
  (2–8 MB input). Keep current behavior; consider raising input cap slightly
  with same 8 MB output cap.
- **Video (Portfolio only):** Do not auto-transcode in-scope. Enforce strict
  size limits; document “compress before upload” guidance. Server-side video
  transcode is costly and complex.
- **PDFs / Office / other:** Do not auto-compress. Optimization is
  format-specific and brittle; keep size limits and user guidance.
- **Universal absolute ceiling:** Recommend a single “max input we will ever
  accept” (e.g. 50 MB) for abuse control; backend multer already at 50 MB for
  process-gif.

---

## 2. Current State (from codebase)

### 2.1 Limits and behavior by surface

| Surface                         | Types                                        | Current limit                     | Current behavior                                                                                                    |
| ------------------------------- | -------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Feed (post images)**          | JPEG, PNG, GIF, WebP                         | 6 MB per file                     | Hard reject above 6 MB. No resize. Upload as-is to Supabase.                                                        |
| **Chat (attachments)**          | JPG, PNG, WebP, GIF, PDF, DOC, DOCX, TXT     | 2 MB direct; GIF 2–8 MB → process | Direct ≤2 MB: EXIF strip only (images). GIF 2–8 MB: server transcode to MP4 (ffmpeg), store MP4. >8 MB GIF: reject. |
| **Portfolio (project sources)** | Images, PDF, Office, TXT, MD, MP4, WebM, MOV | 2 MB per file                     | Hard reject. Guidance text only: “Keep around 2 MB… resize, convert, export with reduced settings.”                 |
| **Portfolio (thumbnails)**      | JPEG, PNG, GIF, WebP                         | 2 MB                              | Hard reject.                                                                                                        |
| **Avatar**                      | JPEG, PNG, GIF, WebP                         | —                                 | Client-side resize to 512×512 and ≤1 MB before upload (avatarResize.ts).                                            |
| **Resume (Dashboard)**          | PDF, DOC, DOCX                               | No explicit client limit          | Upload as-is; server generates thumbnail (separate pipeline).                                                       |
| **Advertiser icon**             | JPEG, PNG, WebP, GIF                         | 5 MB                              | Hard reject above 5 MB.                                                                                             |

### 2.2 Existing compression/transcode

- **Avatar:** `processAvatarForUpload()` — Canvas resize (max 512×512), JPEG/PNG
  quality loop until ≤1 MB. Client-only.
- **Chat GIF:** Backend `transcodeGifBufferToMp4()` — ffmpeg, 15 fps, scale max
  width 960, output MP4; stored in `chat-attachments`. Input ≤8 MB; output must
  be ≤8 MB or request rejected.
- **Chat images:** EXIF strip only (canvas redraw at 0.92 quality); no dimension
  or size reduction.
- **Feed / Portfolio:** No automatic compression or resize.

### 2.3 Backend constraints

- Multer (appCore.js): `fileSize: 50 * 1024 * 1024` (50 MB) for routes using
  that middleware (e.g. process-gif, ad upload).
- Supabase Storage: No app-level max documented; bucket policies may apply.
- process-gif: `CHAT_GIF_PROCESSING_MAX_BYTES = 8 * 1024 * 1024`; output also
  capped at 8 MB.

---

## 3. File-Type Eligibility for Auto-Compression

| Type                          | Compress automatically?      | Where           | Notes                                                                                                                 |
| ----------------------------- | ---------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Images (JPEG, PNG, WebP)**  | ✅ Yes                       | Feed, Chat      | Resize by max dimension + quality to hit target bytes. Reuse avatar pattern.                                          |
| **Static / non-animated GIF** | ✅ Yes (as image)            | Feed, Chat      | Treat as image; canvas redraw. If animated, skip or use existing GIF→video path (Chat).                               |
| **Animated GIF**              | ✅ Already (Chat)            | Chat only       | Keep server transcode to MP4. Optionally allow slightly larger input (e.g. 10 MB) with same 8 MB output cap.          |
| **Video (MP4, WebM, MOV)**    | ❌ No (in-scope)             | Portfolio       | No auto-transcode. Enforce strict max (e.g. 10–20 MB) + guidance. Server transcode is costly and operationally heavy. |
| **PDF**                       | ❌ No                        | All             | Optimization is possible but format-specific and brittle. Keep limits + “reduce PDF size before upload” guidance.     |
| **Office (DOC, DOCX, etc.)**  | ❌ No                        | Chat, Portfolio | No safe generic shrink. Keep limits.                                                                                  |
| **Audio**                     | ❌ No (not in current types) | —               | Not currently accepted; out of scope.                                                                                 |
| **Other portfolio artifacts** | ❌ No                        | Portfolio       | Same as Office/PDF.                                                                                                   |

---

## 4. Where Should Compression Happen?

| Approach        | Pros                                                                                                   | Cons                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Client-side** | No server CPU, predictable latency, works with existing avatar pattern, no extra storage for originals | Browser memory for large images; mobile limits; must ship logic in client.                              |
| **Server-side** | Handles all clients uniformly; can enforce policy                                                      | CPU cost, queue/capacity, latency, need to accept upload first (temp then replace or store derivative). |
| **Hybrid**      | Client tries first; server fallback for “too hard” cases                                               | Complexity, two code paths, when to fall back unclear.                                                  |

**Recommendation:**

- **Images (Feed, Chat):** **Client-side** resize/compress before upload. Same
  pattern as avatar: canvas resize + quality loop to target bytes. Keeps server
  simple and avoids accepting huge uploads.
- **GIF→video (Chat):** **Server-side** (current). Client cannot reliably
  transcode; keep `/api/chat/attachments/process-gif`.
- **Video/PDF/Office:** No auto-compression; **reject above limit** with clear
  message and guidance.

---

## 5. Target Limits by Surface

Recommended **target output** (after any compression) and **max input**
(absolute ceiling we accept for that type).

| Surface       | Type                     | Target output (max stored size) | Max input (accept then compress or reject)         |
| ------------- | ------------------------ | ------------------------------- | -------------------------------------------------- |
| **Feed**      | Images                   | 6 MB                            | 20 MB (try compress); above 20 MB reject.          |
| **Chat**      | Images, non-GIF          | 2 MB                            | 10 MB (try compress); above 10 MB reject.          |
| **Chat**      | Animated GIF             | 8 MB (MP4)                      | 8 MB (current) or 10 MB with same 8 MB output cap. |
| **Chat**      | PDF, DOC, DOCX, TXT      | 2 MB                            | 2 MB (no compress).                                |
| **Portfolio** | Project sources (images) | 2 MB                            | 6 MB (try compress for images only); others 2 MB.  |
| **Portfolio** | Project sources (video)  | —                               | 10 MB or 20 MB hard cap; no transcode.             |
| **Portfolio** | Thumbnails               | 2 MB                            | 6 MB (try compress).                               |

**Universal ceiling:** No single file upload (any surface) should exceed **50
MB** (already multer limit). For routes that don’t use that middleware, add an
explicit check.

---

## 6. Behavior When File Is Over Target

| Scenario                                                      | Behavior                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Within “try compress” range** (e.g. 6–20 MB image for Feed) | Run client-side resize/compress. If result ≤ target (6 MB), upload. If result still > target after reasonable quality floor (e.g. 0.5), show message: “We couldn’t reduce this enough. Try a smaller or lower-resolution image.” |
| **Above “max input”** (e.g. 20 MB image for Feed)             | Reject immediately: “File is too large. Max size for this type is X MB.”                                                                                                                                                         |
| **Unsupported for compression** (e.g. PDF > 2 MB in Chat)     | Reject: “File must be 2 MB or smaller. Try compressing the file before uploading.”                                                                                                                                               |
| **GIF 2–8 MB (Chat)**                                         | Current: send to server, transcode to MP4. If output > 8 MB, reject. No change.                                                                                                                                                  |

---

## 7. User Experience

| Aspect                 | Recommendation                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Silent vs informed** | **Inform.** Show short message during processing: “Optimizing your image…” or “Preparing your upload…” (reuse Chat’s “Preparing GIF…” pattern).                                                  |
| **Progress**           | Optional progress for large images (e.g. “Optimizing… 50%”). Not required for Phase 1.                                                                                                           |
| **Quality loss**       | No explicit “preview of quality loss” in Phase 1. Rely on sensible defaults (e.g. max dimension 1920–2400, quality down to 0.6). If we add “download original” later, that’s a separate feature. |
| **User choice**        | Phase 1: no “upload original vs compressed” toggle. Single path: we compress when over limit and under max input.                                                                                |
| **Failure**            | Clear message: “We couldn’t reduce this file enough. Try a smaller file or lower resolution.” with link to guidance if desired.                                                                  |

---

## 8. Technical Options (concise)

- **Client-side image pipeline:** Reuse/extend `processAvatarForUpload` pattern.
  New helper e.g.
  `processImageForUpload(file, { maxDimension, maxBytes, mime })` used by Feed
  and Chat. For animated GIF in Chat, keep current flow (no canvas).
- **Server-side image pipeline:** Possible (e.g. Sharp in Node) but adds CPU,
  memory, and deployment dependency. Prefer client for images.
- **Video transcode:** ffmpeg already used for GIF→MP4. Generic video
  resize/transcode for Portfolio would be a separate, heavy project (queue,
  presets, storage). **Out of scope** for this spike.
- **PDF/Office:** No generic “shrink” in-scope. Rely on limits and guidance.

---

## 9. Performance and Cost

| Concern                        | Mitigation                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Browser memory**             | Process one file at a time; release object URLs; cap max dimension (e.g. 4096) so decoded pixels stay bounded. |
| **Upload latency**             | Compressed file is smaller; upload often faster. Processing adds 1–3 s for large images on mid-tier devices.   |
| **Mobile/browser instability** | Timeout (e.g. 15 s); fallback to “try a smaller file” if processing fails or times out.                        |
| **Server CPU (GIF)**           | Already in place; 8 MB input cap keeps work bounded.                                                           |
| **Storage**                    | Storing only compressed output reduces storage vs storing originals. No “original + derivative” in Phase 1.    |
| **CDN**                        | Smaller files = faster delivery; no negative impact.                                                           |

---

## 10. Governance and Policy

| Topic                   | Recommendation                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Max absolute upload** | 50 MB per file (align all routes with multer or explicit check). Reject above with generic “File too large” message. |
| **Virus/security**      | Out of scope for this spike; no change to scanning assumptions.                                                      |
| **Content moderation**  | Compressed images remain subject to same moderation as today.                                                        |
| **Abuse**               | Rate limits and 50 MB cap limit abuse. No “accept then process 200 MB” for images.                                   |
| **Retention**           | Unchanged; we store the compressed artifact only.                                                                    |

---

## 11. Decision Matrix

| File type                           | Surface                         | Action                                                                                           |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| Image (JPEG, PNG, WebP, static GIF) | Feed                            | Compress automatically if over 6 MB and ≤ 20 MB input; reject > 20 MB.                           |
| Image (JPEG, PNG, WebP, static GIF) | Chat                            | Compress automatically if over 2 MB and ≤ 10 MB input; reject > 10 MB.                           |
| Animated GIF                        | Chat                            | Transcode to MP4 if 2–8 MB (current). Optionally 2–10 MB input, 8 MB output cap. Reject > 10 MB. |
| Image                               | Portfolio (source or thumbnail) | Compress automatically if over 2 MB and ≤ 6 MB input; reject > 6 MB.                             |
| Video                               | Portfolio                       | Reject above 10 MB or 20 MB; no transcode.                                                       |
| PDF, DOC, DOCX, TXT                 | Chat / Portfolio                | No compress. Enforce 2 MB (Chat) or 2 MB (Portfolio). Reject with guidance.                      |
| Any                                 | Any                             | Reject if file > 50 MB.                                                                          |

---

## 12. Phased Rollout (if implemented)

- **Phase 1:** Client-side image compression for **Feed** and **Chat** (images
  only). Same limits as today for “direct” (6 MB Feed, 2 MB Chat); allow input
  up to 20 MB / 10 MB and compress to 6 MB / 2 MB. UX: “Optimizing your image…”
  then upload or “Couldn’t reduce enough.”
- **Phase 2:** Extend to **Portfolio** thumbnails and project source images (2
  MB target; allow up to 6 MB input, compress).
- **Phase 3 (optional):** Slightly raise Chat GIF input cap (e.g. 10 MB) with
  same 8 MB output; or add “store original + derivative” for Portfolio only
  (larger scope).

---

## 13. Open Questions (for product/engineering)

1. **Portfolio vs Feed/Chat:** Should Portfolio allow larger _source_ files than
   Feed/Chat (e.g. 10 MB images) with “we’ll store a 2 MB version for display”?
   That implies “original + derivative” and possibly different UX (e.g.
   “Full-size available on request”). Recommendation: Phase 1 no; single stored
   artifact.
2. **Keep originals?** Recommendation: No for Phase 1. Store only the optimized
   artifact to avoid storage and policy complexity.
3. **Universal vs surface-specific limit?** Recommendation: One universal cap
   (50 MB). Per-surface _targets_ (6 MB Feed, 2 MB Chat, 2 MB Portfolio) stay as
   today.
4. **GIF→video for Feed?** Feed currently does not support video uploads; GIFs
   in posts are often URLs (Tenor/Giphy). If Feed ever accepts uploaded GIFs,
   reuse Chat’s “GIF over 2 MB → transcode to video” rule or document as
   follow-up.
5. **Absolute max input for “try compress”?** Recommendation: 20 MB Feed images,
   10 MB Chat images, 6 MB Portfolio images. Prevents abuse and keeps client
   processing time bounded.

---

## 14. Success Criteria (for spike output)

- [x] Clear recommendation: auto-compression **supported** for images (and
      existing GIF→video in Chat).
- [x] Supported/unsupported file types defined.
- [x] Size rules and fallback (reject with message) defined per surface.
- [x] UX: inform user during optimization; clear failure message.
- [x] Technical approach: client-side for images; server for GIF→video; no
      video/PDF/Office auto-compress.
- [x] Risks and tradeoffs documented (memory, latency, mobile).
- [x] Phased rollout suggested (Feed/Chat first, then Portfolio).
- [x] Implementation-ready: can be broken into features (e.g. “Feed image
      auto-compress”, “Chat image auto-compress”, “Portfolio image
      auto-compress”).

---

## 15. Out of Scope (for this spike)

- Full implementation (spike is recommendation only).
- Final UI copy (placeholder messaging only).
- Final storage vendor decisions (no change assumed).
- Malware/virus scanning (unchanged).
- “Store original + derivative” flows (recommendation: Phase 1 no).

---

## 16. References

- `src/lib/utils/avatarResize.ts` — Avatar resize/compress pattern.
- `src/lib/chat/attachmentProcessing.ts` — Chat processing plan (direct vs
  gif_processing).
- `src/lib/chat/attachmentValidation.ts` — Chat rejection reasons.
- `backend/appCore.js` — process-gif, multer 50 MB, transcodeGifBufferToMp4.
- `src/pages/feed/Feed.tsx` — FEED_POST_IMAGE_MAX_BYTES (6 MB).
- `src/types/chat.ts` — CHAT_DIRECT_UPLOAD_MAX_FILE_BYTES (2 MB).
- `src/lib/portfolio/projectMedia.ts` — PROJECT_THUMBNAIL_MAX_BYTES (2 MB).
  Portfolio project-source upload and PROJECT_SOURCE_MAX_BYTES were removed
  (URL-only portfolio).
- `docs/architecture/plans/SPEC_UNIFIED_COMPOSERS_AND_LIMITS.md` — Attachment
  sizes and auto-resize mention.
