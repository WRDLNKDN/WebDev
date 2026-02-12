/**
 * Vercel serverless entry: all /api/* requests are rewritten here (see vercel.json).
 * Export the Express app so Vercel invokes it for all HTTP methods (GET, POST, etc.).
 * Path restoration from rewrite query is done in backend/app.ts middleware.
 */
import { app } from '../backend/app.js';

export default app;
