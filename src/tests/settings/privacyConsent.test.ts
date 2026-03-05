import { describe, expect, it } from 'vitest';
import {
  buildMarketingEmailConsentUpdate,
  buildMarketingPushConsentUpdate,
  resolveMarketingEmailEnabled,
} from '../../lib/settings/privacyConsent';

describe('privacyConsent', () => {
  it('builds email marketing consent update payload when enabled', () => {
    const at = '2026-03-05T12:00:00.000Z';
    expect(buildMarketingEmailConsentUpdate(true, at)).toEqual({
      marketing_email_enabled: true,
      marketing_opt_in: true,
      marketing_opt_in_timestamp: at,
      marketing_source: 'settings_privacy',
      consent_updated_at: at,
    });
  });

  it('builds email marketing consent update payload when disabled', () => {
    const at = '2026-03-05T12:00:00.000Z';
    expect(buildMarketingEmailConsentUpdate(false, at)).toEqual({
      marketing_email_enabled: false,
      marketing_opt_in: false,
      marketing_opt_in_timestamp: null,
      marketing_source: null,
      consent_updated_at: at,
    });
  });

  it('builds push marketing consent update payload', () => {
    const at = '2026-03-05T12:00:00.000Z';
    expect(buildMarketingPushConsentUpdate(false, at)).toEqual({
      marketing_push_enabled: false,
      consent_updated_at: at,
    });
  });

  it('prefers marketing_email_enabled when present', () => {
    expect(
      resolveMarketingEmailEnabled({
        marketing_email_enabled: true,
        marketing_opt_in: false,
      }),
    ).toBe(true);
  });

  it('falls back to legacy marketing_opt_in when needed', () => {
    expect(
      resolveMarketingEmailEnabled({
        marketing_opt_in: true,
      }),
    ).toBe(true);
  });
});
