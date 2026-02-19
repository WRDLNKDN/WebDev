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
export function sendApiError(
  res: Response,
  status: number,
  message: string,
  code?: string,
  extra?: Record<string, unknown>,
): Response {
  const safeMessage =
    message.length > 200 ||
    /\b(select|insert|update|delete|pg_|relation)\b/i.test(message)
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
