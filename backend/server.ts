/**
 * Local dev: run this file to start the API on PORT (default 3001).
 * Vite proxies /api to this server. For production on Vercel, the same app
 * is mounted via api/[[...path]].ts (serverless).
 */
import 'dotenv/config';
import { app } from './app';

const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, () => {
  console.log(`[API] listening on http://localhost:${PORT}`);
});
