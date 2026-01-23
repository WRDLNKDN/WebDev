export type SignupStep =
  | 'welcome'
  | 'identity'
  | 'values'
  | 'profile'
  | 'complete';

export type IdentityProvider = 'google' | 'microsoft';

export type IdentityData = {
  provider: IdentityProvider;
  userId: string;
  email: string;
  termsAccepted: boolean;
  guidelinesAccepted: boolean;
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
