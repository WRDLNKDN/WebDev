Title: QA: Home → Join Transition Integrity

Type: Task

Parent Epic: Epic - Home Pre-Signin Experience #314 Related Epic: EPIC: Join
(Authentication & Onboarding Surface) #85 Environment: UAT
(webdev-uat.vercel.app)

---

## Goal

Validate that the Home pre-signin experience transitions users into the Join
flow cleanly and deterministically.

This QA verifies:

- Home does not initiate OAuth directly
- Home routes users to `/join` as the single onboarding entry point
- No flicker of authenticated surfaces occurs for signed-out users
- Navigation state is correct across the transition

Any failures must be filed as new BUG or UXUE issues.

---

## Preconditions

1. Tester is fully signed out.
2. Browser cache cleared or use private window.
3. Tester has access to both:
   - A fresh account (never onboarded)
   - A fully onboarded account

---

## Use Case 4A: Signed-Out User Lands on Home

Steps:

1. Navigate to `/`.
2. Observe Home screen.

Expected Behavior:

- Home loads without errors.
- No authenticated navigation elements appear.
- No `Sign Out` appears.
- No flicker of Feed, Directory, or Dashboard.
- No OAuth provider buttons appear on Home.
- Home presents a single primary CTA to enter onboarding (example: Join Us).

Evidence:

- Screenshot of Home and visible CTAs.

---

## Use Case 4B: Home CTA Routes to Join

Steps:

1. From `/`, click the primary CTA that begins onboarding.
2. Observe routing.

Expected Behavior:

- User is routed to `/join`.
- URL updates to `/join`.
- Join Welcome screen renders correctly.
- No intermediate flash of `/feed`.

Evidence:

- Screenshot of `/join` Welcome screen after click.

---

## Use Case 4C: Back Navigation Integrity

Steps:

1. From `/join`, use browser Back.
2. Observe behavior.

Expected Behavior:

- User returns to `/`.
- Home renders correctly.
- No auth flicker.
- No broken state or console errors.

---

## Use Case 4D: Authenticated User Visits Home

Steps:

1. Log in fully and land on `/feed`.
2. Navigate to `/`.

Expected Behavior:

- Home loads in authenticated state without showing Join CTAs.
- Home does not show OAuth provider buttons.
- Navigation reflects authenticated state.
- No redirect loop occurs.

Note:

If product intent is to always redirect authenticated users away from Home,
record actual behavior and file a new work item if misaligned with intended
policy.

---

## Regression Checks

- Desktop Chrome
- Desktop Firefox
- Mobile browser if possible

---

## Evidence to Capture

- Screenshots for each use case
- Screen recording if flicker or redirect loops occur
- Console logs if any errors appear

---

## Severity

High:

- OAuth provider buttons appear on Home
- Clicking Home CTA does not route to `/join`
- Flicker of authenticated surfaces for signed-out users
- Redirect loop

Medium:

- Navigation active state incorrect
- CTA copy mismatch or multiple competing CTAs

Low:

- Minor spacing or styling issues without functional impact

---

## Pass Criteria

Home cleanly routes users into Join:

- Home is stable for signed-out users
- Only Join owns OAuth provider selection
- Home CTA routes to `/join`
- No flicker or loop behavior occurs
- Navigation state is consistent
