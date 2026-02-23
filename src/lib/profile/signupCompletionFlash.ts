const SIGNUP_COMPLETION_FLASH_KEY = 'wrdlnkdn-signup-complete-flash';

export const setSignupCompletionFlash = (): void => {
  try {
    sessionStorage.setItem(SIGNUP_COMPLETION_FLASH_KEY, '1');
  } catch {
    // ignore
  }
};

export const consumeSignupCompletionFlash = (): boolean => {
  try {
    const seen = sessionStorage.getItem(SIGNUP_COMPLETION_FLASH_KEY) === '1';
    if (seen) sessionStorage.removeItem(SIGNUP_COMPLETION_FLASH_KEY);
    return seen;
  } catch {
    return false;
  }
};
