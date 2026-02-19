Title: QA: Join Flow – Partial Profile Re-entry Resolution

Type: Task

Parent Epic: EPIC: Join (Authentication & Onboarding Surface) #85 Related
Surface: EPIC: Feed (Content & Activity Surface) #313 Environment: UAT
(webdev-uat.vercel.app)

---

## Goal

Validate that users with partially created profiles can re-enter the Join flow
and correctly resume onboarding without redirect loops, state-lock, or broken
routing.

This QA verifies reconciliation logic for accounts that:

- Successfully authenticated
- Have an existing profile row
- Are missing required onboarding fields

This test ensures the system handles "In-Progress" profiles deterministically.

Any failures must result in a new BUG work item, not edits to this QA ticket.

---

## Preconditions

1. Tester has access to UAT.
2. Tester has database access OR an account that previously dropped off
   mid-onboarding.
3. A test profile exists in one of the following partial states:

   Scenario A:

   - Profile row exists
   - Intent fields missing
   - Display name missing

   Scenario B:

   - Intent completed
   - Display name missing

   Scenario C:

   - Profile exists with minimal fields (id + email only)

4. Tester is fully signed out before beginning.

---

## Use Case 2A: Partial Profile – Missing Intent and Display Name

### Steps

1. Navigate to `/join`.

2. Authenticate using the test account (Google or Microsoft).

3. Observe routing behavior.

### Expected Behavior

- User is NOT routed to Welcome step.
- User is NOT routed to `/feed`.
- System performs reconciliation.
- User is routed directly to the first missing required onboarding step.
- No redirect loop occurs.
- No 400 or 403 errors appear.
- URL remains stable and correct for the onboarding step.
- No flicker of Feed before routing.

4. Complete required fields.
5. Submit onboarding.

### Final Expectation

- User lands on `/feed`.
- `Sign Out` visible.
- Refreshing `/feed` does not redirect back to `/join`.

---

## Use Case 2B: Partial Profile – Intent Complete, Missing Display Name

### Steps

1. Authenticate using a partially completed profile.
2. Observe which step loads.

### Expected Behavior

- System skips Intent step.
- User lands directly on Profile step.
- No duplicate steps shown.
- No ability to regress to Welcome unnecessarily.
- Submission completes normally.
- User lands on `/feed`.

---

## Use Case 2C: Minimal Profile Record (id + email only)

### Steps

1. Authenticate.
2. Observe routing.

### Expected Behavior

- System detects missing onboarding metadata.
- User is routed to the first required onboarding step.
- No blank screen.
- No state-lock.
- No console errors.
- No redirect loop between `/join` and `/feed`.

---

## Regression Checks

After successful completion:

1. Refresh `/feed`.

   - User remains authenticated.
   - No redirect to `/join`.

2. Navigate manually to `/join`.

   - Fully onboarded user is redirected away appropriately.
   - No onboarding steps reappear.

3. Confirm no duplicate OAuth prompts occur.

---

## Evidence to Capture

- Screenshot of initial routed step after login.
- Screenshot of final `/feed` landing.
- Screen recording if redirect loop occurs.
- Console logs if errors appear.

---

## Failure Conditions

High Severity:

- Redirect loop between `/join` and `/feed`
- 400 or 403 error during save
- Blank screen or stuck loading state
- Incorrect step routing
- OAuth re-prompt after successful authentication

Medium Severity:

- Step order incorrect but functional
- Validation inconsistency

Low Severity:

- Minor copy mismatch

---

## Pass Criteria

All partial profile scenarios:

- Resolve to the correct first missing onboarding step
- Allow completion
- Land user on `/feed`
- Persist session correctly after refresh

System must treat partial profiles as recoverable states, not edge-case
failures.
