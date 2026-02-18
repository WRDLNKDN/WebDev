/**
 * Capture page refresh for debugging. Odd behavior often occurs on refresh
 * (auth state, route, signup flow, etc). This logs and persists so we can
 * correlate "something weird happened" with "user just refreshed".
 */

const STORAGE_KEY = 'wrdlnkdn-last-load';

export type LoadType = 'navigate' | 'reload' | 'back_forward';

export function captureRefresh(): LoadType | null {
  if (typeof window === 'undefined' || !window.performance) return null;

  try {
    const entries = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    const nav = entries[0];
    const type = (nav?.type ?? 'navigate') as LoadType;

    const prev = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        type,
        path: window.location.pathname,
        timestamp: Date.now(),
      }),
    );

    if (type === 'reload') {
      const path = window.location.pathname;
      let prevLabel = 'initial';
      if (prev) {
        try {
          const p = JSON.parse(prev) as { path?: string; type?: string };
          prevLabel = `${p.type ?? '?'} at ${p.path ?? '?'}`;
        } catch {
          prevLabel = prev;
        }
      }
      console.info(`[REFRESH] Page reloaded at ${path} (prev: ${prevLabel})`);
    }

    return type;
  } catch {
    return null;
  }
}

/** Call early in app bootstrap. */
export function initRefreshCapture(): void {
  captureRefresh();
}
