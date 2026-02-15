/**
 * User-facing error messages. Avoid showing raw HTTP status text (e.g. "Method Not Allowed")
 * or technical errors to end users.
 */

/**
 * Shown when Microsoft/Azure OAuth is not configured (provider not enabled).
 * Used by SignIn, AuthCallback, and IdentityStep.
 */
export const MICROSOFT_SIGNIN_NOT_CONFIGURED =
  'Microsoft sign-in is not configured. Add SUPABASE_AZURE_CLIENT_ID and ' +
  'SUPABASE_AZURE_CLIENT_SECRET to your .env, then run: supabase stop && supabase start. ' +
  'See supabase/README.md for details.';

/** Max length for treating server message as user-friendly (long messages are often stack traces or technical). */
const FRIENDLY_MESSAGE_MAX_LEN = 120;

/** Technical phrases we never show to users; map to friendly fallbacks. */
const TECHNICAL_PHRASES: Array<{ pattern: RegExp; friendly: string }> = [
  {
    pattern: /method not allowed/i,
    friendly:
      "This action isn't available right now. Please refresh and try again.",
  },
  { pattern: /forbidden/i, friendly: "You don't have permission to do that." },
  {
    pattern: /internal server error/i,
    friendly: 'Something went wrong on our end. Please try again in a moment.',
  },
  {
    pattern: /bad gateway|gateway timeout|service unavailable/i,
    friendly:
      'The service is temporarily unavailable. Please try again in a moment.',
  },
  {
    pattern: /not found/i,
    friendly: "That couldn't be found. It may have been removed.",
  },
  { pattern: /unauthorized/i, friendly: 'You need to sign in to do that.' },
  {
    pattern: /too many requests/i,
    friendly: 'Too many requests. Please wait a moment and try again.',
  },
  {
    pattern: /failed to fetch|network error|load failed/i,
    friendly: 'Connection problem. Please check your network and try again.',
  },
  {
    pattern: /new row violates row-level security|rls policy/i,
    friendly: "You don't have permission to add that. Try signing in again.",
  },
  {
    pattern: /duplicate key|unique constraint|already exists/i,
    friendly:
      'A project with that title or URL may already exist. Try a different title or URL.',
  },
];

/**
 * Returns a user-friendly message for an HTTP status when the server didn't send a short, safe message.
 */
export function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "Something wasn't quite right. Please check and try again.";
    case 401:
      return 'You need to sign in to do that.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "That couldn't be found. It may have been removed.";
    case 409:
      return 'That conflicts with existing data. Try a different title or URL.';
    case 405:
      return "This action isn't available right now. Please refresh and try again.";
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'Something went wrong on our end. Please try again in a moment.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Picks the best user-facing message from server response: use body.error if it's short and
 * non-technical; otherwise use messageForStatus(status).
 */
export function messageFromApiResponse(
  status: number,
  bodyError?: string | null,
): string {
  const trimmed = typeof bodyError === 'string' ? bodyError.trim() : '';
  if (trimmed && trimmed.length <= FRIENDLY_MESSAGE_MAX_LEN) {
    const lower = trimmed.toLowerCase();
    const looksTechnical =
      TECHNICAL_PHRASES.some(({ pattern }) => pattern.test(lower)) ||
      /\b(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|\d{3})\b/.test(trimmed);
    if (!looksTechnical) return trimmed;
  }
  return messageForStatus(status);
}

/**
 * Converts any thrown value to a user-friendly message. Replaces technical phrases
 * (e.g. "Method Not Allowed") with friendly copy.
 */
export function toMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  const str = raw || 'Something went wrong. Please try again.';
  const lower = str.toLowerCase();
  for (const { pattern, friendly } of TECHNICAL_PHRASES) {
    if (pattern.test(lower)) return friendly;
  }
  if (str.length > FRIENDLY_MESSAGE_MAX_LEN) return messageForStatus(0);
  return str;
}
