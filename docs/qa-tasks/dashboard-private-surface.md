Title: QA: Dashboard Surface – Private Control Surface Integrity

Type: Task

Parent Epic: EPIC: Home Dashboard (Profile-Centric Landing Experience) #103
Environment: UAT (webdev-uat.vercel.app)

---

## Goal

Validate that the Dashboard surface behaves as a private control surface and
does not expose edit capabilities to non-owners.

This QA verifies:

- Owner edit mode
- Non-owner read-only mode
- Route integrity
- Access control
- Session persistence

---

## Preconditions

1. Tester has:
   - A fully onboarded account (Owner)
   - A second fully onboarded account (Non-owner)
2. Both accounts are functional in UAT.

---

## Use Case 7A: Owner View – Edit Mode

Steps:

1. Log in as Account A.
2. Navigate to own profile.
3. Observe available controls.

Expected Behavior:

- Edit controls are visible.
- Portfolio add/reorder/remove available.
- Status editable.
- Music settings editable.
- Links editable.
- No permission errors.
- No console errors.

---

## Use Case 7B: Non-Owner View – Read Only

Steps:

1. Log in as Account B.
2. Navigate to Account A’s profile.

Expected Behavior:

- No edit controls visible.
- No portfolio modification controls.
- No status editing.
- No music modification controls.
- No ability to access private controls via DOM manipulation.
- No unauthorized data leakage.

---

## Use Case 7C: Direct Route Manipulation

Steps:

1. As Account B, attempt:
   - `/dashboard`
   - `/dashboard/profile`
   - Any edit route if it exists
   - Any owner-only route

Expected Behavior:

- Proper redirect OR access denied behavior.
- No exposure of owner controls.
- No console auth errors.
- No blank screen.

---

## Use Case 7D: Refresh Integrity

Steps:

1. While in edit mode as Owner, refresh page.

Expected Behavior:

- Remains authenticated.
- Remains in correct surface.
- No redirect loop.
- No temporary exposure of non-owner state.

---

## Use Case 7E: Sign Out State

Steps:

1. Sign out.
2. Navigate directly to `/dashboard` or owner profile edit route.

Expected Behavior:

- Redirect to `/join`.
- No edit controls rendered.
- No flicker of private state.

---

## Evidence to Capture

- Owner edit screenshot
- Non-owner view screenshot
- Direct route manipulation behavior
- Console logs if any errors

---

## Severity

High:

- Non-owner can edit
- Private controls exposed
- Unauthorized data visible
- Redirect loop

Medium:

- Incorrect mode detection
- Minor permission inconsistency

Low:

- Styling inconsistency without data exposure

---

## Pass Criteria

- Dashboard behaves as a true private control surface.
- Public view and owner view are clearly separated.
- Routing and access are deterministic.
- No leakage across auth boundaries.
