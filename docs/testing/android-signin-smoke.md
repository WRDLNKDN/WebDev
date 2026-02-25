# Android Sign-In Smoke Test

Quick manual checklist for validating OAuth sign-in behavior on Android devices.

## Scope

- Google sign-in from `/join`
- Callback handling at `/auth/callback`
- Recovery UX when callback/session stalls

## Devices

- Android Chrome (latest stable)
- Android in-app webview (if applicable to your distribution channel)

## Test Steps

1. Open `/join`.
2. Accept Terms and Community Guidelines.
3. Tap **Sign in with Google**.
4. Complete Google auth and return to app.
5. Confirm one of these outcomes:
   - Success path: app lands in Join flow or Feed without infinite spinner.
   - Recovery path: callback shows timeout guidance with **Try again**, **Back
     home**, and **Copy debug info**.
6. If recovery path appears, tap **Copy debug info** and paste into issue
   tracker.

## Pass Criteria

- No infinite loading spinner on callback screen.
- User can recover without force-closing app.
- Debug info copy works (or shows fallback message).

## Failure Signals

- Callback remains on spinner > 20 seconds with no actionable UI.
- Retry controls do not navigate.
- Sign-in loops repeatedly without entering Join or Feed.
