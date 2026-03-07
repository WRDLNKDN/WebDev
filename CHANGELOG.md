# Changelog

All notable changes to the project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- **Dashboard modals – combo box ghosted/overlapping text**

  - Add Links modal: Category and Platform selects now show a single clear
    value/placeholder (no ghosted or duplicated text).
  - Edit Profile modal: Industry and Sub-industry selects and Autocomplete now
    render without overlapping text.
  - Fix applied via shared `dialogSelectSx` (hide native input used for form
    value so only the custom display is visible) and Edit Profile `INPUT_STYLES`
    (hide `input[aria-hidden="true"]`). Sub-industry Autocomplete uses a single
    placeholder source to avoid duplicate placeholder text.

- **Add Links modal – duplicate plus icon**

  - "+ Add to List" button now shows a single plus: label set to `+ Add to List`
    and `startIcon` removed to prevent duplicate plus from icon + label.

- **Dashboard Portfolio – Resume card**
  - Resume card now shows a right-aligned trash (delete) icon in the action row
    with "View Document" (and "Retry Preview" when applicable), consistent with
    Project cards.
  - Retry Preview: allowed for PDF as well as Word documents; button is hidden
    when the error indicates the file type is not supported for preview, with
    message "Preview not available for this file type."
  - Retry triggers a real re-attempt (new request) and UI state updates after
    fetch; "Retrying…" shown while the request is in progress.

### Added

- **E2E**

  - Dashboard resume delete spec un-skipped: profile route is registered after
    `stubAppSurface` so the stub with `resume_url` wins; stub includes `socials`
    and `industries`; Portfolio section is located via `getByText('PORTFOLIO')`.

- **UAT checklist**
  - `docs/testing/UAT_CHECKLIST.md` – checklist for sign-off of Dashboard modal
    and Resume card fixes across supported OS and browsers.
