Title: QA: Global Error Handling and Safe Fail States

Type: Task

Parent Epic: Define and Implement Frontend to Backend API Layer for WRDLNKDN
Platform #137 Environment: UAT (webdev-uat.vercel.app)

Priority: P1 Size: M Points: 8 Estimated Time: 16 hours

---

## Goal

Validate that the application fails safely and predictably when common error
conditions occur, including:

- Route load failures
- API failures
- Auth failures
- Missing data
- Invalid routes

This QA ensures users see an intentional error state instead of:

- White screen
- Infinite spinner
- Console-only errors
- Redirect loops

---

## Preconditions

1. Tester has:
   - A fully onboarded account
   - A signed-out browser session
2. DevTools access available to simulate network failures.

---

## Use Case 12A: Invalid Route Handling

Steps:

1. Navigate to a clearly invalid URL:
   - `/thisdoesnotexist`

Expected Behavior:

- 404 page or “Not Found” state renders.
- No crash.
- No infinite redirect loop.
- Clear path to Home or Join.

---

## Use Case 12B: Profile Not Found Handling

Steps:

1. Navigate to:
   - `/profile/nonexistenthandle`

Expected Behavior:

- Profile Not Found renders.
- No crash.
- No blank screen.
- No console errors beyond expected.

---

## Use Case 12C: Simulated API Failure on Authenticated Route

Steps:

1. Log in.
2. Navigate to `/feed` or `/directory`.
3. In DevTools, set Network to Offline.
4. Refresh page.

Expected Behavior:

- User sees a safe error state or offline message.
- No white screen.
- No infinite spinner.
- No redirect loop to `/join`.

---

## Use Case 12D: API Timeout / Slow Network

Steps:

1. In DevTools, throttle to Slow 3G.
2. Load `/feed`.

Expected Behavior:

- Loading state is intentional.
- Loading does not hang indefinitely.
- If timeout is implemented, user sees a retry option.

---

## Use Case 12E: Auth Error Safe Handling

Steps:

1. Log in.
2. Clear site storage or remove auth tokens.
3. Refresh on a protected route.

Expected Behavior:

- Clean redirect to `/join`.
- No loop.
- No partial protected content exposure.

---

## Use Case 12F: Refresh Safety for App Root

Steps:

1. Navigate to:
   - `/`
   - `/join`
   - `/feed`
   - `/directory`
2. Hard refresh on each route.

Expected Behavior:

- Page rehydrates without errors.
- No runtime exceptions.
- Correct route loads.
- Correct nav state renders.

---

## Evidence to Capture

- Screenshots of each error state
- Console logs when failures occur
- Network tab capture when offline or throttled

---

## Severity

High:

- White screen / blank page
- Infinite spinner without fallback
- Redirect loop caused by error
- Protected data exposed during error

Medium:

- Missing retry path
- Confusing error copy

Low:

- Styling issues in error UI

---

## Pass Criteria

- Invalid routes and missing content show safe error states.
- Offline or failed API calls do not crash the app.
- Auth failures redirect deterministically.
- Refresh does not trigger runtime errors across core routes.
