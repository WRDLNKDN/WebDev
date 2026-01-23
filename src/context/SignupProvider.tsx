import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SignupContext, type SignupContextValue } from './SignupContext';
import type {
  SignupState,
  SignupStep,
  IdentityData,
  ValuesData,
  ProfileData,
} from '../types/signup';

const STORAGE_KEY = 'wrdlnkdn_signup_state';

const initialState: SignupState = {
  currentStep: 'welcome',
  completedSteps: [],
  identity: null,
  values: null,
  profile: null,
};

const loadSignupState = (): SignupState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as SignupState;
  } catch (err) {
    console.error('Failed to load signup state:', err);
  }
  return initialState;
};

const saveSignupState = (state: SignupState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save signup state:', err);
  }
};

export const SignupProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SignupState>(loadSignupState);

  useEffect(() => {
    saveSignupState(state);
  }, [state]);

  const value: SignupContextValue = useMemo(
    () => ({
      state,

      setIdentity: (data: IdentityData) => {
        setState((prev: SignupState) => ({ ...prev, identity: data }));
      },

      setValues: (data: ValuesData) => {
        setState((prev: SignupState) => ({ ...prev, values: data }));
      },

      setProfile: (data: ProfileData) => {
        setState((prev: SignupState) => ({ ...prev, profile: data }));
      },

      goToStep: (step: SignupStep) => {
        setState((prev: SignupState) => ({ ...prev, currentStep: step }));
      },

      completeStep: (step: SignupStep) => {
        setState((prev: SignupState) => ({
          ...prev,
          completedSteps: [
            ...prev.completedSteps.filter((s: SignupStep) => s !== step),
            step,
          ],
        }));
      },

      resetSignup: () => {
        setState(initialState);
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [state],
  );

  return (
    <SignupContext.Provider value={value}>{children}</SignupContext.Provider>
  );
};
