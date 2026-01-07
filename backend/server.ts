// src/backend

import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const PORT = Number(process.env.PORT || 3001);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test';

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in backend env');
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in backend env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
app.use(cors());
app.use(express.json());

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
};

app.get('/api/admin/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get(
  '/api/admin/profiles',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const status = String(req.query.status || 'pending');
      const q = String(req.query.q || '').trim();
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
      const offset = Math.max(0, Number(req.query.offset || 0));
      const sort =
        req.query.sort === 'updated_at' ? 'updated_at' : 'created_at';
      const order = req.query.order === 'desc' ? 'desc' : 'asc';

      let query = supabase
        .from('profiles')
        .select(
          'id, handle, status, created_at, updated_at, pronouns, geek_creds, nerd_creds, socials, reviewed_at, reviewed_by',
          { count: 'exact' },
        );

      if (status !== 'all') query = query.eq('status', status);

      if (q) {
        const safeQ = q.replace(/[(),]/g, '');
        query = query.or(`handle.ilike.*${safeQ}*,id.eq.${safeQ}`);
      }

      query = query.order(sort, { ascending: order === 'asc' });

      const from = offset;
      const to = offset + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) return res.status(400).json({ message: error.message });

      return res.json({ data: data || [], count: count || 0 });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Server error';
      return res.status(500).json({ message });
    }
  },
);

const updateStatus = async (ids: string[], nextStatus: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) throw error;
};

app.post(
  '/api/admin/profiles/approve',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? (req.body.ids as string[])
        : [];

      if (!ids.length) {
        return res.status(400).json({ message: 'No ids provided' });
      }

      await updateStatus(ids, 'approved');
      return res.json({ ok: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Approve failed';
      return res.status(400).json({ message });
    }
  },
);

app.post(
  '/api/admin/profiles/reject',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? (req.body.ids as string[])
        : [];

      if (!ids.length) {
        return res.status(400).json({ message: 'No ids provided' });
      }

      await updateStatus(ids, 'rejected');
      return res.json({ ok: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Reject failed';
      return res.status(400).json({ message });
    }
  },
);

app.post(
  '/api/admin/profiles/disable',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? (req.body.ids as string[])
        : [];

      if (!ids.length) {
        return res.status(400).json({ message: 'No ids provided' });
      }

      await updateStatus(ids, 'disabled');
      return res.json({ ok: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Disable failed';
      return res.status(400).json({ message });
    }
  },
);

app.post(
  '/api/admin/profiles/delete',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? (req.body.ids as string[])
        : [];

      const hardDeleteAuthUsers = Boolean(req.body?.hardDeleteAuthUsers);

      if (!ids.length) {
        return res.status(400).json({ message: 'No ids provided' });
      }

      const { error: delProfilesErr } = await supabase
        .from('profiles')
        .delete()
        .in('id', ids);

      if (delProfilesErr) throw delProfilesErr;

      if (hardDeleteAuthUsers) {
        for (const id of ids) {
          const { error } = await supabase.auth.admin.deleteUser(id);
          if (error) throw error;
        }
      }

      return res.json({ ok: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Delete failed';
      return res.status(400).json({ message });
    }
  },
);

app.listen(PORT, () => {
  console.log(`Admin API listening on http://localhost:${PORT}`);
});
