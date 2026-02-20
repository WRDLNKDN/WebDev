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
const FRIENDLY_MESSAGE_MAX_LEN = 180;

/** Fallback when no useful error info is available. */
const FALLBACK_MESSAGE =
  'An unexpected error occurred. Try refreshing the page, or contact support if it persists.';

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
    friendly: 'Our server hit an error. Please try again in a moment.',
  },
  {
    pattern: /^server error$/i,
    friendly: 'Our server hit an error. Please try again in a moment.',
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
    pattern: /payload too large|request entity too large|limit_file_size/i,
    friendly: 'File too large. Please upload a smaller file.',
  },
  {
    pattern: /unsupported image type|invalid mime|mime type/i,
    friendly: 'Unsupported file type. Please upload JPG, PNG, WEBP, or GIF.',
  },
  {
    pattern: /upload failed/i,
    friendly:
      'Upload failed. Please try a smaller file or try again in a moment.',
  },
  {
    pattern: /api returned html|vite_api_url/i,
    friendly:
      'Upload endpoint is not configured correctly. Please ask an administrator to verify API settings.',
  },
  {
    pattern: /^missing\s+[a-z_]+/i,
    friendly:
      'A required field is missing. Please complete all required fields.',
  },
  {
    pattern: /^invalid\s+[a-z_]+\s+id/i,
    friendly: "That item couldn't be found. Refresh and try again.",
  },
  {
    pattern: /only the .* author may (edit|delete)/i,
    friendly: 'You can only modify content that you created.',
  },
  {
    pattern: /account suspended|account disabled/i,
    friendly: 'Your account is currently restricted for this action.',
  },
  {
    pattern: /no pending request found/i,
    friendly: 'No pending request was found for that action.',
  },
  {
    pattern: /job not found or not complete/i,
    friendly:
      'That generation job is not ready yet. Please wait a moment and try again.',
  },
  {
    pattern: /failed to fetch|network error|load failed/i,
    friendly: 'Connection problem. Check your network and try again.',
  },
  {
    pattern: /no active session|^no user$|not authenticated|not signed in/i,
    friendly: 'You need to sign in to do that.',
  },
  {
    pattern: /max 100 members/i,
    friendly: 'A group can have up to 100 members.',
  },
  {
    pattern: /report message or user|category required/i,
    friendly: 'Please choose what you want to report and include a reason.',
  },
  {
    pattern: /gif fetch failed/i,
    friendly: "We couldn't add that GIF. Please try another one.",
  },
  {
    pattern: /new row violates row-level security|rls policy/i,
    friendly: "You don't have permission to do that. Try signing in again.",
  },
  {
    pattern: /duplicate key|unique constraint|already exists/i,
    friendly: 'That already exists. Try a different value.',
  },
  {
    pattern: /relation ["'].*["'] does not exist|relation .* does not exist/i,
    friendly:
      'Database table not found. Run migrations (e.g. supabase db reset) or contact your administrator.',
  },
  {
    pattern: /permission denied for (table|relation)/i,
    friendly:
      "You don't have permission to access that. Sign in again or check with an administrator.",
  },
  {
    pattern: /jwt expired|session expired/i,
    friendly: 'Your session has expired. Please sign in again.',
  },
  {
    pattern: /invalid jwt|jwt malformed/i,
    friendly: 'Your session is invalid. Please sign in again.',
  },
  {
    pattern: /null value in column .* violates not-null/i,
    friendly:
      'A required field is missing. Please fill in all required fields.',
  },
  {
    pattern: /foreign key constraint|violates foreign key/i,
    friendly:
      "That can't be saved because it references something that doesn't exist.",
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
    case 413:
      return 'That file is too large. Please choose a smaller file and try again.';
    case 422:
      return "Some information couldn't be processed. Please review and try again.";
    case 405:
      return "This action isn't available right now. Please refresh and try again.";
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'Our server hit an error. Please try again in a moment.';
    default:
      return FALLBACK_MESSAGE;
  }
}

/**
 * Picks the best user-facing message from server response.
 * Prefers body.message (standardized) or body.error; otherwise messageForStatus(status).
 */
export function messageFromApiResponse(
  status: number,
  bodyError?: string | null,
  bodyMessage?: string | null,
): string {
  const candidate =
    typeof bodyMessage === 'string' && bodyMessage.trim()
      ? bodyMessage.trim()
      : typeof bodyError === 'string'
        ? bodyError.trim()
        : '';
  const trimmed = candidate;
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
 * Extracts a candidate message from various error shapes (Error, { message }, { error: { message } }).
 */
function extractMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string' && e.trim()) return e.trim();
  if (e && typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim())
      return obj.message.trim();
    if (obj.error && typeof obj.error === 'object') {
      const err = obj.error as Record<string, unknown>;
      if (typeof err.message === 'string' && err.message.trim())
        return err.message.trim();
    }
  }
  return '';
}

/**
 * Returns the best raw message for logic checks (e.g. provider-specific branching),
 * without applying friendly phrase replacement.
 */
export function getErrorMessage(e: unknown, fallback = ''): string {
  const raw = extractMessage(e);
  return raw || fallback;
}

/**
 * Converts any thrown value to a user-friendly message. Replaces technical phrases
 * (e.g. "Method Not Allowed") with friendly copy.
 */
export function toMessage(e: unknown): string {
  const raw = extractMessage(e);
  const str = raw || FALLBACK_MESSAGE;
  const lower = str.toLowerCase();
  for (const { pattern, friendly } of TECHNICAL_PHRASES) {
    if (pattern.test(lower)) return friendly;
  }
  if (str.length > FRIENDLY_MESSAGE_MAX_LEN) return FALLBACK_MESSAGE;
  return str;
}
