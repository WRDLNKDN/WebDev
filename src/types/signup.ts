export type SignupStep =
  | 'welcome'
  | 'identity'
  | 'values'
  | 'profile'
  | 'complete';

export type IdentityProvider = 'google' | 'microsoft';

/** Policy version string for Terms and Community Guidelines (e.g. v2026.02). */
export const POLICY_VERSION = 'v2026.02';

export type IdentityData = {
  provider: IdentityProvider;
  userId: string;
  email: string;
  termsAccepted: boolean;
  guidelinesAccepted: boolean;
  /** Version of policies accepted (e.g. v2026.02). */
  policyVersion: string;
  timestamp: string;
};

export type ValuesData = {
  joinReason: string[];
  participationStyle: string[];
  additionalContext?: string;
};

export type ProfileData = {
  displayName?: string;
  tagline?: string;
  avatar?: string;
};

export type SignupState = {
  currentStep: SignupStep;
  completedSteps: SignupStep[];
  identity: IdentityData | null;
  values: ValuesData | null;
  profile: ProfileData | null;
};

export const JOIN_REASONS = [
  'Meet builders',
  'Find mentorship',
  'Hire or get hired',
  'Show my work',
  'Make friends',
  'Other',
] as const;

export const PARTICIPATION_STYLES = [
  'Post and share updates',
  'Comment and support',
  'Join events',
  'DM and connect',
  'Mostly lurk',
] as const;
