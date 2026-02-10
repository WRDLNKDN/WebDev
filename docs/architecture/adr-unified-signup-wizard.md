# ADR: Unified Signup Wizard Transition

**Status:** Accepted

**Date:** 2026-02

## Context

The previous signup flow used a fragmented sign-in gate. Users could land on a
standalone sign-in screen before entering the main flow, which caused drop-offs
and inconsistent conversion metrics. There was no single, state-driven path from
intent to completion.

## Decision

Migrate to a **5-step state-driven wizard**:

1. **Welcome** – Intro and entry point
2. **Identity** – Terms/guidelines acceptance and OAuth (Google/Microsoft)
3. **Values** – Join reasons and participation style
4. **Profile** – Display name and tagline
5. **Complete** – Confirmation and next steps

All steps are driven by client-side signup state (e.g. `SignupContext`), with
persistence where appropriate. "Create account" from the home page routes
directly into this wizard (Welcome step) instead of a separate sign-in gate.

## Consequences

- **Positive**
  - Improved conversion metrics from a single, linear flow
  - Clear consent and policy acceptance at Identity step
  - Consistent UX and fewer abandoned sessions
- **Negative / Trade-offs**
  - Increased complexity in client-side state management
  - Necessity for persistent consent tracking (e.g. policy version) and state
    verification (e.g. redirect to welcome if wizard state is empty) to avoid
    zombie sessions
