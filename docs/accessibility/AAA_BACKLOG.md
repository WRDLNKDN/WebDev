# AAA Accessibility Backlog

Track AAA (WCAG 2.x AAA) findings surfaced by the automated sweep in
`src/tests/e2e/accessibility.spec.ts`.

## How to use

- Keep AA issues out of this file; AA is treated as a release blocker.
- Use this for AAA-only polish and readability improvements.
- Update `Status`, `Owner`, and `Target Sprint` during triage.

## Current items

### AAA-001

- **Surface:** `/join`
- **Rule:** `color-contrast-enhanced`
- **Finding:** Some helper and label text in Join flow does not meet 7:1 in some
  states/themes.
- **Proposed fix:** Continue contrast token hardening for low-emphasis text and
  verify against hero overlays.
- **Priority:** `P2`
- **Owner:** `UX`
- **Status:** `In progress`
- **Target Sprint:** `TBD`

### AAA-002

- **Surface:** `/community-partners`
- **Rule:** `color-contrast-enhanced`
- **Finding:** Partner CTA/body combinations still have edge contrast misses
  under AAA thresholds.
- **Proposed fix:** Tighten card text and button contrast tokens, then retest in
  dark/colorblind simulations.
- **Priority:** `P2`
- **Owner:** `UX`
- **Status:** `In progress`
- **Target Sprint:** `TBD`

## Definition of done for each item

- Issue no longer appears in nightly accessibility run logs.
- Rule passes on both:
  - route sweep (`Project route sweep accessibility`)
  - colorblindness simulation smoke test
- Visual review confirms no brand regression from contrast updates.
