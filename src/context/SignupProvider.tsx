import { useEffect, useState, type ReactNode } from 'react';
import { SignupContext } from './SignupContext';

import type {
  SignupState,
  SignupStep,
  IdentityData,
  ValuesData,
  ProfileData,
} from '../types/signup';

// ======================================================
// Constants (not exported)
// ======================================================

const STORAGE_KEY = 'wrdlnkdn_signup_state';

const initialState: SignupState = {
  currentStep: 'welcome',
  completedSteps: [],
  identity: null,
  values: null,
  profile: null,
};

// ======================================================
// Helpers (not exported)
// ======================================================

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

// ======================================================
// Provider (export only component)
// ======================================================

export const SignupProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SignupState>(loadSignupState);

  useEffect(() => {
    saveSignupState(state);
  }, [state]);

  const setIdentity = (data: IdentityData) => {
    setState((prev) => ({ ...prev, identity: data }));
  };

  const setValues = (data: ValuesData) => {
    setState((prev) => ({ ...prev, values: data }));
  };

  const setProfile = (data: ProfileData) => {
    setState((prev) => ({ ...prev, profile: data }));
  };

  const goToStep = (step: SignupStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const completeStep = (step: SignupStep) => {
    setState((prev) => ({
      ...prev,
      completedSteps: [...prev.completedSteps.filter((s) => s !== step), step],
    }));
  };

  const resetSignup = () => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = {
    state,
    setIdentity,
    setValues,
    setProfile,
    goToStep,
    completeStep,
    resetSignup,
  };

  return (
    <SignupContext.Provider value={value}>{children}</SignupContext.Provider>
  );
};

export default SignupProvider;
