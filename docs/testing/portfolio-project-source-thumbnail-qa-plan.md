# Portfolio Project Source + Thumbnail QA Test Plan

## Scope

Validate that New Project enforces exactly one primary source, generates
thumbnails reliably, supports optional thumbnail override behavior, and provides
clear validation/guidance.

## Environments

- UAT
- Prod

## Platforms

- Mac
- PC

## Browsers

- Chrome
- Firefox
- Safari
- Edge

## Viewport

- Size M
- Spot check XS/S if the modal is responsive

## Test Data to Prepare

- Small PNG under limit
- JPG under limit
- WEBP under limit
- PDF with visible first page
- Oversized image above supported limit
- Public image URL
- Public PDF/doc URL if supported
- Public video/rich media URL if supported
- A source that cannot generate preview
- Optional custom thumbnail image under limit

## Core Areas to Verify

1. Project Source requires exactly one option
2. Auto thumbnail generation works
3. Optional thumbnail overrides generated thumbnail
4. Fallback thumbnail appears when generation fails
5. Oversized upload guidance is clear
6. Labels/helper text are updated and accurate

## Test Cases

### 1) Modal labels and structure

#### Steps

- Open New Project modal

#### Expected

- `Cover Media` is no longer shown
- Field is renamed to `Upload optional thumbnail` (or equivalent)
- Helper text explains optional + override behavior
- A clear `Project Source` section is present
- Member can choose Upload File or Project URL

### 2) Submit with neither file nor URL

#### Steps

- Open New Project
- Leave file empty
- Leave Project URL empty
- Fill other required fields
- Try to save

#### Expected

- Save is blocked
- Inline validation explains file or URL is required
- Validation appears in source context (not disconnected global-only error)

### 3) Submit with file only

#### Steps

- Open New Project
- Select Upload File
- Upload small PNG
- Leave Project URL empty
- Save

#### Expected

- Save succeeds
- Project is created
- PNG thumbnail is automatically generated/rendered
- No URL is required

### 4) Submit with URL only

#### Steps

- Open New Project
- Select Project URL
- Paste valid supported public URL
- Leave file empty
- Save

#### Expected

- Save succeeds
- Project is created
- System attempts thumbnail generation from URL
- If supported, preview renders
- No file is required

### 5) Try to use both file and URL

#### Steps

- Upload a file
- Then enter a Project URL

#### Expected

- One source is deactivated, disabled, or cleared
- Both cannot remain active/populated
- UX clearly communicates one source only

### 6) URL first, then file

#### Steps

- Enter valid Project URL
- Then upload a file

#### Expected

- URL is cleared or disabled
- File becomes active source
- No state conflict remains

### 7) File first, then URL

#### Steps

- Upload valid file
- Then enter URL

#### Expected

- File is cleared or disabled
- URL becomes active source
- No state conflict remains

### 8) PNG thumbnail generation

#### Steps

- Upload simple PNG
- Save
- View in portfolio render surfaces

#### Expected

- Thumbnail is generated without extra steps
- Thumbnail appears consistently
- No blank preview

### 9) JPG/JPEG thumbnail generation

#### Steps

- Upload JPG/JPEG
- Save

#### Expected

- Thumbnail generates and renders correctly

### 10) WEBP thumbnail generation

#### Steps

- Upload WEBP
- Save

#### Expected

- Thumbnail generates and renders correctly

### 11) PDF first-page thumbnail generation

#### Steps

- Upload PDF with obvious first page
- Save

#### Expected

- First-page preview thumbnail is generated
- Preview appears in portfolio surfaces

### 12) Supported public URL preview generation

#### Steps

- Enter supported public image/doc/video URL
- Save

#### Expected

- System attempts preview extraction
- Generated preview appears if supported

### 13) Unsupported/unresolvable URL preview

#### Steps

- Enter URL that cannot generate a preview
- Save

#### Expected

