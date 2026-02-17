import { createContext } from 'react';
import type {
  SignupState,
  SignupStep,
  IdentityData,
  ValuesData,
  ProfileData,
} from '../types/signup';

export type SignupContextValue = {
  // Primary state
  state: SignupState;

  // Backwards compatible alias used by some components
  data: SignupState;

  // Navigation
  setStep: (step: SignupStep) => void;
  goToStep: (step: SignupStep) => void;

  // Completion helpers
  markComplete: (step: SignupStep) => void;
  completeStep: (step: SignupStep) => void;

  // Setters
  setIdentity: (identity: IdentityData) => void;
  setValues: (values: ValuesData) => void;
  setProfile: (profile: ProfileData) => void;

  // Submission
  submitting: boolean;
  submitError: string | null;
  clearSubmitError: () => void;
  submitRegistration: (profileData?: ProfileData) => Promise<void>;

  // Reset
  resetSignup: () => void;

  /** Reconcile state with existing partial profile (gap analysis → set currentStep to first missing). */
  reconcileWithExistingProfile: (
    session: {
      user: {
        id: string;
        email?: string;
        identities?: { provider?: string }[];
        app_metadata?: { provider?: string };
      };
    },
    profile: {
      display_name: string | null;
      tagline: string | null;
      join_reason: string[] | null;
      participation_style: string[] | null;
      additional_context: string | null;
      policy_version: string | null;
      marketing_opt_in?: boolean;
      marketing_source?: string | null;
    },
  ) => void;

  // Convenience
  next: () => void;
  back: () => void;
};

export const SignupContext = createContext<SignupContextValue | null>(null);
