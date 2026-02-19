Title: QA: Feed Surface Access Control and First Render Integrity

Type: Task

Parent Epic: EPIC: Feed (Content & Activity Surface) #313 Related Epic: EPIC:
Join (Authentication & Onboarding Surface) #85 Environment: UAT
(webdev-uat.vercel.app)

---

## Goal

Validate that the Feed surface:

- Is accessible only to authenticated users
- Renders correctly on first load without blank cards or empty posts
- Maintains session state on refresh
- Does not flicker for signed-out users

Any failures must be filed as new BUG or UXUE issues.

---

## Preconditions

1. Tester has:
   - A fully onboarded account
   - A signed-out browser session
2. Use private window for signed-out scenarios when needed.

---

## Use Case 5A: Signed-Out User Attempts Direct Access to Feed

Steps:

1. Sign out fully.
2. Navigate directly to `/feed`.

Expected Behavior:

- User is redirected to `/join`.
- No infinite redirect loop occurs.
- Feed content does not render, even briefly.
- No authenticated nav appears.

Evidence:

- Screenshot of redirect destination and visible nav.

---

## Use Case 5B: Authenticated User Loads Feed (Normal Entry)

Steps:

1. Authenticate and complete onboarding (if needed).
2. Land on `/feed`.

Expected Behavior:

- Feed loads successfully.
- Authenticated nav is present.
- `Sign Out` is visible.
- Feed displays posts or an intentional empty state.
- No blank post cards render.
- No “empty post” rows render.

Evidence:

- Screenshot of Feed render.

---

## Use Case 5C: Refresh Feed While Authenticated

Steps:

1. While on `/feed`, hard refresh the page.

Expected Behavior:

- User remains authenticated.
- No redirect to `/join`.
- No flicker of Welcome or Sign In.
- Feed re-renders correctly.
- No console errors.

Evidence:

- Screenshot after refresh.

---

## Use Case 5D: Feed Empty State Integrity

Steps:

1. Use an account with no posts visible (or temporarily hide content visibility
   if possible).
2. Load `/feed`.

Expected Behavior:

- Feed shows an intentional empty state message or layout.
- No placeholder posts render as empty cards.
- No layout break.

Evidence:

- Screenshot of empty state.

---

## Use Case 5E: Post Visibility and Toggle Integrity (If Implemented)

Steps:

1. Identify a post with visibility controls (if available).
2. Change visibility setting.
3. Reload Feed.

Expected Behavior:

- Visibility changes persist.
- Feed reflects correct visibility.
- No unauthorized post leakage occurs.

Note:

If visibility controls are not present in UI yet, mark as Not Applicable and do
not fail the test.

---

## Regression Checks

- Desktop Chrome
- Desktop Firefox
- Mobile browser if possible

---

## Evidence to Capture

- Screenshots of redirect behavior and Feed render
- Screen recording if flicker or loops occur
- Console logs if errors appear

---

## Severity

High:

- Signed-out user can view Feed content
- Redirect loop between `/feed` and `/join`
- Refresh logs user out unexpectedly
- Blank or corrupted Feed rendering

Medium:

- Empty posts render as blank cards
- Auth nav inconsistently appears

Low:

- Minor visual spacing issues

---

## Pass Criteria

- Feed is protected for signed-out users
- Authenticated Feed renders cleanly and deterministically
- Refresh preserves session and does not cause loops
- Empty state is intentional and stable
