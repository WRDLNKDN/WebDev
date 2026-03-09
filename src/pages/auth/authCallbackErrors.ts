import { toMessage } from '../../lib/utils/errors';

export function getAuthCallbackDisplayError(error: unknown): string {
  const msg = toMessage(error).toLowerCase();
  if (msg.includes('network') || msg.includes('timeout')) {
    return 'We had trouble completing sign-in due to a network issue. You can try again or return home.';
  }
  if (msg.includes('no session found')) {
    return 'Sign-in did not complete on this device. Please try again. On Android, opening in Chrome usually fixes this.';
  }
  return toMessage(error);
}
