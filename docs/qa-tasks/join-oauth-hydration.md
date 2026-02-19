Title: QA: Join Flow – OAuth Redirect & Session Hydration Stability

Type: Task

Parent Epic: EPIC: Join (Authentication & Onboarding Surface) #85 Related
Surface: EPIC: Feed (Content & Activity Surface) #313 Environment: UAT
(webdev-uat.vercel.app)

---

## Goal

Validate that OAuth authentication, callback routing, and session hydration
behave deterministically across:

- Initial login
- Page refresh
- Manual navigation
- Direct URL entry

This QA ensures no redirect loops, no phantom unauthenticated states, and no
auth flicker.

---

## Preconditions

1. Tester has fresh test accounts.
2. Tester has fully onboarded account.
3. Tester has partially onboarded account.
4. Browser cache cleared or private window used.

---

## Use Case 3A: Successful OAuth → Correct Landing

Steps:

1. Navigate to `/join`.
2. Authenticate using Google or Microsoft.
3. Complete onboarding if required.

Expected Behavior:

- OAuth occurs once.
- No secondary provider prompt.
- No redirect back to Sign In.
- User lands on `/feed`.
- `Sign Out` visible.
- No flicker of unauthenticated UI.

---

## Use Case 3B: Refresh After Login

Steps:

1. Log in successfully.
2. Land on `/feed`.
3. Hard refresh page.

Expected Behavior:

- Session persists.
- No redirect to `/join`.
- No momentary flash of Welcome or Sign In.
- No console auth errors.
- UI renders authenticated state immediately.

---

## Use Case 3C: Direct URL Access While Authenticated

Steps:

1. Log in.
2. Manually navigate to `/join`.

Expected Behavior:

- Fully onboarded users are redirected away from `/join`.
- No onboarding steps reappear.
- No OAuth prompt appears again.

---

## Use Case 3D: Direct URL Access While Not Authenticated

Steps:

1. Fully sign out.
2. Navigate directly to `/feed`.

Expected Behavior:

- User is redirected to `/join`.
- No infinite redirect loop.
- No partial UI render of Feed.

---

## Use Case 3E: OAuth Callback Edge Case

Steps:

1. Begin OAuth.
2. Cancel at provider.
3. Return to app.

Expected Behavior:

- Clear error or graceful return to Sign In.
- No blank screen.
- No infinite spinner.
- No redirect loop.

---

## Regression Checks

- Test on Chrome (desktop)
- Test on Firefox (desktop)
- Test on mobile browser if possible
- Confirm behavior consistent across browsers

---

## Evidence to Capture

- Final URL after login
- Screenshot of authenticated Feed
- Screenshot of redirect behavior if triggered
- Console logs if errors occur

---

## Severity

High:

- Redirect loop between `/join` and `/feed`
- OAuth success but user returned to Sign In
- Session lost on refresh
- Blank screen

Medium:

- Minor flicker before auth state resolves
- Inconsistent redirect timing

Low:

- Minor UI delay without functional break

---

## Pass Criteria

Authentication is deterministic:

- Login works once
- Session persists
- Redirect rules are consistent
- No loops
- No phantom unauthenticated state
