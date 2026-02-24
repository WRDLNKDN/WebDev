const JOIN_COMPLETION_FLASH_KEY = 'wrdlnkdn-join-complete-flash';
const LEGACY_SIGNUP_COMPLETION_FLASH_KEY = 'wrdlnkdn-signup-complete-flash';

export const setJoinCompletionFlash = (): void => {
  try {
    sessionStorage.setItem(JOIN_COMPLETION_FLASH_KEY, '1');
  } catch {
    // ignore
  }
};

export const consumeJoinCompletionFlash = (): boolean => {
  try {
    const seenCurrent =
      sessionStorage.getItem(JOIN_COMPLETION_FLASH_KEY) === '1';
    const seenLegacy =
      sessionStorage.getItem(LEGACY_SIGNUP_COMPLETION_FLASH_KEY) === '1';
    const seen = seenCurrent || seenLegacy;
    if (seenCurrent) sessionStorage.removeItem(JOIN_COMPLETION_FLASH_KEY);
    if (seenLegacy)
      sessionStorage.removeItem(LEGACY_SIGNUP_COMPLETION_FLASH_KEY);
    return seen;
  } catch {
    return false;
  }
};

// Backward-compatible aliases during Join naming migration.
export const setSignupCompletionFlash = setJoinCompletionFlash;
export const consumeSignupCompletionFlash = consumeJoinCompletionFlash;
