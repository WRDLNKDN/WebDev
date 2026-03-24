# Portfolio: Links, Thumbnails, and Preview — Product & Technical Spec

**Status:** Canonical spec  
**Scope:** Portfolio items (URL-based); Resume is separate.  
**Environment:** UAT and Prod.

---

## Thumbnail and Preview Generation Strategy (Overview)

- **Portfolio items are URL-based.** Resume is the only file uploaded directly
  to WRDLNKDN storage.
- For Portfolio URLs the system must:
  1. **Classify** the link type.
  2. **Normalize** provider-specific URLs.
  3. **Generate a thumbnail** (unless the user uploaded a manual image).
  4. **Provide an in-app preview** when supported.
  5. **Fail deterministically** when preview is not possible.

---

## Step 1: Classify and Normalize the URL

When a Portfolio link is submitted:

1. **Validate** it is a proper `http` or `https` URL.
2. **Detect file type** based on:
   - File extension (`.pdf`, `.docx`, `.pptx`, `.jpg`, etc.).
   - Known provider patterns (Google Docs, Sheets, Slides).
3. **Normalize** Google Workspace links into canonical preview URLs.
4. **Store:**
   - `project_url` (original URL)
   - `normalized_url` (canonical form, e.g. Google `/preview`)
   - `embed_url` (if applicable, for iframe)
   - `resolved_type` (e.g. `image`, `pdf`, `google_doc`)

**Implementation:** `src/lib/portfolio/linkUtils.ts` (getLinkType,
normalizeGoogleUrl), `linkValidation.ts` (validatePortfolioUrl). App persists
these on insert/update.

---

## Step 2: Respect Manual Image Override

If the user uploads a custom image in the optional **“Upload an image”** field:

- Use that image as the **thumbnail**.
- **Skip** automatic thumbnail generation.
- Do **not** attempt background preview fetch for thumbnail.
- **Continue to support** the preview modal using the URL (preview still uses
  the link target).

Manual image **always** supersedes auto-generated thumbnail.

**Implementation:** `portfolio_items.image_url`; when set, thumbnail worker
skips. See §4 and
[portfolio-thumbnail-generation.md](./portfolio-thumbnail-generation.md).

---

## Step 3: Generate Thumbnail (If No Override)

Thumbnail generation is **server-side** and **asynchronous**.

| Type                                 | Rule                                                                                                                                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Images** (.jpg, .png, .gif, .webp) | Use the image itself; resize and crop to standardized card dimensions; cache in platform storage to avoid hotlinking.                                                                                      |
| **PDF**                              | Fetch server-side; render page 1 to PNG; store thumbnail; save `thumbnail_url` in database.                                                                                                                |
| **DOCX**                             | Convert to PDF server-side; render first page as image; cache thumbnail.                                                                                                                                   |
| **PPTX**                             | Convert to PDF or slide images; render slide 1 as thumbnail; cache.                                                                                                                                        |
| **XLSX**                             | Optional: render first sheet to image; if not supported, use spreadsheet icon fallback.                                                                                                                    |
| **Google Docs / Sheets / Slides**    | Use canonical embed URL; attempt provider preview image or Open Graph image; if export endpoint available, generate from exported PDF/image; if not publicly accessible, skip thumbnail and show fallback. |

**Status flag:** `thumbnail_status` = `pending` | `generated` | `failed`.
Thumbnail failure must **not** block saving the Portfolio item.

**Implementation:** Edge Function `generate-portfolio-thumbnail`; optional
`THUMBNAIL_SERVICE_URL` for PDF/Office/Google. See
[portfolio-thumbnail-generation.md](./portfolio-thumbnail-generation.md).

---

## Step 4: Preview Modal Behavior

Clicking a Portfolio card opens a **modal**. The modal must include:

- **Title**
- **File type label**
- **Open in new tab** action
- **Copy link** action

**Preview behavior by type:**

| Type                              | Behavior                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Images**                        | Render full image.                                                                                         |
| **PDF**                           | Embedded PDF viewer with scroll.                                                                           |
| **DOCX / PPTX**                   | Use converted PDF preview; render inside viewer (or Office Online embed).                                  |
| **XLSX**                          | If previewable, render first sheet; otherwise show structured fallback with download link.                 |
| **Google Docs / Sheets / Slides** | Render via iframe using embed URL. If sharing is restricted, show: “This link is not publicly accessible.” |

**Implementation:** `PortfolioPreviewModal.tsx`, `getPortfolioPreviewModel()` in
`previewUtils.ts`.

---

## Step 5: Error Handling Rules

**Never** show generic errors (e.g. “Some information couldn’t be processed.”).
Use **deterministic** error states:

| Scenario                | Message                                                     |
| ----------------------- | ----------------------------------------------------------- |
| Unsupported type        | “This file type is not supported for preview.”              |
| Not publicly accessible | “This link is not publicly accessible.”                     |
| Embedding blocked       | “This content cannot be embedded. Open in new tab to view.” |
| Temporary failure       | “Preview temporarily unavailable. Try again later.”         |

