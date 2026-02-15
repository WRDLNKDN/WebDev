/**
 * Structured logging for Directory API (NFR #266).
 * Emits JSON logs for observability without database access.
 */

export type DirectoryLogEvent =
  | {
      event: 'request';
      method: string;
      path: string;
      userId: string;
      status: number;
      durationMs: number;
    }
  | { event: 'rate_limit'; userId: string; action: string; retryAfter?: number }
  | {
      event: 'error';
      method: string;
      path: string;
      userId?: string;
      error: string;
    };

function log(obj: DirectoryLogEvent): void {
  const line = JSON.stringify({
    ...obj,
    timestamp: new Date().toISOString(),
    service: 'directory-api',
  });

  console.log(line);
}

export function logDirectoryRequest(opts: {
  method: string;
  path: string;
  userId: string;
  status: number;
  durationMs: number;
}): void {
  log({
    event: 'request',
    method: opts.method,
    path: opts.path,
    userId: opts.userId,
    status: opts.status,
    durationMs: opts.durationMs,
  });
}

export function logDirectoryRateLimit(opts: {
  userId: string;
  action: string;
  retryAfter?: number;
}): void {
  log({
    event: 'rate_limit',
    userId: opts.userId,
    action: opts.action,
    retryAfter: opts.retryAfter,
  });
}

export function logDirectoryError(opts: {
  method: string;
  path: string;
  userId?: string;
  error: string;
}): void {
  log({
    event: 'error',
    method: opts.method,
    path: opts.path,
    userId: opts.userId,
    error: opts.error,
  });
}
