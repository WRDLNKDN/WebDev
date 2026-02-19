Title: QA: Join Flow Baseline (Happy Path New User)

Type: Task

Parent Epic: EPIC: Join (Authentication & Onboarding Surface) #85 Related
Surface: EPIC: Feed (Content & Activity Surface) #313 Environment: UAT
(webdev-uat.vercel.app)

---

## Goal

Validate the baseline Join flow for a brand-new user from first arrival through
successful landing in Feed, using each OAuth provider.

This QA verifies the currently implemented Join flow. It does not propose UI
changes. Any gaps discovered must be raised as new issues, not modified inside
this ticket.

---

## Preconditions

1. Tester has access to UAT.
2. Tester has two fresh test accounts:
   - Google account with no existing WRDLNKDN profile
   - Microsoft account with no existing WRDLNKDN profile
3. Tester is fully signed out.
4. Browser cache cleared or use private window.

---

## Use Case 1A: New User Happy Path with Google OAuth

### Steps

1. Navigate to `/join`.

   - Confirm Welcome screen loads.
   - Confirm URL is `/join`.

2. Click `Create your profile`.

3. Sign In Step

   - Confirm Terms checkbox present.
   - Confirm Community Guidelines checkbox present.
   - Check both.
   - Click `Sign in with Google`.
   - Complete OAuth successfully.
   - Confirm user returns to `/join` and progresses to next step.

4. Intent Step

   - Confirm required sections enforce at least one selection.
   - Enter optional text.
   - Click `Continue`.

5. Profile Step

   - Confirm Public display name is required.
   - Enter valid display name.
   - Click `Submit`.

6. Post-submit Transition

   - Confirm splash/transition screen appears (if implemented).
   - Confirm transition completes automatically.

7. Landing

   - Confirm user lands at `/feed`.
   - Confirm authenticated nav is present.
   - Confirm `Sign Out` is visible.
   - Confirm no duplicate OAuth buttons are visible.

8. Refresh `/feed`.
   - User remains authenticated.
   - No redirect back to `/join`.
   - No redirect loop.

---

## Use Case 1B: New User Happy Path with Microsoft OAuth

Repeat Use Case 1A replacing:

- `Sign in with Google` with:
- `Sign in with Microsoft`

All expected results remain identical.

---

## Expected Results

1. `/join` is the single OAuth entry point.
2. OAuth occurs once and does not re-prompt after callback.
3. Required onboarding fields block progression until satisfied.
4. Submission completes without redirect loops.
5. User lands on `/feed` after onboarding.
6. No Feed flicker occurs before onboarding completion.
7. No duplicate OAuth providers appear outside Join.
8. Session persists after refresh.

---

## Evidence to Capture

- Screenshot of each step.
- Final authenticated Feed screen.
- Screen recording if redirect loop or flicker occurs.

---

## Severity Classification

High:

- Redirect loop
- Broken onboarding
- OAuth returns to Sign In
- Landing fails

Medium:

- Validation issues
- Incorrect routing state

Low:

- Minor copy or styling inconsistencies without functional impact
