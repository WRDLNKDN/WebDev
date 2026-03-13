import { supabase } from '../lib/auth/supabaseClient';
import {
  POLICY_VERSION,
  type IdentityData,
  type JoinState,
  type JoinStep,
  type ProfileData,
} from '../types/join';

export const JOIN_STORAGE_KEY = 'wrdlnkdn-join-state';
export const LEGACY_SIGNUP_STORAGE_KEY = 'wrdlnkdn-signup-state';
export const SUPPORT_EMAIL = 'info@wrdlnkdn.com';

export const loadJoinState = (fallback: JoinState): JoinState => {
  try {
    const saved =
      localStorage.getItem(JOIN_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_SIGNUP_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as JoinState;
  } catch {
    // Ignore storage parsing errors and use initial state.
  }
  return fallback;
};

export const toFriendlyMessage = (err: {
  code?: string;
  message?: string;
  details?: string;
}): string => {
  const code = err.code;
  const msg = (err.message ?? '').toLowerCase();
  const details = (err.details ?? '').toLowerCase();
  const combined = `${msg} ${details}`;

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
  if (code === '23502')
    return 'Required profile data is missing. Please fill in display name and try again.';
  if (code === '23503')
    return 'Your session may have expired. Please sign in again and try again.';

  if (
    combined.includes('invalid schema') ||
    combined.includes('schema:') ||
    (combined.includes('relation') && combined.includes('does not exist')) ||
    combined.includes('permission denied') ||
    combined.includes('configuration')
  ) {
    return `We're having a technical issue on our side. Please try again in a few minutes, or email us at ${SUPPORT_EMAIL} if it keeps happening.`;
  }

  if (
    code === 'PGRST301' ||
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('timeout')
  ) {
    return `We couldn't reach our servers. Check your connection and try again, or email us at ${SUPPORT_EMAIL} if it keeps happening.`;
  }

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
};

export const toFriendlyMessageFromUnknown = (e: unknown): string => {
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
      message: o.message != null ? String(o.message) : '',
      code: o.code != null ? String(o.code) : undefined,
      details: o.details != null ? String(o.details) : undefined,
    });
  }
  return `Something went wrong. Please try again or email us at ${SUPPORT_EMAIL} for help.`;
};

type JoinSessionLike = {
  user: {
    id: string;
    email?: string;
    identities?: { provider?: string }[];
    app_metadata?: { provider?: string };
  };
};

export const buildJoinIdentityFromSession = (
  session: JoinSessionLike,
): IdentityData => {
  const provider =
    session.user.identities?.[0]?.provider ??
    session.user.app_metadata?.provider ??
    'google';

  return {
    provider: provider === 'azure' ? 'microsoft' : 'google',
    userId: session.user.id,
    email: session.user.email ?? '',
    termsAccepted: true,
    guidelinesAccepted: true,
    policyVersion: POLICY_VERSION,
    timestamp: new Date().toISOString(),
  };
};

export const hydrateJoinStateFromSession = (
  state: JoinState,
  session: JoinSessionLike,
): JoinState => {
  if (state.identity?.userId === session.user.id) {
    return state;
  }

  const identity = buildJoinIdentityFromSession(session);
  const completedSteps = [
    'welcome',
    'identity',
    ...state.completedSteps.filter(
      (step) => step !== 'welcome' && step !== 'identity',
    ),
  ] as JoinStep[];

  return {
    ...state,
    identity,
    completedSteps,
  };
};

export const isJoinAuthError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  return (
    message.includes('You must be signed in') ||
    message.includes('Your session may have expired') ||
    message.includes('row level security') ||
    message.includes('policy')
  );
};

type SubmitJoinRegistrationParams = {
  state: JoinState;
  profileData?: ProfileData;
  markComplete: (step: JoinStep) => void;
  setState: React.Dispatch<React.SetStateAction<JoinState>>;
  setSubmitError: (value: string | null) => void;
};

export const submitJoinRegistration = async ({
  state,
  profileData,
  markComplete,
  setState,
  setSubmitError,
}: SubmitJoinRegistrationParams) => {
  try {
    if (!state.identity) throw new Error('Missing identity step data.');
    if (!state.values) throw new Error('Missing values step data.');
    if (!state.values.joinReason?.length)
      throw new Error(
        'What brings you here? is required. Please select at least one.',
      );
    if (!state.values.participationStyle?.length)
      throw new Error(
        'How will you participate? is required. Please select at least one.',
      );

    const profile = profileData || state.profile;
    if (!profile) throw new Error('Missing profile step data.');
    if (!profile.displayName?.trim())
      throw new Error('Display name is required.');

    const { data: existing } = await supabase
      .from('profiles')
      .select('id, handle')
      .eq('id', state.identity.userId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: profile.displayName.trim(),
          tagline: profile.tagline?.trim() || null,
          join_reason: state.values.joinReason || [],
          participation_style: state.values.participationStyle || [],
          additional_context: state.values.additionalContext?.trim() || null,
          marketing_email_enabled: Boolean(profile.marketingOptIn),
          marketing_opt_in: Boolean(profile.marketingOptIn),
          marketing_opt_in_timestamp: profile.marketingOptIn
            ? new Date().toISOString()
            : null,
          marketing_source: profile.marketingOptIn ? 'signup' : null,
          policy_version: state.identity.policyVersion || null,
          status: 'approved',
        } as never)
        .eq('id', state.identity.userId);

      if (updateError) throw new Error(toFriendlyMessage(updateError));
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

    while (attempts < 10) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: state.identity.userId,
        email: state.identity.email,
        handle: attempts === 0 ? handle : `${handle}${attempts}`,
        display_name: profile.displayName.trim(),
        tagline: profile.tagline?.trim() || null,
        join_reason: state.values.joinReason || [],
        participation_style: state.values.participationStyle || [],
        marketing_email_enabled: Boolean(profile.marketingOptIn),
        marketing_opt_in: Boolean(profile.marketingOptIn),
        marketing_opt_in_timestamp: profile.marketingOptIn
          ? new Date().toISOString()
          : null,
        marketing_source: profile.marketingOptIn ? 'signup' : null,
        additional_context: state.values.additionalContext?.trim() || null,
        status: 'approved',
        policy_version: state.identity.policyVersion || null,
      } as never);

      if (!insertError) {
        setState((s) => ({ ...s, currentStep: 'complete' }));
        markComplete('complete');
        return;
      }

      if (insertError.code === '23505') {
        if (
          insertError.message?.includes('profiles_pkey') ||
          insertError.details?.includes('id') ||
          (insertError.message?.toLowerCase().includes('duplicate') &&
            insertError.message?.toLowerCase().includes('key'))
        ) {
          setState((s) => ({ ...s, currentStep: 'complete' }));
          markComplete('complete');
          return;
        }
        const friendly = toFriendlyMessage(insertError);
        if (friendly.includes('already have a profile'))
          throw new Error(friendly);
        attempts += 1;
        continue;
      }

      throw new Error(toFriendlyMessage(insertError));
    }

    throw new Error(
      'That display name is already taken. Try a different display name.',
    );
  } catch (e: unknown) {
    setSubmitError(toFriendlyMessageFromUnknown(e));
    throw e;
  }
};
