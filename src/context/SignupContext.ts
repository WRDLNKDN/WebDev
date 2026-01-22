import { createContext } from 'react';
import type {
  SignupState,
  SignupStep,
  IdentityData,
  ValuesData,
  ProfileData,
} from '../types/signup';

export interface SignupContextValue {
  state: SignupState;
  setIdentity: (data: IdentityData) => void;
  setValues: (data: ValuesData) => void;
  setProfile: (data: ProfileData) => void;
  goToStep: (step: SignupStep) => void;
  completeStep: (step: SignupStep) => void;
  resetSignup: () => void;
}

export const SignupContext = createContext<SignupContextValue | undefined>(
  undefined,
);
