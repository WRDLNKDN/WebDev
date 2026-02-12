/**
 * Vercel serverless entry: all /api/* requests are rewritten here (see vercel.json).
 * Forwards to the shared Express app from backend/app (feeds, admin, weirdling, health).
 * Restores req.url from rewrite query param so Express sees /api/feeds etc.
 */
import { app } from '../backend/app';
import type { IncomingMessage, ServerResponse } from 'node:http';

type ReqWithQuery = IncomingMessage & { query?: Record<string, string> };

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const r = req as ReqWithQuery;
  const pathSeg = r.query?.path;
  if (pathSeg != null && pathSeg !== '') {
    const rawUrl = req.url ?? '';
    const qsPart = rawUrl.includes('?')
      ? rawUrl.slice(rawUrl.indexOf('?') + 1)
      : '';
    const params = new URLSearchParams(qsPart);
    params.delete('path');
    const qs = params.toString() ? '?' + params.toString() : '';
    (req as { url?: string }).url = `/api/${decodeURIComponent(pathSeg)}${qs}`;
  }
  app(req, res);
}
