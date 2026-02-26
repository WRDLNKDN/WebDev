<!-- markdownlint-disable MD013 MD060 -->

# Spec: Unified Composer Toolbar & Content Limits

**Status:** Draft (for issue/ticket)  
**Scope:** Chat, Groups, Posts, Comments — shared UI patterns and limits

---

## 1. Summary

Standardize the composer toolbar (clippy/attach, emoji, GIF) across all content
creation surfaces, add character limits, document attachment/GIF sizes, and
optionally add auto-resize for uploads.

---

## 2. Unified “Reactions” Element (Composer Toolbar)

**Goal:** Chat, Groups, Posts, and Comments all use the same toolbar actions
where applicable.

| Action          | Post | Comment | Chat / Group |
| --------------- | ---- | ------- | ------------ |
| Clippy (Attach) | ✅   | ❌      | ✅           |
| Emoji           | ❌   | ❌      | ✅           |
| GIF             | ✅   | ✅      | ✅           |
| Schedule        | ✅   | —       | —            |

**Proposed unified toolbar:**

- **Posts:** Clippy | GIF | Schedule
- **Comments:** Clippy | Emoji | GIF
- **Chat / Group messages:** Clippy | Emoji | GIF

**Schedule** stays Posts-only. **Comments** currently only have GIF; add Clippy
and Emoji for parity.

**Reactions (to content):**

- Feed uses fixed types: like, love, inspiration, care (see
  `POST_UNIFICATION_PLAN.md`).
- Chat uses free emoji. Unification plan aligns Chat to Feed’s 4 types when
  using `PostCard`.

---

## 3. Character Limits

**Current state:** No explicit character limits in UI or API.

| Surface      | Component                  | `maxLength` | API / DB limit |
| ------------ | -------------------------- | ----------- | -------------- |
| Post body    | `InputBase` (Feed)         | None        | None           |
| Comment body | `TextField` (Feed)         | None        | None           |
| Chat message | `TextField` (MessageInput) | None        | None           |

**Proposed:** 2,000 characters for all text bodies (posts, comments, chat
messages).

- Add `inputProps={{ maxLength: 2000 }}` and `helperText` showing
  `{length}/2000`.
- Enforce server-side where API exists (feeds API, chat).
- `feed_items.payload` is JSONB; `chat_messages.content` is `text`; DB supports
  it.

---

## 4. Attachment Sizes

| Context          | Limit per file                  | Limit per item | Types                                    |
| ---------------- | ------------------------------- | -------------- | ---------------------------------------- |
| Chat attachments | 6 MB                            | 5 per message  | JPG, PNG, WEBP, GIF, PDF, DOC, DOCX, TXT |
| Feed post images | None (storage)                  | Multiple       | JPG, PNG, GIF, WebP                      |
| Avatar           | 6 MB upload → 1 MB after resize | 1              | Images                                   |

**Recommendations:**

- **Feed post images:** Add 6 MB per file, align with chat.
- **Chat:** Already has 6 MB and validation.

---

## 5. GIF Sizes

GIFs are **URLs** from Tenor/Giphy, not uploaded files. No client-side file
size. Rendered dimensions come from provider CDN.

- **Current:** URLs stored in body or `payload`; no explicit size limit.
- **Recommendation:** Optional client-side max URL length (e.g. 2048 chars) if
  needed; not required for MVP.

---

## 6. Auto-Resize (Nice-to-Have)

| Context          | Current behavior         | Proposed behavior                                            |
| ---------------- | ------------------------ | ------------------------------------------------------------ |
| Avatar           | Resize to 512×512, ≤1 MB | — (already done)                                             |
| Chat images      | EXIF strip, no resize    | Resize large images (e.g. >1920px) to fit, compress to ≤6 MB |
| Feed post images | No resize, upload as-is  | Same as chat: resize if large, cap at 6 MB                   |

**Implementation:** Reuse `processAvatarForUpload` pattern or add
`processImageForUpload(maxWidth, maxBytes)` for chat/feed.

---

## 7. Acceptance Criteria

### Unified toolbar

- [ ] Comment composer has Clippy (attach), Emoji, GIF (same as Chat).
- [ ] Post composer keeps Clippy, GIF, Schedule.
- [ ] Shared `ComposerToolbar` component used by Post, Comment, Chat composers.

### Character limits

- [ ] Post body: max 2,000 chars, counter visible.
- [ ] Comment body: max 2,000 chars, counter visible.
- [ ] Chat message: max 2,000 chars, counter visible.
- [ ] API/server enforces 2,000 where applicable.

### Attachments

- [ ] Feed post images: 6 MB per file (match chat).
- [ ] Document limits in `src/types/` or shared constants.

### Auto-resize (optional)

- [ ] Chat image uploads: resize if >1920px on longest side and/or >6 MB.
- [ ] Feed post image uploads: same behavior.

---

## 8. Related

- `docs/architecture/POST_UNIFICATION_PLAN.md` — PostCard and reaction
  unification
- `src/types/chat.ts` — `CHAT_MAX_FILE_BYTES`,
  `CHAT_MAX_ATTACHMENTS_PER_MESSAGE`
- `src/lib/utils/avatarResize.ts` — Avatar resize pattern to reuse
