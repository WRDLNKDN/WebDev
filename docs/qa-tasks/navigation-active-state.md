Title: QA: Navigation and Active State Integrity

Type: Task

Parent Epic: IA: Add Directory as Canonical Surface and Restore IA Parity #191
Environment: UAT (webdev-uat.vercel.app)

Priority: P1 Size: S Points: 3 Estimated Time: 6 hours

---

## Goal

Validate that primary navigation labels, routing, and active state highlighting
remain consistent with the canonical IA across:

- Signed-out users
- Authenticated users
- Direct URL entry
- Page refresh

This QA ensures users always understand where they are and can navigate without
confusion or legacy naming.

---

## Canonical IA Labels and Routes

Home → `/` Join → `/join` Feed → `/feed` Directory → `/directory` Profile →
`/profile/:handle` Dashboard → `/dashboard` (only if this surface exists as a
distinct route)

This QA validates parity with the canonical naming rules and active state
behavior.

---

## Preconditions

1. Tester has:
   - A fully onboarded account
   - A signed-out browser session
2. Use a private window for signed-out scenarios when needed.

---

## Use Case 9A: Signed-Out Primary Navigation

Steps:

1. Sign out fully.
2. Navigate to `/`.

Expected Behavior:

- Home is highlighted.
- Join is visible (if shown in nav for signed-out users).
- Feed, Directory, Dashboard are not shown or are not accessible.
- No legacy nav labels appear:
  - No "Signup"
  - No "Edit Signal"
  - No "Core Identity"

Evidence:

- Screenshot of signed-out nav.

---

## Use Case 9B: Signed-Out Active State per Route

Steps:

1. Navigate to `/`.
2. Navigate to `/join`.

Expected Behavior:

- On `/`, Home is highlighted.
- On `/join`, Join is highlighted.
- No flicker of authenticated nav items.

---

## Use Case 9C: Authenticated Primary Navigation

Steps:

1. Log in and land on an authenticated surface.
2. Observe nav labels.

Expected Behavior:

- Feed and Directory are visible.
- Profile navigation exists if implemented (link to `/profile/{self-handle}` or
  equivalent).
- Dashboard label appears only if it is a distinct surface.
- `Sign Out` is visible.

Evidence:

- Screenshot of authenticated nav.

---

## Use Case 9D: Authenticated Active State per Route

Steps:

1. Navigate to `/feed`.
2. Navigate to `/directory`.
3. Navigate to own profile route `/profile/{self-handle}`.
4. Navigate to `/dashboard` if it exists.

Expected Behavior:

- Feed highlighted on `/feed`.
- Directory highlighted on `/directory`.
- Profile highlighted on `/profile/:handle` when viewing own profile or any
  profile (policy must be consistent).
- Dashboard highlighted only for `/dashboard/*` routes if they exist.
- No incorrect active state, no double-highlight.

---

## Use Case 9E: Direct URL Entry and Refresh

Steps:

1. While authenticated, open a new tab directly to:
   - `/feed`
   - `/directory`
   - `/profile/{self-handle}`
2. Hard refresh on each.

Expected Behavior:

- Correct nav highlight persists after refresh.
- No temporary highlight of the wrong nav item.
- No redirect loops.

---

## Use Case 9F: Unauthorized Direct URL Entry

Steps:

1. Sign out.
2. Attempt direct navigation to:
   - `/feed`
   - `/directory`

Expected Behavior:

- Redirect to `/join`.
- Nav highlights Join.
- No partial render of authenticated nav.

---

## Evidence to Capture

- Screenshots of nav on each route
- Screen recording if flicker or mis-highlight occurs
- Console logs if errors appear

---

## Severity

High:

- Incorrect nav labels or legacy naming that misleads users
- Active state highlights the wrong surface
- Double-highlight or no-highlight across primary surfaces

Medium:

- Minor inconsistencies between signed-out and authenticated nav

Low:

- Cosmetic spacing issues

---

## Pass Criteria

- Nav labels match canonical IA.
- Active state highlighting matches current route.
- Signed-out users do not see authenticated nav.
- Direct URL and refresh do not break nav state.
- No legacy naming appears.
