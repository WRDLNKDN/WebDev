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

/** Persists wizard state so refresh at any step (e.g. Values) restores progress. */
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

  // Persist to localStorage on every state change so refresh does not lose step/data
  useEffect(() => {
    try {
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

  const clearSubmitError = useCallback(() => {
    setSubmitError(null);
  }, []);

  const resetSignup = useCallback(() => {
    console.log('🔄 Resetting signup state');
    setState(initialState);
    setSubmitting(false);
    setSubmitError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /** Map Supabase/backend errors to user-facing messages. */
  const toFriendlyMessage = useCallback(
    (err: { code?: string; message?: string; details?: string }): string => {
      const code = err.code;
      const msg = (err.message ?? '').toLowerCase();
      const details = (err.details ?? '').toLowerCase();

      if (
        code === '42501' ||
        msg.includes('policy') ||
        msg.includes('row level security')
      ) {
        return 'You must be signed in to submit. Please sign in again and try again.';
      }
      if (code === '23505') {
        if (
          msg.includes('pkey') ||
          msg.includes('primary') ||
          details.includes('id') ||
          msg.includes('profiles_pkey')
        ) {
          return 'You already have a profile. Go to Feed or Directory to get started.';
        }
        return 'That display name is already taken. Try a different display name.';
      }
      if (code === '23502') {
        return 'Required profile data is missing. Please fill in display name and try again.';
      }
      if (code === '23503') {
        return 'Your session may have expired. Please sign in again and try again.';
      }
      if (err.message && err.message.length > 0 && err.message.length < 200) {
        return err.message;
      }
      return 'Registration failed. Please try again.';
    },
    [],
  );

  // Accept profile data as parameter to avoid stale state
  const submitRegistration = useCallback(
    async (profileData?: ProfileData) => {
      setSubmitting(true);
      setSubmitError(null);

      try {
        if (!state.identity) throw new Error('Missing identity step data.');
        if (!state.values) throw new Error('Missing values step data.');

        const profile = profileData || state.profile;
        if (!profile) throw new Error('Missing profile step data.');
        if (!profile.displayName?.trim())
          throw new Error('Display name is required.');

        console.log('📝 Creating profile in database...');

        // Check if user already has a profile (avoids generic 23505 and gives clear message)
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', state.identity.userId)
          .maybeSingle();

        if (existing) {
          throw new Error(
            'You already have a profile. Go to Feed or Directory to get started.',
          );
        }

        const baseHandle =
          profile.displayName
            .trim()
            .toLowerCase()
            .replace(/\W+/g, '')
            .replace(/^-|-$/g, '') || 'user';
        const handle = baseHandle;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: state.identity.userId,
              email: state.identity.email,
              handle: attempts === 0 ? handle : `${handle}${attempts}`,
              display_name: profile.displayName.trim(),
              tagline: profile.tagline?.trim() || null,
              join_reason: state.values.joinReason || [],
              participation_style: state.values.participationStyle || [],
              additional_context:
                state.values.additionalContext?.trim() || null,
              status: 'pending',
              policy_version: state.identity.policyVersion || null,
            } as never);

          if (!insertError) {
            console.log('✅ Profile created successfully');
            setState((s) => ({ ...s, currentStep: 'complete' }));
            markComplete('complete');
            return;
          }

          if (insertError.code === '23505') {
            const friendly = toFriendlyMessage(insertError);
            if (friendly.includes('already have a profile')) {
              throw new Error(friendly);
            }
            attempts += 1;
            continue;
          }

          console.error('❌ Profile insert error:', insertError);
          throw new Error(toFriendlyMessage(insertError));
        }

        throw new Error(
          'That display name is already taken. Try a different display name.',
        );
      } catch (e: unknown) {
        console.error('❌ Registration error:', e);
        const msg =
          e instanceof Error
            ? e.message
            : 'Registration failed. Please try again.';
        setSubmitError(msg);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [
      markComplete,
      state.identity,
      state.values,
      state.profile,
      toFriendlyMessage,
    ],
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
      clearSubmitError,
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
      clearSubmitError,
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
