type GlobalWithAnalytics = Window & {
  gtag?: (...args: unknown[]) => void;
  plausible?: (
    event: string,
    options?: { props?: Record<string, unknown> },
  ) => void;
};

let registered = false;

export function registerAnalyticsSinks(): void {
  if (registered || typeof window === 'undefined') return;
  const w = window as GlobalWithAnalytics;

  const handler = (evt: Event) => {
    const detail = (evt as CustomEvent<Record<string, unknown>>).detail ?? {};
    const eventName =
      typeof detail.event === 'string' ? detail.event : 'unknown_event';
    const payload = { ...detail };
    delete payload.event;

    if (typeof w.gtag === 'function') {
      w.gtag('event', eventName, payload);
    }
    if (typeof w.plausible === 'function') {
      w.plausible(eventName, { props: payload });
    }
  };

  window.addEventListener('wrdlnkdn:analytics', handler as EventListener);
  registered = true;
}