Thumbnail failure must **not** block saving the Portfolio item.

**Implementation:** `PortfolioPreviewModal.tsx` — `ERROR_MESSAGES`;
`linkValidation.ts` — `PORTFOLIO_NOT_PUBLIC_ERROR`.

---

## Step 6: Caching and Storage

Generated thumbnails must:

- Be stored in **platform storage** (e.g. `portfolio-thumbnails` bucket).
- Be **associated** with the Portfolio item (e.g. by `owner_id` and item `id`).
- **Avoid** regenerating on every page load (only when
  `thumbnail_status = 'pending'` or on explicit retry).
- Use status flag: **pending** | **generated** | **failed**.

**Implementation:** Edge Function uploads to storage and updates `thumbnail_url`
and `thumbnail_status`; UI shows loading skeleton for pending, fallback icon for
failed.

---

## Resulting System Characteristics

- **Deterministic behavior.** Same URL and override state always yield the same
  rules.
- **No silent failures.** Clear, user-facing messages for unsupported, not
  public, embed blocked, temporary failure.
- **Manual image override respected.** Custom image always used as thumbnail;
  auto-generation skipped.
- **Resume flow remains separate.** No change to Resume upload or storage.
- **Portfolio links remain URL-based.** No requirement to upload the linked file
  to WRDLNKDN.
- **Consistent preview experience** across Profile, Dashboard, and public views.

---

## Reference: Principles and Supported Targets

- **Portfolio items are URL-only.** The only file upload in Portfolio is the
  optional “Upload an image” for the card thumbnail.
- **Resume is the only artifact uploaded to WRDLNKDN storage.**
- **Manual image override always wins.** Auto-thumbnail is skipped when a custom
  image is provided.
- **Portfolio links never require uploading the linked file to WRDLNKDN.**

---

## 2. Supported Link Targets (detail)

### 2.1 Direct file URLs (publicly accessible)

| Category      | Extensions                     |
| ------------- | ------------------------------ |
| Images        | .jpg, .jpeg, .png, .gif, .webp |
| Documents     | .pdf, .doc, .docx              |
| Presentations | .ppt, .pptx                    |
| Spreadsheets  | .xls, .xlsx                    |
| Text          | .txt, .md                      |
| Video         | .mp4, .webm, .mov              |

### 2.2 Google Workspace URLs

- **Google Docs** — `https://docs.google.com/document/d/...`
- **Google Sheets** — `https://docs.google.com/spreadsheets/d/...`
- **Google Slides** — `https://docs.google.com/presentation/d/...`

**Implementation:** `src/lib/portfolio/linkUtils.ts` — `getLinkType()`,
`SUPPORTED_*_EXTENSIONS`, Google host regexes.

---

## 3. Link Resolution Requirements

### 3.1 URL validation

