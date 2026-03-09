import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  IdentityData,
  JoinState,
  JoinStep,
  ProfileData,
  ValuesData,
} from '../types/join';
import { POLICY_VERSION } from '../types/join';
import { JoinContext, type JoinContextValue } from './JoinContext';
import {
  JOIN_STORAGE_KEY,
  LEGACY_SIGNUP_STORAGE_KEY,
  loadJoinState,
  submitJoinRegistration,
} from './joinProviderUtils';

const STEPS: JoinStep[] = [
  'welcome',
  'identity',
  'values',
  'profile',
  'complete',
];

const initialState: JoinState = {
  currentStep: 'welcome',
  completedSteps: [],
  identity: null,
  values: null,
  profile: null,
};

type ExistingProfile = {
  display_name: string | null;
  tagline: string | null;
  join_reason: string[] | null;
  participation_style: string[] | null;
  additional_context: string | null;
  policy_version: string | null;
  marketing_email_enabled?: boolean;
  marketing_opt_in?: boolean;
  marketing_source?: string | null;
};

export const JoinProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<JoinState>(() =>
    loadJoinState(initialState),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(JOIN_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore localStorage write errors.
    }
  }, [state]);

  const setStep = useCallback((step: JoinStep) => {
    setState((s) => ({ ...s, currentStep: step }));
  }, []);

  const markComplete = useCallback((step: JoinStep) => {
    setState((s) =>
      s.completedSteps.includes(step)
        ? s
        : { ...s, completedSteps: [...s.completedSteps, step] },
    );
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
      return { ...s, currentStep: STEPS[Math.min(idx + 1, STEPS.length - 1)] };
    });
  }, []);

  const back = useCallback(() => {
    setState((s) => {
      const idx = STEPS.indexOf(s.currentStep);
      return { ...s, currentStep: STEPS[Math.max(idx - 1, 0)] };
    });
  }, []);

  const clearSubmitError = useCallback(() => setSubmitError(null), []);

  const resetSignup = useCallback(() => {
    setState(initialState);
    setSubmitting(false);
    setSubmitError(null);
    localStorage.removeItem(JOIN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SIGNUP_STORAGE_KEY);
  }, []);

  const reconcileWithExistingProfile = useCallback(
    (
      session: {
        user: {
          id: string;
          email?: string;
          identities?: { provider?: string }[];
          app_metadata?: { provider?: string };
        };
      },
      profile: ExistingProfile,
    ) => {
      const provider =
        session.user.identities?.[0]?.provider ??
        session.user.app_metadata?.provider ??
        'google';
      const identityProvider = provider === 'azure' ? 'microsoft' : 'google';

      const identity: IdentityData = {
        provider: identityProvider,
        userId: session.user.id,
        email: session.user.email ?? '',
        termsAccepted: true,
        guidelinesAccepted: true,
        policyVersion: profile.policy_version ?? POLICY_VERSION,
        timestamp: new Date().toISOString(),
      };

      const values: ValuesData = {
        joinReason: profile.join_reason ?? [],
        participationStyle: profile.participation_style ?? [],
        additionalContext: profile.additional_context ?? undefined,
      };

      const profileData: ProfileData = {
        displayName: profile.display_name ?? undefined,
        tagline: profile.tagline ?? undefined,
        marketingOptIn: Boolean(
          profile.marketing_email_enabled ?? profile.marketing_opt_in,
        ),
      };

      const completedSteps: JoinStep[] = ['identity'];
      if (
        (profile.join_reason?.length ?? 0) > 0 &&
        (profile.participation_style?.length ?? 0) > 0
      ) {
        completedSteps.push('values');
      }
      if (profile.display_name?.trim()) completedSteps.push('profile');

      let currentStep: JoinStep = 'welcome';
      if (
        (profile.join_reason?.length ?? 0) === 0 ||
        (profile.participation_style?.length ?? 0) === 0
      ) {
        currentStep = 'values';
      } else if (!(profile.display_name?.trim() ?? '')) {
        currentStep = 'profile';
      } else {
        currentStep = 'complete';
      }

      setState({
        currentStep,
        completedSteps: ['welcome', ...completedSteps],
        identity,
        values,
        profile: profileData,
      });
    },
    [],
  );

  const submitRegistration = useCallback(
    async (profileData?: ProfileData) => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        await submitJoinRegistration({
          state,
          profileData,
          markComplete,
          setState,
          setSubmitError,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [state, markComplete],
  );

  const value: JoinContextValue = useMemo(
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
      reconcileWithExistingProfile,
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
      reconcileWithExistingProfile,
      next,
      back,
    ],
  );

  return <JoinContext.Provider value={value}>{children}</JoinContext.Provider>;
};

export const SignupProvider = JoinProvider;
