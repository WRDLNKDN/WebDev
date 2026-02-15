/**
 * Vercel serverless entry: all /api/* requests are rewritten here (see vercel.json).
 * Explicit Node (req, res) handler so POST body and all methods are preserved.
 * Path restoration from rewrite query is done here and in backend/app.ts middleware.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../backend/app.js';

function restorePath(req: IncomingMessage): void {
  const url = req.url ?? '';
  const pathMatch = url.match(/[?&]path=([^&]+)/);
  const pathSeg = pathMatch ? decodeURIComponent(pathMatch[1]) : '';
  if (pathSeg && url.startsWith('/api')) {
    const qsPart = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    const params = new URLSearchParams(qsPart);
    params.delete('path');
    const qs = params.toString() ? '?' + params.toString() : '';
    (req as IncomingMessage & { url: string }).url = `/api/${pathSeg}${qs}`;
  }
}

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  restorePath(req);
  app(req, res);
}
