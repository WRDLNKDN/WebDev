import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type {
  IdentityData,
  ProfileData,
  SignupState,
  SignupStep,
  ValuesData,
} from '../types/signup';
import { POLICY_VERSION } from '../types/signup';
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

  type ExistingProfile = {
    display_name: string | null;
    tagline: string | null;
    join_reason: string[] | null;
    participation_style: string[] | null;
    additional_context: string | null;
    policy_version: string | null;
    marketing_opt_in?: boolean;
    marketing_source?: string | null;
  };

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
        marketingOptIn: Boolean(profile.marketing_opt_in),
      };

      const completedSteps: SignupStep[] = ['identity'];
      if (
        (profile.join_reason?.length ?? 0) > 0 &&
        (profile.participation_style?.length ?? 0) > 0
      ) {
        completedSteps.push('values');
      }
      if (profile.display_name?.trim()) completedSteps.push('profile');

      let currentStep: SignupStep = 'welcome';
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

      console.log('🔄 Reconciling partial profile → step:', currentStep);

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

  /** Contact email shown when we can't fix the issue (database/schema/config). */
  const SUPPORT_EMAIL = 'info@wrdlnkdn.com';

  /**
   * Map Supabase/backend errors to user-facing messages. Never show raw technical
   * errors (e.g. "Invalid schema: public"); always show a friendly message and
   * point to support email when appropriate.
   */
  const toFriendlyMessage = useCallback(
    (err: { code?: string; message?: string; details?: string }): string => {
      const code = err.code;
      const msg = (err.message ?? '').toLowerCase();
      const details = (err.details ?? '').toLowerCase();
      const combined = `${msg} ${details}`;

      // Already signed up / duplicate profile
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
          return 'You already have a profile. Go to Feed to get started.';
        }
        return 'That display name is already taken. Try a different display name.';
      }
      if (code === '23502') {
        return 'Required profile data is missing. Please fill in display name and try again.';
      }
      if (code === '23503') {
        return 'Your session may have expired. Please sign in again and try again.';
      }

      // Schema / config / backend errors — never show raw "Invalid schema: public" etc.
      if (
        combined.includes('invalid schema') ||
        combined.includes('schema:') ||
        (combined.includes('relation') &&
          combined.includes('does not exist')) ||
        combined.includes('permission denied') ||
        combined.includes('configuration')
      ) {
        return (
          `We're having a technical issue on our side. Please try again in a few ` +
          `minutes, or email us at ${SUPPORT_EMAIL} if it keeps happening.`
        );
      }

      // Network / timeout / server errors
      if (
        code === 'PGRST301' ||
        msg.includes('fetch') ||
        msg.includes('network') ||
        msg.includes('timeout')
      ) {
        return (
          "We couldn't reach our servers. Check your connection and try again, or email us at " +
          SUPPORT_EMAIL +
          ' if it keeps happening.'
        );
      }

      // Only pass through messages we explicitly threw (user-facing)
      const raw = (err.message ?? '').trim();
      if (
        raw.length > 0 &&
        raw.length < 200 &&
        (raw.startsWith('You already have') ||
          raw.startsWith('That display name') ||
          raw.startsWith('Required profile') ||
          raw.startsWith('Your session') ||
          raw.startsWith('You must be signed in'))
      ) {
        return raw;
      }

      return `Something went wrong. Please try again or email us at ${SUPPORT_EMAIL} for help.`;
    },
    [],
  );

  /** Use in catch: turn unknown thrown value into a user-facing message. */
  const toFriendlyMessageFromUnknown = useCallback(
    (e: unknown): string => {
      if (e instanceof Error) {
        const msg = e.message.trim();
        if (
          msg.startsWith('You already have') ||
          msg.startsWith('That display name') ||
          msg.startsWith('Required profile') ||
          msg.startsWith('Your session') ||
          msg.startsWith('You must be signed in') ||
          msg.includes(SUPPORT_EMAIL)
        ) {
          return msg;
        }
        return toFriendlyMessage({ message: msg });
      }
      const o = e as Record<string, unknown> | null;
      if (o && typeof o === 'object' && (o.message != null || o.code != null)) {
        return toFriendlyMessage({
          message: String(o.message ?? ''),
          code: o.code != null ? String(o.code) : undefined,
          details: o.details != null ? String(o.details) : undefined,
        });
      }
      return `Something went wrong. Please try again or email us at ${SUPPORT_EMAIL} for help.`;
    },
    [toFriendlyMessage],
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

        // Check if user already has a profile: UPDATE to fill gaps, else INSERT
        const { data: existing } = await supabase
          .from('profiles')
          .select('id, handle')
          .eq('id', state.identity.userId)
          .maybeSingle();

        if (existing) {
          // Partial/incomplete profile: UPDATE with signup data
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              display_name: profile.displayName.trim(),
              tagline: profile.tagline?.trim() || null,
              join_reason: state.values.joinReason || [],
              participation_style: state.values.participationStyle || [],
              additional_context:
                state.values.additionalContext?.trim() || null,
              marketing_opt_in: Boolean(profile.marketingOptIn),
              marketing_opt_in_timestamp: profile.marketingOptIn
                ? new Date().toISOString()
                : null,
              marketing_source: profile.marketingOptIn ? 'signup' : null,
              policy_version: state.identity.policyVersion || null,
            } as never)
            .eq('id', state.identity.userId);

          if (updateError) {
            console.error('❌ Profile update error:', updateError);
            throw new Error(toFriendlyMessage(updateError));
          }
          console.log('✅ Profile updated successfully (reconciliation)');
          setState((s) => ({ ...s, currentStep: 'complete' }));
          markComplete('complete');
          return;
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
              marketing_opt_in: Boolean(profile.marketingOptIn),
              marketing_opt_in_timestamp: profile.marketingOptIn
                ? new Date().toISOString()
                : null,
              marketing_source: profile.marketingOptIn ? 'signup' : null,
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
            // Duplicate profile (id) — treat as success (idempotent retry)
            if (
              insertError.message?.includes('profiles_pkey') ||
              insertError.details?.includes('id') ||
              (insertError.message?.toLowerCase().includes('duplicate') &&
                insertError.message?.toLowerCase().includes('key'))
            ) {
              console.log('✅ Profile already exists (idempotent)');
              setState((s) => ({ ...s, currentStep: 'complete' }));
              markComplete('complete');
              return;
            }
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
        setSubmitError(toFriendlyMessageFromUnknown(e));
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
      toFriendlyMessageFromUnknown,
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

  return (
    <SignupContext.Provider value={value}>{children}</SignupContext.Provider>
  );
};
