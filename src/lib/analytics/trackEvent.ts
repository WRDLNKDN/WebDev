type AnalyticsPayload = Record<string, string | number | boolean | null>;

type DataLayerEvent = AnalyticsPayload & {
  event: string;
};

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

/**
 * Lightweight analytics shim:
 * - pushes to GTM-style dataLayer when present
 * - emits a browser event for local listeners/debugging
 */
export function trackEvent(
  eventName: string,
  payload: AnalyticsPayload = {},
): void {
  const event: DataLayerEvent = { event: eventName, ...payload };
  if (typeof window === 'undefined') return;
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(event);
  }
  window.dispatchEvent(
    new CustomEvent('wrdlnkdn:analytics', {
      detail: event,
    }),
  );
}
