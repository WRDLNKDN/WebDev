import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const PORT = Number(process.env.PORT || 3001);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test';

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in backend env');
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in backend env');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
app.use(cors());
app.use(express.json());

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

app.get('/api/admin/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/admin/profiles', requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || 'pending');
    const q = String(req.query.q || '').trim();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const sort = req.query.sort === 'updated_at' ? 'updated_at' : 'created_at';
    const order = req.query.order === 'desc' ? 'desc' : 'asc';

    let query = supabase
      .from('profiles')
      .select(
        'id, handle, status, created_at, updated_at, pronouns, geek_creds, nerd_creds, socials, reviewed_at, reviewed_by',
        { count: 'exact' },
      );

    if (status !== 'all') query = query.eq('status', status);

    if (q) {
      // handle search + id search (best-effort)
      // This OR works in PostgREST: or=(handle.ilike.*q*,id.eq.q)
      query = query.or(`handle.ilike.*${q}*,id.eq.${q}`);
    }

    query = query.order(sort, { ascending: order === 'asc' });

    const from = offset;
    const to = offset + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) return res.status(400).json({ message: error.message });

    res.json({ data: data || [], count: count || 0 });
  } catch (e) {
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

async function updateStatus(ids, nextStatus) {
  const { error } = await supabase
    .from('profiles')
    .update({
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
      // reviewed_by left null unless you wire real admin identity later
    })
    .in('id', ids);

  if (error) throw error;
}

app.post('/api/admin/profiles/approve', requireAdmin, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ message: 'No ids provided' });
    await updateStatus(ids, 'approved');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e?.message || 'Approve failed' });
  }
});

app.post('/api/admin/profiles/reject', requireAdmin, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ message: 'No ids provided' });
    await updateStatus(ids, 'rejected');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e?.message || 'Reject failed' });
  }
});

app.post('/api/admin/profiles/disable', requireAdmin, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ message: 'No ids provided' });
    await updateStatus(ids, 'disabled');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e?.message || 'Disable failed' });
  }
});

app.post('/api/admin/profiles/delete', requireAdmin, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const hardDeleteAuthUsers = Boolean(req.body?.hardDeleteAuthUsers);

    if (!ids.length) return res.status(400).json({ message: 'No ids provided' });

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

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e?.message || 'Delete failed' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Admin API listening on http://localhost:${PORT}`);
});