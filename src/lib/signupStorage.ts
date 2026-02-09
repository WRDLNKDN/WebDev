// src/lib/signupStorage.ts
import type { SignupState } from '../types/signup';

const KEY = 'wrdlnkdn-signup';

export const loadSignupState = (): SignupState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SignupState;
  } catch {
    return null;
  }
};

export const saveSignupState = (state: SignupState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures (private mode, quotas)
  }
};

export const clearSignupState = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
