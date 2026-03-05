export type MarketingConsentProfile = {
  marketing_email_enabled: boolean | null;
  marketing_push_enabled: boolean | null;
};

export function canSendMarketingEmail(
  profile: MarketingConsentProfile | null | undefined,
): boolean {
  return profile?.marketing_email_enabled === true;
}

export function canSendMarketingPush(
  profile: MarketingConsentProfile | null | undefined,
): boolean {
  return profile?.marketing_push_enabled === true;
}