- Accept **http and https** only.
- Reject empty or invalid URLs with: **“Enter a valid URL (https:// or
  http://).”**
- Detect target type using file extension or known provider patterns (Google
  Docs/Sheets/Slides).

**Implementation:** `src/lib/portfolio/linkValidation.ts` —
`validatePortfolioUrl()`, `sanitizePortfolioUrlInput()`.

### 3.2 Accessibility validation

- Confirm the link is **publicly accessible** (e.g. HEAD or GET).
- If not accessible, show: **“This link is not publicly accessible. Update
  sharing settings or use a public link.”**
- No silent failure: block save or show clear error.
- Single attempt per validation; no infinite retry.

**Implementation:** `linkValidation.ts` —
`validatePortfolioUrl({ checkAccessible: true })`, `checkLinkAccessibleCors()`.

### 3.3 Canonicalization

- **Google Workspace:** Normalize to canonical embed format (e.g. `/preview`).
- Store **original** URL and **embed URL** when different (`project_url`,
  `embed_url`, `normalized_url`).

**Implementation:** `linkUtils.ts` — `normalizeGoogleUrl()`; app stores
`embed_url` and `normalized_url` on insert/update.

---

## 4. Thumbnail Logic

### 4.1 Priority order

1. **If “Upload an image” is provided**
   - Use the uploaded image as the thumbnail.
   - **Skip** automatic thumbnail generation.
   - No background preview fetch for thumbnail purposes.

2. **If no custom image**
   - Generate thumbnail based on link target type (see below).
   - Thumbnail generation is **asynchronous**; failure must **not** block saving
     a valid link.

**Implementation:** `portfolio_items.image_url` = manual override; when set,
worker skips. See
`docs/architecture/portfolio/portfolio-thumbnail-generation.md`.

### 4.2 Automatic thumbnail rules (when no custom image)

| Type                      | Rule                                                            |
| ------------------------- | --------------------------------------------------------------- |
| Image URLs                | Use image directly (scaled/cropped to card dimensions).         |
| PDF                       | Generate thumbnail from page 1.                                 |
| DOC/DOCX                  | Convert server-side; thumbnail from first page.                 |
| PPT/PPTX                  | Convert server-side; thumbnail from first slide.                |
| XLS/XLSX                  | First-sheet thumbnail if supported; otherwise spreadsheet icon. |
| Google Docs/Sheets/Slides | Use provider embed preview or Open Graph image.                 |

### 4.3 Thumbnail requirements

- Generated **asynchronously** (worker or Edge Function).
- **Standardized** card dimensions.
- **Loading skeleton** while generating.
- **Deterministic fallback icon** if generation fails (e.g. “Preview
  unavailable”).
- **Thumbnail failure must not block saving** a valid link.

**Implementation:** Edge Function `generate-portfolio-thumbnail`; UI uses
`thumbnail_status` (pending/generated/failed) and fallback icon.

---

## 5. Preview Requirements

### 5.1 Modal behavior

Clicking a Portfolio item opens a **preview modal** that includes:

- **Title** (project title).
- **File type label** (e.g. PDF, Google Doc).
- **Open in new tab** (and optionally **Copy link**).

**Implementation:**
`src/components/portfolio/dialogs/PortfolioPreviewModal.tsx`,
`PortfolioPreviewDialogHeader`, `PortfolioPreviewMeta`.

### 5.2 Preview behavior by type

| Type                      | Preview behavior                                                               |
| ------------------------- | ------------------------------------------------------------------------------ |
| Images                    | Render full image.                                                             |
| PDF                       | Embedded scrollable viewer.                                                    |
| DOC/DOCX                  | Server-side converted preview (or Office Online embed if used).                |
| PPT/PPTX                  | Slide-based preview via conversion or embed.                                   |
| XLS/XLSX                  | First-sheet preview if supported; otherwise structured fallback with download. |
| Google Docs/Sheets/Slides | iframe embed when sharing allows.                                              |

**Implementation:** `previewUtils.ts` — `getPortfolioPreviewModel()`; modal
branches on `linkType` (image, pdf, google\_\*,
document/presentation/spreadsheet via Office embed or fallback).

### 5.3 Error states (canonical copy)

| Scenario                  | Message                                                     |
| ------------------------- | ----------------------------------------------------------- |
| Unsupported file type     | “This file type is not supported for preview.”              |
| Not publicly accessible   | “This link is not publicly accessible.”                     |
| Provider blocks embedding | “This content cannot be embedded. Open in new tab to view.” |
| Temporary failure         | “Preview temporarily unavailable. Try again later.”         |

**Implementation:** `PortfolioPreviewModal.tsx` — `ERROR_MESSAGES`; same strings
used in validation and thumbnail docs.

---

## 6. Global Requirements

- **Resume upload flow** remains separate and unchanged.
- **Portfolio links** never require uploading the linked file to WRDLNKDN.
- **Manual image override** always supersedes auto-thumbnail.
- **No generic error messages** — use the phrases in §5.3 and §3.
- **No infinite retry loops** — single or bounded retry for
  accessibility/thumbnail.
- **Structured logging** for preview and thumbnail failures (e.g. console/worker
  logs with url, type, error).

---

## 7. Acceptance Criteria (checklist)

- [ ] Portfolio links support defined file types and Google Workspace links.
- [ ] If a custom image is uploaded, it is always used as the thumbnail.
- [ ] If no custom image is uploaded, a thumbnail is generated automatically
      (where supported).
- [ ] All supported types open a working preview modal with title, type label,
      open/copy.
- [ ] Invalid or non-public links are blocked with clear messaging (§3.1, §3.2,
      §5.3).
- [ ] Behavior is consistent across Profile, Dashboard, and public views.

---

## 8. Current Implementation Notes

- **Link type & validation:** `linkUtils.getLinkType()`,
  `linkValidation.validatePortfolioUrl()` — used in AddProjectDialog and
  mutations.
- **URL-only link:** The Add Project flow uses a **project URL** only (no
  project file upload). Optional “Upload an image” is for the card thumbnail
  override only. Existing items with a storage `project_url` from before this
  change remain editable; delete still cleans up `project-sources` when
  applicable. Thumbnail and preview rules apply (manual image override >
  auto-thumbnail; preview by resolved type).
- **Thumbnail worker:** `portfolio-thumbnail-generation.md` and Edge Function
  `generate-portfolio-thumbnail`; optional `THUMBNAIL_SERVICE_URL` for
  PDF/Office/Google.
- **Preview modal:** `PortfolioPreviewModal` + `getPortfolioPreviewModel()`;
  Office types use `view.officeapps.live.com` embed when applicable.

---

## 9. Related Docs

- [Portfolio Thumbnail Generation](./portfolio-thumbnail-generation.md)
- [Portfolio Showcase](./portfolio-showcase.md)
- `src/lib/portfolio/linkUtils.ts` — types and canonicalization
- `src/lib/portfolio/linkValidation.ts` — validation and accessibility
- `src/lib/portfolio/previewUtils.ts` — preview model
