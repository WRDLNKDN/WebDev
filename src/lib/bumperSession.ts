/**
 * Bumper-after-Join: show bumper once per session.
 * CompleteStep uses hasBumperBeenShown(): IF true → go to Feed; ELSE → go to /bumper?from=join.
 * BumperPage (when from=join) calls setBumperShown() before redirect so next time we go straight to Feed.
 */
export const BUMPER_SHOWN_KEY = 'wrdlnkdn-bumper-shown';

export function hasBumperBeenShown(): boolean {
  try {
    return sessionStorage.getItem(BUMPER_SHOWN_KEY) === '1';
  } catch {
    return false;
  }
}

export function setBumperShown(): void {
  try {
    sessionStorage.setItem(BUMPER_SHOWN_KEY, '1');
  } catch {
    // ignore
  }
}
