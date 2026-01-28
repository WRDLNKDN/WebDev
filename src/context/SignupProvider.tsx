import { useCallback, useMemo, useState } from 'react';
import type {
  SignupState,
  SignupStep,
  IdentityData,
  ValuesData,
  ProfileData,
} from '../types/signup';
import { SignupContext, type SignupContextValue } from './SignupContext';

const STEPS: SignupStep[] = [
  'welcome',
  'identity',
  'values',
  'profile',
  'complete',
];

const initialState: SignupState = {
  currentStep: 'welcome',
  completedSteps: [],
  identity: null,
  values: null,
  profile: null,
};

export const SignupProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<SignupState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setStep = useCallback((step: SignupStep) => {
    setState((s) => ({ ...s, currentStep: step }));
  }, []);

  const markComplete = useCallback((step: SignupStep) => {
    setState((s) => {
      if (s.completedSteps.includes(step)) return s;
      return { ...s, completedSteps: [...s.completedSteps, step] };
    });
  }, []);

  const setIdentity = useCallback(
    (identity: IdentityData) => {
      setState((s) => ({ ...s, identity }));
      markComplete('identity');
    },
    [markComplete],
  );

  const setValues = useCallback(
    (values: ValuesData) => {
      setState((s) => ({ ...s, values }));
      markComplete('values');
    },
    [markComplete],
  );

  const setProfile = useCallback(
    (profile: ProfileData) => {
      setState((s) => ({ ...s, profile }));
      markComplete('profile');
    },
    [markComplete],
  );

  const next = useCallback(() => {
    setState((s) => {
      const idx = STEPS.indexOf(s.currentStep);
      const nextStep = STEPS[Math.min(idx + 1, STEPS.length - 1)];
      return { ...s, currentStep: nextStep };
    });
  }, []);

  const back = useCallback(() => {
    setState((s) => {
      const idx = STEPS.indexOf(s.currentStep);
      const prevStep = STEPS[Math.max(idx - 1, 0)];
      return { ...s, currentStep: prevStep };
    });
  }, []);

  const resetSignup = useCallback(() => {
    setState(initialState);
    setSubmitting(false);
    setSubmitError(null);
  }, []);

  const submitRegistration = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Keep this lightweight for now. Wire Supabase insert here later.
      if (!state.identity) throw new Error('Missing identity step data.');
      if (!state.values) throw new Error('Missing values step data.');

      setState((s) => ({ ...s, currentStep: 'complete' }));
      markComplete('complete');
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }, [markComplete, state.identity, state.values]);

  const value: SignupContextValue = useMemo(
    () => ({
      state,
      data: state,

      // canonical names
      setStep,
      markComplete,

      // aliases expected by your components
      goToStep: setStep,
      completeStep: markComplete,

      setIdentity,
      setValues,
      setProfile,

      submitting,
      submitError,
      submitRegistration,

      resetSignup,

      next,
      back,
    }),
    [
      state,
      setStep,
      markComplete,
      setIdentity,
      setValues,
      setProfile,
      submitting,
      submitError,
      submitRegistration,
      resetSignup,
      next,
      back,
    ],
  );

  return (
    <SignupContext.Provider value={value}>{children}</SignupContext.Provider>
  );
};
