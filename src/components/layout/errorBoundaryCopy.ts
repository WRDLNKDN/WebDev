export interface ErrorBoundaryCopy {
  title: string;
  description: string;
  detail: string | null;
  code: string;
}

const GENERIC_DETAIL = 'An unexpected error occurred.';
const MAX_DETAIL_LENGTH = 240;

function normalizeDetail(message: string | null | undefined): string | null {
  const value = message?.trim();
  if (!value) return null;
  if (value.length <= MAX_DETAIL_LENGTH) return value;
  return `${value.slice(0, MAX_DETAIL_LENGTH - 1)}…`;
}

export function buildErrorBoundaryCopy(
  message: string | null | undefined,
): ErrorBoundaryCopy {
  const raw = message?.trim() ?? '';
  const normalized = raw.toLowerCase();
  const detail = normalizeDetail(raw && raw !== GENERIC_DETAIL ? raw : null);

  if (
    normalized.includes('loading chunk') ||
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('error loading dynamically imported module') ||
    normalized.includes('importing a module script failed')
  ) {
    return {
      title: 'This screen did not finish loading',
      description:
        'Part of the app failed to download. Reload the page and try again.',
      detail,
      code: 'SCREEN_LOAD_ERROR',
    };
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed')
  ) {
    return {
      title: "We couldn't reach WRDLNKDN",
      description:
        'A network request failed while loading this page. Check your connection and try again.',
      detail,
      code: 'NETWORK_ERROR',
    };
  }

  if (
    normalized.includes('auth') ||
    normalized.includes('session') ||
    normalized.includes('token') ||
    normalized.includes('unauthorized') ||
    normalized.includes('forbidden')
  ) {
    return {
      title: 'Your session may need to be refreshed',
      description:
        'This page could not load with the current sign-in session. Reload the page and sign in again if needed.',
      detail,
      code: 'SESSION_ERROR',
    };
  }

  return {
    title: 'Something went wrong loading this page',
    description:
      'The app hit an unexpected error while rendering this screen. Reload the page and try again.',
    detail,
    code: 'UNEXPECTED_RENDER_ERROR',
  };
}
