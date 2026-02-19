Title: QA: Public Profile Rendering Consistency

Type: Task

Parent Epic: EPIC: Home Dashboard (Profile-Centric Landing Experience) #103
Environment: UAT (webdev-uat.vercel.app)

Priority: P1 Size: M Points: 8 Estimated Time: 16 hours

---

## Goal

Validate that the public profile surface (`/profile/:handle`) renders
consistently, securely, and deterministically for:

- Owner
- Authenticated non-owner
- Signed-out visitor

This QA verifies identity surface integrity and ensures no private data leakage.

---

## Preconditions

1. Two fully onboarded accounts exist:
   - Account A (Owner)
   - Account B (Non-owner)
2. Account A has:
   - Display name
   - Title
   - Bio
   - Portfolio items
   - Links
   - Status set (if implemented)
   - Music set (if implemented)

---

## Use Case 8A: Owner View of Profile

Steps:

1. Log in as Account A.
2. Navigate to `/profile/{accountA-handle}`.

Expected Behavior:

- Profile loads successfully.
- Edit controls visible.
- Portfolio reorder/remove visible.
- Links editable.
- Status editable.
- Music settings editable.
- No console errors.
- No redirect.

---

## Use Case 8B: Authenticated Non-Owner View

Steps:

1. Log in as Account B.
2. Navigate to `/profile/{accountA-handle}`.

Expected Behavior:

- Profile loads successfully.
- No edit controls visible.
- Portfolio viewable only.
- No private controls rendered.
- No hidden controls accessible via DOM inspection.
- No private data fields exposed.
- No console errors.

---

## Use Case 8C: Signed-Out Public View

Steps:

1. Sign out.
2. Navigate directly to `/profile/{accountA-handle}`.

Expected Behavior:

- Profile loads in public mode.
- No edit controls.
- No private metadata.
- No redirect to `/join` unless policy requires auth.
- No flash of authenticated UI.

---

## Use Case 8D: Invalid Handle

Steps:

1. Navigate to `/profile/nonexistenthandle`.

Expected Behavior:

- Proper 404 state or “Profile Not Found.”
- No crash.
- No blank screen.
- No console error.
- No redirect loop.

---

## Use Case 8E: Direct Route Manipulation

Steps:

1. As Account B, attempt to force edit mode via:
   - Query params
   - Direct route guessing
   - DevTools DOM manipulation

Expected Behavior:

- No unauthorized edit capability.
- No privilege escalation.
- No mutation endpoint accessible.

---

## Use Case 8F: Refresh Integrity

Steps:

1. Load `/profile/{accountA-handle}`.
2. Hard refresh.

Expected Behavior:

- Page rehydrates correctly.
- No redirect loop.
- No temporary exposure of private state.

---

## Evidence to Capture

- Owner view screenshot
- Non-owner view screenshot
- Signed-out view screenshot
- Invalid handle behavior screenshot
- Console logs if errors occur

---

## Severity

High:

- Non-owner can edit
- Private data exposed
- Invalid handle crashes page
- Redirect loop

Medium:

- Incorrect mode rendering
- Missing visibility boundary

Low:

- Minor styling inconsistencies

---

## Pass Criteria

- Public identity surface is stable.
- Owner and non-owner modes are correctly separated.
- No data leakage.
- No routing instability.
- Invalid handles handled gracefully.
