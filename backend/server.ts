import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import {
  mockWeirdlingAdapter,
  getPromptVersion,
  getModelVersion,
} from './weirdling/adapter';
import { validateWeirdlingResponse } from './weirdling/validate';
import { checkRateLimit } from './weirdling/rateLimit';

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
type AuthRequest = Request & { userId?: string };

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
    return res.status(500).json({ error: errorMessage(e, 'Server error') });
  }
};

const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bearer = pickBearer(req);
    if (!bearer) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { data, error } = await adminSupabase.auth.getUser(bearer);
    if (error || !data.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = data.user.id;
    next();
  } catch (e: unknown) {
    return res.status(500).json({ error: errorMessage(e, 'Server error') });
  }
};

// --- Weirdling generator (MVP-aligned) ---
const PROMPT_VERSION = getPromptVersion();
const MODEL_VERSION = getModelVersion();

const handleWeirdlingGenerate = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const rl = checkRateLimit(userId);
  if (!rl.allowed) {
    return res.status(429).json({
      error: 'Too many generations. Please try again later.',
      retryAfter: rl.retryAfter,
    });
  }

  const body = req.body as Record<string, unknown>;
  const idempotencyKey =
    typeof body.idempotency_key === 'string' && body.idempotency_key.trim()
      ? body.idempotency_key.trim()
      : null;

  const displayNameOrHandle =
    typeof body.displayNameOrHandle === 'string'
      ? body.displayNameOrHandle.trim()
      : '';
  const roleVibe =
    typeof body.roleVibe === 'string' ? body.roleVibe.trim() : '';
  const industryOrInterests = Array.isArray(body.industryOrInterests)
    ? (body.industryOrInterests as unknown[]).map(String).filter(Boolean)
    : [];
  const tone =
    typeof body.tone === 'number' && Number.isFinite(body.tone)
      ? body.tone
      : 0.5;
  const boundaries =
    typeof body.boundaries === 'string' ? body.boundaries.trim() : '';
  const bioSeed =
    typeof body.bioSeed === 'string' ? body.bioSeed.trim() : undefined;
  const includeImage =
    typeof body.includeImage === 'boolean' ? body.includeImage : false;

  if (!displayNameOrHandle || !roleVibe) {
    return res.status(400).json({
      error: 'Missing required fields: displayNameOrHandle, roleVibe',
    });
  }

  let jobId: string | null = null;
  if (idempotencyKey) {
    const { data: existing } = await adminSupabase
      .from('generation_jobs')
      .select('id, status, raw_response')
      .eq('user_id', userId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing?.status === 'complete' && existing.raw_response) {
      try {
        const validated = validateWeirdlingResponse(
          existing.raw_response as Record<string, unknown>,
        );
        return res.json({
          ok: true,
          jobId: existing.id,
          preview: {
            displayName: validated.displayName,
            handle: validated.handle,
            roleVibe: validated.roleVibe,
            industryTags: validated.industryTags,
            tone: validated.tone,
            tagline: validated.tagline,
            boundaries: validated.boundaries,
            bio: validated.bio,
            avatarUrl: validated.avatarUrl,
            promptVersion: validated.promptVersion,
            modelVersion: validated.modelVersion,
          },
        });
      } catch {
        // fall through to regenerate
      }
    }
  }

  const { data: job, error: jobErr } = await adminSupabase
    .from('generation_jobs')
    .insert({
      user_id: userId,
      status: 'running',
      idempotency_key: idempotencyKey,
      prompt_version: PROMPT_VERSION,
      model_version: MODEL_VERSION,
    })
    .select('id')
    .single();

  if (jobErr || !job?.id) {
    return res
      .status(500)
      .json({ error: jobErr?.message ?? 'Failed to create job' });
  }
  jobId = job.id;

  try {
    const result = await mockWeirdlingAdapter.generate({
      displayNameOrHandle,
      roleVibe,
      industryOrInterests,
      tone,
      boundaries,
      bioSeed,
      includeImage,
      promptVersion: PROMPT_VERSION,
    });

    const validated = validateWeirdlingResponse({
      ...result.rawResponse,
      promptVersion: PROMPT_VERSION,
      modelVersion: result.modelVersion,
    });

    await adminSupabase
      .from('generation_jobs')
      .update({
        status: 'complete',
        raw_response: validated.rawResponse,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return res.json({
      ok: true,
      jobId,
      preview: {
        displayName: validated.displayName,
        handle: validated.handle,
        roleVibe: validated.roleVibe,
        industryTags: validated.industryTags,
        tone: validated.tone,
        tagline: validated.tagline,
        boundaries: validated.boundaries,
        bio: validated.bio,
        avatarUrl: validated.avatarUrl,
        promptVersion: validated.promptVersion,
        modelVersion: validated.modelVersion,
      },
    });
  } catch (err) {
    const msg = errorMessage(err, 'Generation failed');
    await adminSupabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    return res.status(422).json({ error: msg });
  }
};

app.post('/api/weirdling/generate', requireAuth, handleWeirdlingGenerate);
app.post('/api/weirdling/regenerate', requireAuth, handleWeirdlingGenerate);

app.post(
  '/api/weirdling/save',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body as Record<string, unknown>;

    if (typeof body.jobId === 'string' && body.jobId.trim()) {
      const jobId = body.jobId.trim();
      const { data: job, error: jobError } = await adminSupabase
        .from('generation_jobs')
        .select('raw_response')
        .eq('id', jobId)
        .eq('user_id', userId)
        .eq('status', 'complete')
        .maybeSingle();

      if (jobError || !job?.raw_response) {
        return res.status(400).json({
          error: 'Job not found or not complete',
        });
      }

      let validated;
      try {
        validated = validateWeirdlingResponse(
          job.raw_response as Record<string, unknown>,
        );
      } catch (e) {
        return res.status(400).json({
          error: errorMessage(e, 'Invalid job response'),
        });
      }

      const { error: upsertErr } = await adminSupabase
        .from('weirdlings')
        .upsert(
          {
            user_id: userId,
            display_name: validated.displayName,
            handle: validated.handle,
            role_vibe: validated.roleVibe,
            industry_tags: validated.industryTags,
            tone: validated.tone,
            tagline: validated.tagline,
            boundaries: validated.boundaries,
            bio: validated.bio ?? null,
            avatar_url: validated.avatarUrl ?? null,
            raw_ai_response: validated.rawResponse,
            prompt_version: validated.promptVersion,
            model_version: validated.modelVersion,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );

      if (upsertErr) {
        return res.status(500).json({ error: upsertErr.message });
      }
      return res.json({ ok: true });
    }

    // Save from preview payload
    const displayName =
      typeof body.displayName === 'string' ? body.displayName.trim() : '';
    const handle = typeof body.handle === 'string' ? body.handle.trim() : '';
    const roleVibe =
      typeof body.roleVibe === 'string' ? body.roleVibe.trim() : '';
    const industryTags = Array.isArray(body.industryTags)
      ? (body.industryTags as unknown[]).map(String).filter(Boolean)
      : [];
    const tone =
      typeof body.tone === 'number' && Number.isFinite(body.tone)
        ? body.tone
        : 0.5;
    const tagline = typeof body.tagline === 'string' ? body.tagline.trim() : '';
    const boundaries =
      typeof body.boundaries === 'string' ? body.boundaries.trim() : '';
    const bio = typeof body.bio === 'string' ? body.bio.trim() : undefined;

    if (!displayName || !handle || !roleVibe || !tagline) {
      return res.status(400).json({
        error: 'Missing required preview fields',
      });
    }

    const { error: upsertErr } = await adminSupabase.from('weirdlings').upsert(
      {
        user_id: userId,
        display_name: displayName,
        handle,
        role_vibe: roleVibe,
        industry_tags: industryTags,
        tone,
        tagline,
        boundaries,
        bio: bio ?? null,
        avatar_url: (body.avatarUrl as string | null) ?? null,
        prompt_version: (body.promptVersion as string) ?? PROMPT_VERSION,
        model_version: (body.modelVersion as string) ?? MODEL_VERSION,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (upsertErr) {
      return res.status(500).json({ error: upsertErr.message });
    }
    return res.json({ ok: true });
  },
);

app.get(
  '/api/weirdling/me',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await adminSupabase
      .from('weirdlings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No Weirdling found' });

    return res.json({
      ok: true,
      weirdling: {
        id: data.id,
        userId: data.user_id,
        displayName: data.display_name,
        handle: data.handle,
        roleVibe: data.role_vibe,
        industryTags: data.industry_tags ?? [],
        tone: Number(data.tone),
        tagline: data.tagline,
        boundaries: data.boundaries ?? '',
        bio: data.bio ?? undefined,
        avatarUrl: data.avatar_url ?? undefined,
        promptVersion: data.prompt_version,
        modelVersion: data.model_version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  },
);

// GET /api/admin/profiles?status=pending&q=&limit=25&offset=0&sort=created_at&order=asc
app.get(
  '/api/admin/profiles',
  requireAdmin,
  async (req: Request, res: Response) => {
    const status = normalizeStatus(String(req.query.status || 'pending'));

    const qRaw = String(req.query.q || '').trim();
    // PostgREST .or() uses a comma-delimited syntax; keep user input from breaking it.
    const q = qRaw.replaceAll(',', ' ').trim();

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    const sortRaw = String(req.query.sort || 'created_at');
    const sort: SortField =
      sortRaw === 'updated_at' ? 'updated_at' : 'created_at';

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
  },
);

type BulkIds = { ids: string[] };

type BulkDelete = { ids: string[]; hardDeleteAuthUsers?: boolean };

const requireIds = (body: unknown): string[] => {
  if (!body || typeof body !== 'object') return [];
  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return ids.map(String).filter(Boolean);
};

// Bulk approve
app.post(
  '/api/admin/profiles/approve',
  requireAdmin,
  async (req: Request, res: Response) => {
    const ids = requireIds(req.body as BulkIds);
    if (ids.length === 0)
      return res.status(400).json({ error: 'Missing ids[]' });

    const { error } = await adminSupabase
      .from('profiles')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  },
);

// Bulk reject
app.post(
  '/api/admin/profiles/reject',
  requireAdmin,
  async (req: Request, res: Response) => {
    const ids = requireIds(req.body as BulkIds);
    if (ids.length === 0)
      return res.status(400).json({ error: 'Missing ids[]' });

    const { error } = await adminSupabase
      .from('profiles')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  },
);

// Bulk disable
app.post(
  '/api/admin/profiles/disable',
  requireAdmin,
  async (req: Request, res: Response) => {
    const ids = requireIds(req.body as BulkIds);
    if (ids.length === 0)
      return res.status(400).json({ error: 'Missing ids[]' });

    const { error } = await adminSupabase
      .from('profiles')
      .update({
        status: 'disabled',
        reviewed_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  },
);

// Bulk delete (optionally also delete auth.users)
app.post(
  '/api/admin/profiles/delete',
  requireAdmin,
  async (req: Request, res: Response) => {
    const body = req.body as BulkDelete;
    const ids = requireIds(body);
    if (ids.length === 0)
      return res.status(400).json({ error: 'Missing ids[]' });

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
  },
);

// GET /api/feeds — LinkedIn-inspired activity stream (authenticated, cursor pagination)
app.get('/api/feeds', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const cursorRaw =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : null;
  let cursorCreatedAt: string | null = null;
  let cursorId: string | null = null;
  if (cursorRaw) {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursorRaw, 'base64').toString('utf8'),
      ) as { created_at?: string; id?: string };
      cursorCreatedAt =
        typeof decoded.created_at === 'string' ? decoded.created_at : null;
      cursorId = typeof decoded.id === 'string' ? decoded.id : null;
    } catch {
      // ignore invalid cursor
    }
  }

  const { data: rows, error } = await adminSupabase.rpc('get_feed_page', {
    p_viewer_id: userId,
    p_cursor_created_at: cursorCreatedAt,
    p_cursor_id: cursorId,
    p_limit: limit + 1,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const list = Array.isArray(rows) ? rows : [];
  const hasMore = list.length > limit;
  const page = hasMore ? list.slice(0, limit) : list;
  const last = page[page.length - 1] as
    | { created_at?: string; id?: string }
    | undefined;
  const nextCursor =
    hasMore && last?.created_at && last?.id
      ? Buffer.from(
          JSON.stringify({
            created_at: last.created_at,
            id: last.id,
          }),
          'utf8',
        ).toString('base64')
      : undefined;

  const data = page.map(
    (row: {
      id?: string;
      user_id?: string;
      kind?: string;
      payload?: unknown;
      parent_id?: string | null;
      created_at?: string;
      actor_handle?: string | null;
      actor_display_name?: string | null;
      actor_avatar?: string | null;
    }) => ({
      id: row.id,
      user_id: row.user_id,
      kind: row.kind,
      payload: row.payload ?? {},
      parent_id: row.parent_id ?? null,
      created_at: row.created_at,
      actor: {
        handle: row.actor_handle ?? null,
        display_name: row.actor_display_name ?? null,
        avatar: row.actor_avatar ?? null,
      },
    }),
  );

  return res.json({ data, nextCursor });
});

// POST /api/feeds — create a new feed item (post or external_link)
app.post('/api/feeds', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const body = req.body as Record<string, unknown>;
  const rawKind =
    typeof body.kind === 'string' ? body.kind.trim().toLowerCase() : 'post';

  if (rawKind !== 'post' && rawKind !== 'external_link') {
    return res.status(400).json({ error: 'Unsupported kind' });
  }

  if (rawKind === 'post') {
    const textRaw =
      typeof body.body === 'string'
        ? body.body
        : typeof body.text === 'string'
          ? body.text
          : '';
    const text = textRaw.trim();
    if (!text) {
      return res
        .status(400)
        .json({ error: 'Post body is required', field: 'body' });
    }

    const { error } = await adminSupabase.from('feed_items').insert({
      user_id: userId,
      kind: 'post',
      payload: { body: text },
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ ok: true });
  }

  // external_link
  const url = typeof body.url === 'string' ? body.url.trim() : ('' as string);
  const label = typeof body.label === 'string' ? body.label.trim() : undefined;

  if (!url) {
    return res.status(400).json({ error: 'URL is required', field: 'url' });
  }

  // Guardrail: treat URL as opaque metadata; do not fetch or scrape it.
  const payload: Record<string, string> = { url };
  if (label) payload.label = label;

  const { error } = await adminSupabase.from('feed_items').insert({
    user_id: userId,
    kind: 'external_link',
    payload,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ ok: true });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[API] listening on http://localhost:${PORT}`);
});
