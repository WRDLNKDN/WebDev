import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type {
  IdentityData,
  ProfileData,
  SignupState,
  SignupStep,
  ValuesData,
} from '../types/signup';
import { SignupContext, type SignupContextValue } from './SignupContext';

const STEPS: SignupStep[] = [
  'welcome',
  'identity',
  'values',
  'profile',
  'complete',
];

const STORAGE_KEY = 'wrdlnkdn-signup-state';

const initialState: SignupState = {
  currentStep: 'welcome',
  completedSteps: [],
  identity: null,
  values: null,
  profile: null,
};

// Load state from localStorage
const loadState = (): SignupState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      console.log('📦 Loading signup state from localStorage:', saved);
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load signup state:', e);
  }
  return initialState;
};

export const SignupProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<SignupState>(loadState);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      console.log('💾 Saving signup state to localStorage:', state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save signup state:', e);
    }
  }, [state]);

  const setStep = useCallback((step: SignupStep) => {
    console.log('📍 Setting step to:', step);
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
      console.log('👤 Setting identity:', identity);
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
    console.log('🔄 Resetting signup state');
    setState(initialState);
    setSubmitting(false);
    setSubmitError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Accept profile data as parameter to avoid stale state
  const submitRegistration = useCallback(
    async (profileData?: ProfileData) => {
      setSubmitting(true);
      setSubmitError(null);

      try {
        if (!state.identity) throw new Error('Missing identity step data.');
        if (!state.values) throw new Error('Missing values step data.');

        // Use passed profile data or fall back to state
        const profile = profileData || state.profile;
        if (!profile) throw new Error('Missing profile step data.');
        if (!profile.displayName) throw new Error('Display name is required.');

        console.log('📝 Creating profile in database...');

        // Create URL-safe handle from display name
        const handle = profile.displayName.toLowerCase().replace(/\s+/g, '-');

        // Insert profile into database (schema: profiles baseline + policy_version)
        const { error: insertError } = await supabase.from('profiles').insert({
          id: state.identity.userId,
          email: state.identity.email,
          handle,
          display_name: profile.displayName,
          tagline: profile.tagline || null,
          join_reason: state.values.joinReason || [],
          participation_style: state.values.participationStyle || [],
          additional_context: state.values.additionalContext || null,
          status: 'pending',
          policy_version: state.identity.policyVersion || null,
        } as never);

        if (insertError) {
          console.error('❌ Profile insert error:', insertError);
          throw insertError;
        }

        console.log('✅ Profile created successfully');

        setState((s) => ({ ...s, currentStep: 'complete' }));
        markComplete('complete');
      } catch (e: unknown) {
        console.error('❌ Registration error:', e);
        setSubmitError(e instanceof Error ? e.message : 'Registration failed');
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [markComplete, state.identity, state.values, state.profile],
  );

  const value: SignupContextValue = useMemo(
    () => ({
      state,
      data: state,

      setStep,
      markComplete,

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