- Project still saves when URL is valid/allowed
- Deterministic fallback thumbnail appears
- No blank/broken preview

### 14) Fallback thumbnail behavior

#### Steps

- Use source known not to generate preview
- Save

#### Expected

- Fallback thumbnail appears
- Fallback is appropriate by type
- No empty/broken placeholder

### 15) Optional thumbnail is not required

#### Steps

- Create project with file only
- Do not upload optional thumbnail
- Save

#### Expected

- Save succeeds
- Generated thumbnail or fallback is used

### 16) Optional custom thumbnail override with file source

#### Steps

- Upload project file
- Upload optional thumbnail
- Save

#### Expected

- Project saves
- Custom thumbnail overrides generated thumbnail everywhere

### 17) Optional custom thumbnail override with URL source

#### Steps

- Enter valid Project URL
- Upload optional thumbnail
- Save

#### Expected

- Project saves
- Custom thumbnail overrides generated/extracted preview everywhere

### 18) Remove custom thumbnail later

#### Steps

- Edit existing project with custom thumbnail override
- Remove custom thumbnail
- Save

#### Expected

- System falls back to generated thumbnail
- If no generated thumbnail exists, falls back to default preview
- No stale old thumbnail remains

### 19) Oversized file validation

#### Steps

- Upload oversized source above limit

#### Expected

- Clear actionable guidance (resize/compress/convert/export smaller)
- Error is inline with file field
- No vague generic failure

### 20) Oversized optional thumbnail validation

#### Steps

- Upload oversized custom thumbnail

#### Expected

- Clear inline validation at thumbnail field
- Guidance explains how to reduce size
- Error clears after valid replacement file

### 21) Error clearing behavior

#### Steps

- Trigger invalid file/URL/source-combination error
- Correct issue

#### Expected

- Error clears after correction
- No stale validation remains

### 22) Helper text accuracy

#### Steps

- Review source/thumbnail helper text

#### Expected

- Thumbnail copy says optional
- Source copy explains one-source-only
- No outdated `Cover Media` wording
- No implication that both file + URL are expected

### 23) Edit existing project

#### Steps

- Edit a file-source project
- Edit a URL-source project
- Switch source type if allowed

#### Expected

- Existing source loads correctly
- Mutual exclusivity enforced
- Thumbnail behavior remains correct
- No duplicate source data saved

### 24) Portfolio render surfaces

#### Steps

- Validate in:
  - Dashboard
  - Profile
  - Portfolio showcase/carousel
  - Project detail modal/page (if present)

#### Expected

- Thumbnail is consistent everywhere
- Custom override wins everywhere
- Fallback is consistent
- No broken images

### 25) Cross-browser sanity

Repeat key cases in:

- Chrome
- Firefox
- Safari
- Edge

#### Expected

- Same validation behavior
- Same exclusivity behavior
- Same thumbnail outcome

## Pass / Fail Summary

### Pass if

- Exactly one source is required/enforced
- File and URL cannot coexist
- Thumbnail generation works for supported media
- Fallback works when generation fails
- Optional override works everywhere
- Errors are inline, actionable, and clear correctly
- Labels/helper text reflect real rules

### Fail if

- Both file + URL can be active together
- Neither source is blocked incorrectly
- PNG upload fails to generate thumbnail
- Optional thumbnail feels required
- Old `Cover Media` wording remains
- Errors appear only globally without field context
- Blank/broken preview appears instead of generated/fallback

## Suggested Bug Titles

- New Project allows both file source and Project URL simultaneously
- New Project allows submit with no primary source selected
- PNG upload does not generate thumbnail in Portfolio
- Optional thumbnail does not override generated preview
- Removing custom thumbnail does not restore generated/fallback thumbnail
- Unsupported source renders blank preview instead of fallback thumbnail
- Oversized upload error lacks actionable compression guidance
- Thumbnail/source validation renders as global modal error instead of inline
  field error
