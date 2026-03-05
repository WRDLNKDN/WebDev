import { describe, expect, it } from 'vitest';
import {
  canSendMarketingEmail,
  canSendMarketingPush,
} from '../../../backend/lib/marketingConsent';

describe('marketingConsent guards', () => {
  it('allows marketing email only when marketing_email_enabled is true', () => {
    expect(
      canSendMarketingEmail({
        marketing_email_enabled: true,
        marketing_push_enabled: false,
      }),
    ).toBe(true);
    expect(
      canSendMarketingEmail({
        marketing_email_enabled: false,
        marketing_push_enabled: true,
      }),
    ).toBe(false);
  });

  it('allows marketing push only when marketing_push_enabled is true', () => {
    expect(
      canSendMarketingPush({
        marketing_email_enabled: false,
        marketing_push_enabled: true,
      }),
    ).toBe(true);
    expect(
      canSendMarketingPush({
        marketing_email_enabled: true,
        marketing_push_enabled: false,
      }),
    ).toBe(false);
  });

  it('denies by default when profile is missing', () => {
    expect(canSendMarketingEmail(null)).toBe(false);
    expect(canSendMarketingPush(undefined)).toBe(false);
  });
});
