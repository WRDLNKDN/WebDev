/**
 * Development-only logging. No-op in production builds.
 * Use for auth/onboarding flow debugging without polluting prod console.
 */

const isDev =
  (import.meta.env.VITE_APP_ENV as string | undefined)?.toLowerCase() ===
    'dev' ||
  (import.meta.env.DEV ?? import.meta.env.MODE === 'development');

export function devLog(...args: unknown[]): void {
  if (isDev) {
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (isDev) {
    console.warn(...args);
  }
}

export function devError(...args: unknown[]): void {
  if (isDev) {
    console.error(...args);
  }
}
