/**
 * Standardized API error response structure.
 * NFR: All API endpoints follow { status, message, code } format.
 * Frontend consumes message; code enables programmatic handling.
 */

import type { Response } from 'express';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
};

export type ApiErrorShape = {
  status: number;
  message: string;
  code: string;
  error?: string; // backward compat for clients expecting .error
  [key: string]: unknown;
};

/**
 * Send standardized error response. Never exposes raw Supabase/DB errors to clients.
 * @param extra - Optional fields to merge (e.g. { retryAfter: 60 } for 429)
 */
/** Redact obvious Postgres / SQL fragments; do not match everyday words like "update". */
function looksLikeSqlOrSchemaLeak(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /\bpg_[a-z0-9_]+\b/.test(m) ||
    /relation\s+["'][^"']+["']\s+does\s+not\s+exist/.test(m) ||
    /syntax\s+error\s+at\s+or\s+near/.test(m) ||
    /\bviolates\s+(foreign\s+key|check)\s+constraint\b/.test(m)
  );
}

export function sendApiError(
  res: Response,
  status: number,
  message: string,
  code?: string,
  extra?: Record<string, unknown>,
): Response {
  const safeMessage =
    message.length > 200 || looksLikeSqlOrSchemaLeak(message)
      ? 'An unexpected error occurred. Please try again.'
      : message;
  const body: ApiErrorShape = {
    status,
    message: safeMessage,
    code: code ?? STATUS_CODES[status] ?? 'UNKNOWN',
    error: safeMessage,
    ...extra,
  };
  return res.status(status).json(body);
}
