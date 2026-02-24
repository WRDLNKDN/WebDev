import type { JoinState } from '../../types/join';

const LEGACY_SIGNUP_KEY = 'wrdlnkdn-signup';

export const loadJoinState = (): JoinState | null => {
  try {
    const raw = localStorage.getItem(LEGACY_SIGNUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as JoinState;
  } catch {
    return null;
  }
};

export const saveJoinState = (state: JoinState) => {
  try {
    localStorage.setItem(LEGACY_SIGNUP_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures (private mode, quotas)
  }
};

export const clearJoinState = () => {
  try {
    localStorage.removeItem(LEGACY_SIGNUP_KEY);
  } catch {
    // ignore
  }
};

// Backward-compatible aliases during Join naming migration.
export const loadSignupState = loadJoinState;
export const saveSignupState = saveJoinState;
export const clearSignupState = clearJoinState;
