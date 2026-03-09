import type { IdentityProvider } from '../../types/join';

export function mapSupabaseProvider(user: {
  identities?: { provider?: string }[];
  app_metadata?: { provider?: string };
}): IdentityProvider {
  const p =
    user.identities?.[0]?.provider ?? user.app_metadata?.provider ?? 'google';
  return p === 'azure' ? 'microsoft' : 'google';
}

export function getOAuthError(): string | null {
  const hash = window.location.hash?.slice(1);
  const params = new URLSearchParams(hash || window.location.search);
  return params.get('error_description') || params.get('error') || null;
}

type BuildDebugInfoParams = {
  startedAtMs: number;
  next: string;
  timedOut: boolean;
  timeoutMs: number;
  provider: 'google' | 'microsoft' | 'unknown';
  appEnv: string;
  error: string | null;
};

export function buildAuthCallbackDebugInfo({
  startedAtMs,
  next,
  timedOut,
  timeoutMs,
  provider,
  appEnv,
  error,
}: BuildDebugInfoParams): string {
  const elapsedMs = Date.now() - startedAtMs;
  return [
    `event=auth_callback_error`,
    `next=${next}`,
    `timed_out=${timedOut}`,
    `timeout_ms=${timeoutMs}`,
    `provider=${provider}`,
    `app_env=${appEnv}`,
    `elapsed_ms=${elapsedMs}`,
    `url=${window.location.href}`,
    `user_agent=${navigator.userAgent}`,
    `error=${error ?? 'none'}`,
    `timestamp=${new Date().toISOString()}`,
  ].join('\n');
}

export async function copyAuthCallbackDebugInfo(
  payload: string,
): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = payload;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

type CopyAuthCallbackDebugPayloadParams = BuildDebugInfoParams;

export async function copyAuthCallbackDebugPayload(
  params: CopyAuthCallbackDebugPayloadParams,
): Promise<boolean> {
  const payload = buildAuthCallbackDebugInfo(params);
  return copyAuthCallbackDebugInfo(payload);
}

type AuthCallbackLogPayload = {
  event: 'auth_callback_error';
  next: string;
  timed_out: boolean;
  timeout_ms: number;
  provider: 'google' | 'microsoft' | 'unknown';
  app_env: string;
  elapsed_ms: number;
  url: string;
  user_agent: string;
  error: string;
  timestamp: string;
};

type BuildAuthCallbackLogPayloadParams = {
  next: string;
  timedOut: boolean;
  timeoutMs: number;
  provider: 'google' | 'microsoft' | 'unknown';
  appEnv: string;
  startedAtMs: number;
  error: string | null;
};

export function buildAuthCallbackLogPayload({
  next,
  timedOut,
  timeoutMs,
  provider,
  appEnv,
  startedAtMs,
  error,
}: BuildAuthCallbackLogPayloadParams): AuthCallbackLogPayload {
  return {
    event: 'auth_callback_error',
    next,
    timed_out: timedOut,
    timeout_ms: timeoutMs,
    provider,
    app_env: appEnv,
    elapsed_ms: Date.now() - startedAtMs,
    url: window.location.href,
    user_agent: navigator.userAgent,
    error: error ?? 'none',
    timestamp: new Date().toISOString(),
  };
}

export function sendAuthCallbackLog(payload: AuthCallbackLogPayload): void {
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      navigator.sendBeacon('/api/auth/callback-log', blob);
      return;
    }
  } catch {
    // fall through
  }
  void fetch('/api/auth/callback-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // swallow diagnostics failures
  });
}
