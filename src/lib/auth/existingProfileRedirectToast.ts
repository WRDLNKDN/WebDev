import type { AlertColor } from '@mui/material';

type ShowToast = (toast: {
  message: string;
  severity?: AlertColor;
  duration?: number;
}) => void;

const DURATION_MS = 6000;

/** Redirecting to Feed (e.g. from Join or sign-in). */
export function showExistingProfileFeedToast(showToast: ShowToast): void {
  showToast({
    message: 'You already have a profile here — opening your Feed.',
    severity: 'info',
    duration: DURATION_MS,
  });
}

/** Same situation but landing somewhere other than /feed (e.g. dashboard). */
export function showExistingProfileWelcomeToast(showToast: ShowToast): void {
  showToast({
    message: 'You already have a profile here — welcome back.',
    severity: 'info',
    duration: DURATION_MS,
  });
}
