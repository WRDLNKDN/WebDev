import { describe, expect, it } from 'vitest';
import { shouldAutoAdvanceIdentityStep } from '../../components/join/identity/identityStepNavigation';

describe('identityStepNavigation', () => {
  it('auto-advances on the first authenticated pass through step 2', () => {
    expect(shouldAutoAdvanceIdentityStep(['welcome', 'identity'])).toBe(true);
  });

  it('does not auto-advance when the user navigates back after completing step 3', () => {
    expect(
      shouldAutoAdvanceIdentityStep(['welcome', 'identity', 'values']),
    ).toBe(false);
  });
});
