import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const PORT = Number(process.env.PORT || 3001);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in backend env');
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in backend env');
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);

app.use(express.json());

type AdminRequest = Request & { adminEmail?: string };

type Status = 'pending' | 'approved' | 'rejected' | 'disabled';

type SortField = 'created_at' | 'updated_at';

const normalizeStatus = (s: string): Status | 'all' => {
  const v = s.toLowerCase();
  if (v === 'all') return 'all';
  if (v === 'approved') return 'approved';
  if (v === 'rejected') return 'rejected';
  if (v === 'disabled') return 'disabled';
  return 'pending';
};

const pickBearer = (req: Request) => {
  const h = req.headers.authorization;
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
};

const errorMessage = (e: unknown, fallback: string) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string' && e.trim()) return e;
  return fallback;
};

const requireAdmin = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1) Preferred: Supabase access token in Authorization: Bearer <jwt>
    const bearer = pickBearer(req);
    if (bearer) {
      const { data, error } = await adminSupabase.auth.getUser(bearer);
      if (error || !data.user?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const email = data.user.email;

      const { data: allowRow, error: allowErr } = await adminSupabase
        .from('admin_allowlist')
        .select('email')
        .ilike('email', email)
        .maybeSingle();

      if (allowErr) {
        return res.status(500).json({ error: allowErr.message });
      }

      if (!allowRow?.email) {
        return res.status(403).json({ error: `Forbidden: ${email}` });
      }

      req.adminEmail = email;
      return next();
    }

    // 2) Fallback: legacy token header
    const token = String(req.header('x-admin-token') || '').trim();
    if (token && ADMIN_TOKEN && token === ADMIN_TOKEN) return next();

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (e: unknown) {
    return res
      .status(500)
      .json({ error: errorMessage(e, 'Server error') });
  }
};

// GET /api/admin/profiles?status=pending&q=&limit=25&offset=0&sort=created_at&order=asc
app.get('/api/admin/profiles', requireAdmin, async (req: Request, res: Response) => {
  const status = normalizeStatus(String(req.query.status || 'pending'));

  const qRaw = String(req.query.q || '').trim();
  // PostgREST .or() uses a comma-delimited syntax; keep user input from breaking it.
  const q = qRaw.replaceAll(',', ' ').trim();

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
  const offset = Math.max(0, Number(req.query.offset || 0));

  const sortRaw = String(req.query.sort || 'created_at');
  const sort: SortField = sortRaw === 'updated_at' ? 'updated_at' : 'created_at';

  const orderRaw = String(req.query.order || 'asc').toLowerCase();
  const ascending = orderRaw !== 'desc';

  let query = adminSupabase.from('profiles').select('*', { count: 'exact' });

  if (status !== 'all') query = query.eq('status', status);

  if (q) {
    // UUID columns in Postgres do not support ILIKE. If q looks like a UUID, match id exactly.
    if (isUuid) {
      query = query.or(`handle.ilike.%${q}%,id.eq.${q}`);
    } else {
      query = query.or(`handle.ilike.%${q}%`);
    }
  }

  query = query.order(sort, { ascending });
  query = query.range(offset, offset + (limit - 1));

  const { data, error, count } = await query;

  if (error) return res.status(500).json({ error: error.message });

  // IMPORTANT: UI expects { data, count } (not rows)
  return res.json({
    data: data ?? [],
    count: count ?? 0,
  });
});

type BulkIds = { ids: string[] };

type BulkDelete = { ids: string[]; hardDeleteAuthUsers?: boolean };

const requireIds = (body: unknown): string[] => {
  if (!body || typeof body !== 'object') return [];
  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return ids.map(String).filter(Boolean);
};

// Bulk approve
app.post('/api/admin/profiles/approve', requireAdmin, async (req: Request, res: Response) => {
  const ids = requireIds(req.body as BulkIds);
  if (ids.length === 0) return res.status(400).json({ error: 'Missing ids[]' });

  const { error } = await adminSupabase
    .from('profiles')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// Bulk reject
app.post('/api/admin/profiles/reject', requireAdmin, async (req: Request, res: Response) => {
  const ids = requireIds(req.body as BulkIds);
  if (ids.length === 0) return res.status(400).json({ error: 'Missing ids[]' });

  const { error } = await adminSupabase
    .from('profiles')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// Bulk disable
app.post('/api/admin/profiles/disable', requireAdmin, async (req: Request, res: Response) => {
  const ids = requireIds(req.body as BulkIds);
  if (ids.length === 0) return res.status(400).json({ error: 'Missing ids[]' });

  const { error } = await adminSupabase
    .from('profiles')
    .update({
      status: 'disabled',
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// Bulk delete (optionally also delete auth.users)
app.post('/api/admin/profiles/delete', requireAdmin, async (req: Request, res: Response) => {
  const body = req.body as BulkDelete;
  const ids = requireIds(body);
  if (ids.length === 0) return res.status(400).json({ error: 'Missing ids[]' });

  // Delete profiles first
  const { error: profErr } = await adminSupabase
    .from('profiles')
    .delete()
    .in('id', ids);
  if (profErr) return res.status(500).json({ error: profErr.message });

  // Optionally delete auth users (dangerous)
  if (body.hardDeleteAuthUsers) {
    for (const id of ids) {
      try {
        await adminSupabase.auth.admin.deleteUser(id);
      } catch {
        // Ignore individual failures to avoid partial delete blocking the rest
      }
    }
  }

  return res.json({ ok: true });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[API] listening on http://localhost:${PORT}`);
});
