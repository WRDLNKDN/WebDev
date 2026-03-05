import type { Database } from '../../types/supabase';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

type PrivacyConsentRow = {
  marketing_email_enabled?: boolean | null;
  marketing_opt_in?: boolean | null;
};

export function resolveMarketingEmailEnabled(row: PrivacyConsentRow): boolean {
  if (typeof row.marketing_email_enabled === 'boolean') {
    return row.marketing_email_enabled;
  }
  return Boolean(row.marketing_opt_in);
}

export function buildMarketingEmailConsentUpdate(
  enabled: boolean,
  atIso: string = new Date().toISOString(),
): ProfileUpdate {
  return {
    marketing_email_enabled: enabled,
    marketing_opt_in: enabled,
    marketing_opt_in_timestamp: enabled ? atIso : null,
    marketing_source: enabled ? 'settings_privacy' : null,
    consent_updated_at: atIso,
  };
}

export function buildMarketingPushConsentUpdate(
  enabled: boolean,
  atIso: string = new Date().toISOString(),
): ProfileUpdate {
  return {
    marketing_push_enabled: enabled,
    consent_updated_at: atIso,
  };
}
