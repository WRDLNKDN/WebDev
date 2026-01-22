import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

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

  const setIdentity = (data: IdentityData) =>
    setState((prev) => ({ ...prev, identity: data }));

  const setValues = (data: ValuesData) =>
    setState((prev) => ({ ...prev, values: data }));

  const setProfile = (data: ProfileData) =>
    setState((prev) => ({ ...prev, profile: data }));

  const goToStep = (step: SignupStep) =>
    setState((prev) => ({ ...prev, currentStep: step }));

  const completeStep = (step: SignupStep) =>
    setState((prev) => ({
      ...prev,
      completedSteps: [...prev.completedSteps.filter((s) => s !== step), step],
    }));

  const resetSignup = () => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SignupContext.Provider
      value={{
        state,
        setIdentity,
        setValues,
        setProfile,
        goToStep,
        completeStep,
        resetSignup,
      }}
    >
      {children}
    </SignupContext.Provider>
  );
};

export const useSignup = (): SignupContextValue => {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error('useSignup must be used within SignupProvider');
  return ctx;
};
