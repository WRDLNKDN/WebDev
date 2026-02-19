import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import {
  mockWeirdlingAdapter,
  getPromptVersion,
  getModelVersion,
} from './weirdling/adapter.js';
import { validateWeirdlingResponse } from './weirdling/validate.js';
import { checkRateLimit } from './weirdling/rateLimit.js';
import { getFirstUrl, fetchLinkPreview } from './linkPreview.js';
import {
  checkDirectoryRateLimit,
  type DirectoryRateLimitAction,
} from './directory/rateLimit.js';
import {
  logDirectoryRequest,
  logDirectoryRateLimit,
  logDirectoryError,
} from './directory/logger.js';

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

const corsOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://wrdlnkdn.vercel.app',
];
const vercelUrl = process.env.VERCEL_URL;
if (vercelUrl) {
  corsOrigins.push(`https://${vercelUrl}`, `https://www.${vercelUrl}`);
}

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

app.use(express.json());

// Vercel rewrites send /api/:path* to /api with path in query; restore req.url so routes match
app.use((req: Request, _res: Response, next: NextFunction) => {
  const q = req.query?.path;
  const pathSeg = Array.isArray(q) ? q[0] : q;
  if (pathSeg && typeof pathSeg === 'string' && req.url?.startsWith('/api')) {
    const raw = req.url;
    const qsPart = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
    const params = new URLSearchParams(qsPart);
    params.delete('path');
    const qs = params.toString() ? '?' + params.toString() : '';
    (req as Request & { url: string }).url =
      `/api/${decodeURIComponent(pathSeg)}${qs}`;
  }
  next();
});

type AdminRequest = Request & { adminEmail?: string; adminUserId?: string };
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
      req.adminUserId = data.user.id;
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

      const { error: insertErr } = await adminSupabase
        .from('weirdlings')
        .insert({
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
        });

      if (insertErr) {
        return res.status(500).json({ error: insertErr.message });
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

    const { error: insertErr } = await adminSupabase.from('weirdlings').insert({
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
    });

    if (insertErr) {
      return res.status(500).json({ error: insertErr.message });
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

    const { data: rows, error } = await adminSupabase
      .from('weirdlings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const weirdlings = (rows ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      handle: row.handle,
      roleVibe: row.role_vibe,
      industryTags: row.industry_tags ?? [],
      tone: Number(row.tone),
      tagline: row.tagline,
      boundaries: row.boundaries ?? '',
      bio: row.bio ?? undefined,
      avatarUrl: row.avatar_url ?? undefined,
      promptVersion: row.prompt_version,
      modelVersion: row.model_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({ ok: true, weirdlings });
  },
);

app.delete(
  '/api/weirdling/me/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const id = (req.params as { id?: string }).id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!id) return res.status(400).json({ error: 'Missing weirdling id' });

    const { error } = await adminSupabase
      .from('weirdlings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
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
  try {
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

    const { data: prefRow } = await adminSupabase
      .from('profiles')
      .select('feed_view_preference')
      .eq('id', userId)
      .maybeSingle();

    const feedView =
      (prefRow as { feed_view_preference?: string } | null)
        ?.feed_view_preference === 'connections'
        ? 'connections'
        : 'anyone';

    const { data: rows, error } = await adminSupabase.rpc('get_feed_page', {
      p_viewer_id: userId,
      p_cursor_created_at: cursorCreatedAt,
      p_cursor_id: cursorId,
      p_limit: limit + 1,
      p_feed_view: feedView,
    });

    if (error) {
      console.error(
        '[GET /api/feeds] Supabase RPC error:',
        error.message,
        error,
      );
      return res.status(500).json({
        error:
          error.message ||
          'Feed could not be loaded. Ensure Supabase migrations are applied ' +
            '(feed_items, feed_connections, get_feed_page).',
      });
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
        like_count?: number | string | null;
        love_count?: number | string | null;
        inspiration_count?: number | string | null;
        care_count?: number | string | null;
        viewer_reaction?: string | null;
        comment_count?: number | string | null;
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
        like_count: Number(row.like_count ?? 0),
        love_count: Number(row.love_count ?? 0),
        inspiration_count: Number(row.inspiration_count ?? 0),
        care_count: Number(row.care_count ?? 0),
        viewer_reaction: row.viewer_reaction ?? null,
        comment_count: Number(row.comment_count ?? 0),
      }),
    );

    return res.json({ data, nextCursor });
  } catch (e: unknown) {
    console.error('[GET /api/feeds] Unhandled error:', e);
    return res
      .status(500)
      .json({ error: errorMessage(e, 'Feed could not be loaded.') });
  }
});

// POST /api/feeds — create a new feed item (post or external_link)
app.post('/api/feeds', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const body = req.body as Record<string, unknown>;
  const rawKind =
    typeof body.kind === 'string' ? body.kind.trim().toLowerCase() : 'post';

  if (
    rawKind !== 'post' &&
    rawKind !== 'external_link' &&
    rawKind !== 'reaction' &&
    rawKind !== 'repost'
  ) {
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

    const payload: {
      body: string;
      link_preview?: import('./linkPreview.js').LinkPreview;
    } = {
      body: text,
    };
    const firstUrl = getFirstUrl(text);
    if (firstUrl) {
      const linkPreview = await fetchLinkPreview(firstUrl);
      if (linkPreview) payload.link_preview = linkPreview;
    }

    const { error } = await adminSupabase.from('feed_items').insert({
      user_id: userId,
      kind: 'post',
      payload,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ ok: true });
  }

  if (rawKind === 'reaction') {
    const parentId =
      typeof body.parent_id === 'string' ? body.parent_id.trim() : null;
    const type =
      typeof body.type === 'string' ? body.type.trim().toLowerCase() : '';
    const emojiTypes = ['like', 'love', 'inspiration', 'care'];
    const isEmoji = emojiTypes.includes(type);
    if (!parentId || (type !== 'comment' && !isEmoji)) {
      return res.status(400).json({
        error:
          'parent_id and type (like|love|inspiration|care|comment) required',
      });
    }
    const payload: Record<string, string> = { type };
    if (type === 'comment') {
      const commentBody = typeof body.body === 'string' ? body.body.trim() : '';
      if (!commentBody) {
        return res
          .status(400)
          .json({ error: 'Comment body required', field: 'body' });
      }
      payload.body = commentBody;
    }
    if (isEmoji) {
      await adminSupabase
        .from('feed_items')
        .delete()
        .eq('parent_id', parentId)
        .eq('user_id', userId)
        .or(
          'payload->>type.eq.like,payload->>type.eq.love,payload->>type.eq.inspiration,payload->>type.eq.care',
        );
    }
    const { error } = await adminSupabase.from('feed_items').insert({
      user_id: userId,
      kind: 'reaction',
      parent_id: parentId,
      payload,
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (rawKind === 'repost') {
    const originalId =
      typeof body.original_id === 'string' ? body.original_id.trim() : null;
    if (!originalId) {
      return res.status(400).json({ error: 'original_id required for repost' });
    }
    const { data: original, error: fetchErr } = await adminSupabase
      .from('feed_items')
      .select('id, payload, created_at, user_id')
      .eq('id', originalId)
      .single();
    if (fetchErr || !original) {
      return res.status(404).json({ error: 'Original post not found' });
    }
    const op = original.payload as Record<string, unknown> | null;
    const { data: author } = await adminSupabase
      .from('profiles')
      .select('handle, display_name, avatar')
      .eq('id', original.user_id)
      .single();
    let avatar: string | null = null;
    const { data: w } = await adminSupabase
      .from('weirdlings')
      .select('avatar_url')
      .eq('user_id', original.user_id)
      .eq('is_active', true)
      .maybeSingle();
    if (w?.avatar_url) avatar = w.avatar_url;
    else if (author && (author as { avatar?: string }).avatar)
      avatar = (author as { avatar: string }).avatar;
    const snapshot = {
      body: (op?.body as string) ?? (op?.text as string) ?? '',
      created_at: original.created_at,
      actor_handle: (author as { handle?: string })?.handle ?? null,
      actor_display_name:
        (author as { display_name?: string })?.display_name ?? null,
      actor_avatar: avatar,
    };
    const { error } = await adminSupabase.from('feed_items').insert({
      user_id: userId,
      kind: 'repost',
      payload: { original_id: originalId, snapshot },
    });
    if (error) return res.status(500).json({ error: error.message });
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

// DELETE /api/feeds/items/:postId/reaction — remove viewer's emoji reaction on a post
app.delete(
  '/api/feeds/items/:postId/reaction',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const postIdRaw = req.params.postId;
    const postId = typeof postIdRaw === 'string' ? postIdRaw.trim() : '';
    if (!postId) return res.status(400).json({ error: 'Invalid post id' });
    const { error } = await adminSupabase
      .from('feed_items')
      .delete()
      .eq('kind', 'reaction')
      .eq('parent_id', postId)
      .eq('user_id', userId)
      .or(
        'payload->>type.eq.like,payload->>type.eq.love,payload->>type.eq.inspiration,payload->>type.eq.care',
      );
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).send();
  },
);

// GET /api/feeds/items/:postId/comments — list comments for a post
app.get(
  '/api/feeds/items/:postId/comments',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const postIdRaw = req.params.postId;
    const postId = typeof postIdRaw === 'string' ? postIdRaw.trim() : '';
    if (!postId) return res.status(400).json({ error: 'Invalid post id' });
    const { data: rows, error } = await adminSupabase
      .from('feed_items')
      .select('id, user_id, payload, created_at')
      .eq('kind', 'reaction')
      .eq('parent_id', postId)
      .eq('payload->>type', 'comment')
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    const comments = rows ?? [];
    const userIds = [
      ...new Set((comments as { user_id: string }[]).map((c) => c.user_id)),
    ];
    const profilesMap: Record<
      string,
      { handle?: string; display_name?: string; avatar?: string }
    > = {};
    const weirdlingsMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, handle, display_name, avatar')
        .in('id', userIds);
      for (const p of profiles ?? []) {
        const id = (p as { id: string }).id;
        profilesMap[id] = p as {
          handle?: string;
          display_name?: string;
          avatar?: string;
        };
      }
      const { data: weirdlings } = await adminSupabase
        .from('weirdlings')
        .select('user_id, avatar_url')
        .in('user_id', userIds)
        .eq('is_active', true);
      for (const w of weirdlings ?? []) {
        const uid = (w as { user_id: string }).user_id;
        weirdlingsMap[uid] =
          (w as { avatar_url: string | null }).avatar_url ?? null;
      }
    }
    const list = comments.map((r: Record<string, unknown>) => {
      const uid = r.user_id as string;
      const p = profilesMap[uid];
      const avatar = weirdlingsMap[uid] ?? p?.avatar ?? null;
      return {
        id: r.id,
        user_id: r.user_id,
        body: (r.payload as Record<string, unknown>)?.body ?? '',
        created_at: r.created_at,
        actor: {
          handle: p?.handle ?? null,
          display_name: p?.display_name ?? null,
          avatar: avatar ?? null,
        },
      };
    });
    return res.json({ data: list });
  },
);

// --- Directory EPIC: Member discovery (authenticated only) ---
// Rate limit + structured logging (NFR #265, #266)
const directoryRateLimitAndLog = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const userId = req.userId;
  if (!userId) {
    next();
    return;
  }
  const action: DirectoryRateLimitAction =
    req.method === 'GET' ? 'list' : 'action';
  const rl = checkDirectoryRateLimit(userId, action);
  if (!rl.allowed) {
    logDirectoryRateLimit({
      userId,
      action,
      retryAfter: rl.retryAfter,
    });
    if (rl.retryAfter) res.setHeader('Retry-After', String(rl.retryAfter));
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: rl.retryAfter,
    });
    return;
  }
  const start = Date.now();
  res.on('finish', () => {
    logDirectoryRequest({
      method: req.method,
      path: req.path || req.url?.split('?')[0] || '/api/directory',
      userId,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
};

app.use('/api/directory', requireAuth, directoryRateLimitAndLog);

app.get('/api/directory', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const search =
    typeof req.query.q === 'string' ? req.query.q.trim() || null : null;
  const industry =
    typeof req.query.industry === 'string'
      ? req.query.industry.trim() || null
      : null;
  const location =
    typeof req.query.location === 'string'
      ? req.query.location.trim() || null
      : null;
  const connectionStatus =
    typeof req.query.connection_status === 'string'
      ? req.query.connection_status.trim() || null
      : null;
  const sort =
    typeof req.query.sort === 'string' &&
    ['recently_active', 'alphabetical', 'newest'].includes(req.query.sort)
      ? req.query.sort
      : 'recently_active';
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 25));

  const skillsRaw = req.query.skills;
  const skillsArr: string[] =
    typeof skillsRaw === 'string'
      ? skillsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(skillsRaw)
        ? (skillsRaw as string[]).map((s) => String(s).trim()).filter(Boolean)
        : [];

  const { data: rows, error } = await adminSupabase.rpc('get_directory_page', {
    p_viewer_id: userId,
    p_search: search,
    p_industry: industry,
    p_location: location,
    p_skills: skillsArr.length > 0 ? skillsArr : null,
    p_connection_status: connectionStatus,
    p_sort: sort,
    p_offset: offset,
    p_limit: limit + 1,
  });

  if (error) {
    logDirectoryError({
      method: 'GET',
      path: '/api/directory',
      userId: userId ?? undefined,
      error: error.message,
    });
    return res.status(500).json({ error: error.message });
  }

  const list = Array.isArray(rows) ? rows : [];
  const hasMore = list.length > limit;
  const data = hasMore ? list.slice(0, limit) : list;

  return res.json({ data, hasMore });
});

// POST /api/directory/connect — send connection request
app.post('/api/directory/connect', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const targetId =
    typeof (req.body as { targetId?: string }).targetId === 'string'
      ? (req.body as { targetId: string }).targetId.trim()
      : null;
  if (!userId || !targetId)
    return res.status(400).json({ error: 'Missing targetId' });

  const { error } = await adminSupabase.from('connection_requests').insert({
    requester_id: userId,
    recipient_id: targetId,
    status: 'pending',
  });
  if (error) {
    if (error.code === '23505')
      return res.status(409).json({ error: 'Request already exists' });
    logDirectoryError({
      method: 'POST',
      path: '/api/directory/connect',
      userId: userId ?? undefined,
      error: error.message,
    });
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json({ ok: true });
});

// POST /api/directory/accept — accept connection request
app.post('/api/directory/accept', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const targetId =
    typeof (req.body as { targetId?: string }).targetId === 'string'
      ? (req.body as { targetId: string }).targetId.trim()
      : null;
  if (!userId || !targetId)
    return res.status(400).json({ error: 'Missing targetId' });

  const { data: reqRow } = await adminSupabase
    .from('connection_requests')
    .select('id')
    .eq('requester_id', targetId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .maybeSingle();
  if (!reqRow)
    return res.status(404).json({ error: 'No pending request found' });

  await adminSupabase
    .from('connection_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', (reqRow as { id: string }).id);

  await adminSupabase.from('feed_connections').insert([
    { user_id: userId, connected_user_id: targetId },
    { user_id: targetId, connected_user_id: userId },
  ]);

  return res.json({ ok: true });
});

// POST /api/directory/decline — decline connection request
app.post('/api/directory/decline', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const targetId =
    typeof (req.body as { targetId?: string }).targetId === 'string'
      ? (req.body as { targetId: string }).targetId.trim()
      : null;
  if (!userId || !targetId)
    return res.status(400).json({ error: 'Missing targetId' });

  const { data } = await adminSupabase
    .from('connection_requests')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('requester_id', targetId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .select('id');
  if (!data?.length)
    return res.status(404).json({ error: 'No pending request found' });
  return res.json({ ok: true });
});

// POST /api/directory/disconnect — remove mutual connection
app.post(
  '/api/directory/disconnect',
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const targetId =
      typeof (req.body as { targetId?: string }).targetId === 'string'
        ? (req.body as { targetId: string }).targetId.trim()
        : null;
    if (!userId || !targetId)
      return res.status(400).json({ error: 'Missing targetId' });

    await adminSupabase
      .from('feed_connections')
      .delete()
      .eq('user_id', userId)
      .eq('connected_user_id', targetId);
    await adminSupabase
      .from('feed_connections')
      .delete()
      .eq('user_id', targetId)
      .eq('connected_user_id', userId);
    return res.json({ ok: true });
  },
);

// --- Auth & profile: GET /api/me/avatar ---
app.get(
  '/api/me/avatar',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId)
      return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('avatar, use_weirdling_avatar')
      .eq('id', userId)
      .maybeSingle();

    let avatarUrl: string | null = null;
    const p = profile as {
      avatar?: string;
      use_weirdling_avatar?: boolean;
    } | null;
    if (p?.use_weirdling_avatar) {
      const { data: w } = await adminSupabase
        .from('weirdlings')
        .select('avatar_url')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      avatarUrl = (w as { avatar_url?: string } | null)?.avatar_url ?? null;
    }
    if (!avatarUrl && p?.avatar) avatarUrl = p.avatar;

    return res.json({
      ok: true,
      data: { avatarUrl: avatarUrl ?? null },
      error: null,
      meta: {},
    });
  },
);

// --- Auth & profile: GET /api/me ---
app.get('/api/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId)
    return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const { data: user } = await adminSupabase.auth.getUser(pickBearer(req));
  if (!user?.user)
    return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('handle, display_name')
    .eq('id', userId)
    .maybeSingle();

  const { data: allowRow } = await adminSupabase
    .from('admin_allowlist')
    .select('email')
    .ilike('email', user.user.email ?? '')
    .maybeSingle();

  const isAdmin = !!allowRow?.email;

  return res.json({
    ok: true,
    data: {
      id: user.user.id,
      email: user.user.email,
      handle: (profile as { handle?: string } | null)?.handle ?? null,
      displayName:
        (profile as { display_name?: string } | null)?.display_name ?? null,
      roles: isAdmin ? ['admin'] : ['user'],
      isAdmin,
    },
    error: null,
    meta: {},
  });
});

// --- Content submission APIs (community video workflow) ---

// POST /api/content/submissions — create submission (YouTube or upload)
app.post(
  '/api/content/submissions',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId)
      return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : null;
    const type = body.type === 'upload' ? 'upload' : 'youtube';
    const youtubeUrl =
      type === 'youtube' && typeof body.youtubeUrl === 'string'
        ? body.youtubeUrl.trim() || null
        : null;
    const storagePath =
      type === 'upload' && typeof body.storagePath === 'string'
        ? body.storagePath.trim() || null
        : null;
    const tags = Array.isArray(body.tags)
      ? (body.tags as unknown[]).map(String).filter(Boolean)
      : [];
    const notesForModerators =
      typeof body.notesForModerators === 'string'
        ? body.notesForModerators.trim() || null
        : null;

    if (!title)
      return res.status(400).json({ ok: false, error: 'Missing title' });
    if (type === 'youtube' && !youtubeUrl)
      return res
        .status(400)
        .json({ ok: false, error: 'YouTube URL required for type youtube' });
    if (type === 'upload' && !storagePath)
      return res
        .status(400)
        .json({ ok: false, error: 'Storage path required for type upload' });

    const { data, error } = await adminSupabase
      .from('content_submissions')
      .insert({
        submitted_by: userId,
        title,
        description,
        type,
        youtube_url: youtubeUrl,
        storage_path: storagePath,
        tags,
        notes_for_moderators: notesForModerators,
        status: 'pending',
      })
      .select('id, status, created_at')
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.status(201).json({
      ok: true,
      data: {
        id: data.id,
        status: data.status,
        createdAt: data.created_at,
      },
      error: null,
      meta: {},
    });
  },
);

// POST /api/content/uploads/url — get signed upload URL
app.post(
  '/api/content/uploads/url',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId)
      return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const body = req.body as Record<string, unknown>;
    const filename =
      typeof body.filename === 'string' ? body.filename.trim() : '';

    if (!filename)
      return res.status(400).json({ ok: false, error: 'Missing filename' });

    const ext = filename.includes('.')
      ? filename.slice(filename.lastIndexOf('.'))
      : '.mp4';
    const storagePath = `submissions/${userId}/${crypto.randomUUID()}${ext}`;

    const { data: signed, error } = await adminSupabase.storage
      .from('content-submissions')
      .createSignedUploadUrl(storagePath);

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({
      ok: true,
      data: {
        uploadUrl: signed.signedUrl,
        storagePath,
      },
      error: null,
      meta: { expiresInSeconds: 900 },
    });
  },
);

// POST /api/admin/advertisers/upload-url — get signed URL for ad banner (admin only)
app.post(
  '/api/admin/advertisers/upload-url',
  requireAdmin,
  async (_req: Request, res: Response) => {
    const body = (_req as Request & { body?: unknown }).body as
      | { filename?: string }
      | undefined;
    const filename =
      typeof body?.filename === 'string' ? body.filename.trim() : '';
    const ext =
      filename && filename.includes('.')
        ? filename.slice(filename.lastIndexOf('.')).toLowerCase()
        : '.jpg';
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
      return res.status(400).json({
        ok: false,
        error: 'Only JPG and PNG images are allowed.',
      });
    }
    const storagePath = `ads/${crypto.randomUUID()}${ext}`;
    const { data: signed, error } = await adminSupabase.storage
      .from('feed-ad-images')
      .createSignedUploadUrl(storagePath);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    const { data: publicUrl } = adminSupabase.storage
      .from('feed-ad-images')
      .getPublicUrl(storagePath);
    return res.json({
      ok: true,
      data: {
        uploadUrl: signed.signedUrl,
        storagePath,
        publicUrl: publicUrl.publicUrl,
      },
      error: null,
      meta: { expiresInSeconds: 900 },
    });
  },
);

// --- Public playlist APIs (no auth) ---

// GET /api/public/playlists
app.get('/api/public/playlists', async (_req: Request, res: Response) => {
  const limit = Math.min(100, Math.max(1, Number(_req.query.limit) || 20));
  const offset = Math.max(0, Number(_req.query.offset) || 0);

  const { data: playlists, error } = await adminSupabase
    .from('playlists')
    .select('id, slug, title, description, thumbnail_url, updated_at')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ ok: false, error: error.message });

  const { count } = await adminSupabase
    .from('playlists')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true);

  const data = (playlists ?? []).map(
    (p: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      thumbnail_url: string | null;
      updated_at: string;
    }) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      thumbnailUrl: p.thumbnail_url,
      updatedAt: p.updated_at,
    }),
  );

  const itemCounts = await Promise.all(
    (playlists ?? []).map(async (p: { id: string }) => {
      const { count: c } = await adminSupabase
        .from('playlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', p.id);
      return c ?? 0;
    }),
  );

  const enriched = data.map((p: Record<string, unknown>, i: number) => ({
    ...p,
    itemCount: itemCounts[i] ?? 0,
  }));

  return res.json({
    ok: true,
    data: enriched,
    error: null,
    meta: { total: count ?? 0, limit, offset },
  });
});

// GET /api/public/playlists/:slug/items
app.get(
  '/api/public/playlists/:slug/items',
  async (req: Request, res: Response) => {
    const slug = req.params.slug;
    if (!slug)
      return res.status(400).json({ ok: false, error: 'Missing slug' });

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const { data: playlist, error: plErr } = await adminSupabase
      .from('playlists')
      .select('id')
      .eq('slug', slug)
      .eq('is_public', true)
      .maybeSingle();

    if (plErr || !playlist)
      return res.status(404).json({ ok: false, error: 'Playlist not found' });

    const { data: items, error } = await adminSupabase
      .from('playlist_items')
      .select(
        `
      id,
      submission_id,
      published_at,
      content_submissions (
        title,
        type,
        youtube_url,
        storage_path,
        submitted_by
      )
    `,
      )
      .eq('playlist_id', (playlist as { id: string }).id)
      .order('sort_order')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ ok: false, error: error.message });

    const { count } = await adminSupabase
      .from('playlist_items')
      .select('*', { count: 'exact', head: true })
      .eq('playlist_id', (playlist as { id: string }).id);

    const subs = (items ?? []).map(
      (
        i: {
          content_submissions: {
            title: string;
            type: string;
            youtube_url: string | null;
            storage_path: string | null;
            submitted_by: string;
          } | null;
        } & { id: string; published_at: string },
      ) => i.content_submissions,
    );
    const subIds = [
      ...new Set(
        (subs ?? [])
          .filter(Boolean)
          .map((s: { submitted_by: string }) => s.submitted_by),
      ),
    ] as string[];

    const { data: profiles } =
      subIds.length > 0
        ? await adminSupabase
            .from('profiles')
            .select('id, handle, display_name')
            .in('id', subIds)
        : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map(
        (p: {
          id: string;
          handle: string | null;
          display_name: string | null;
        }) => [p.id, { handle: p.handle, displayName: p.display_name }],
      ),
    );

    const data = (items ?? []).map(
      (i: {
        id: string;
        published_at: string;
        content_submissions: {
          title: string;
          type: string;
          youtube_url: string | null;
          storage_path: string | null;
          submitted_by: string;
        } | null;
      }) => {
        const sub = i.content_submissions;
        const prof = sub ? profileMap.get(sub.submitted_by) : null;
        return {
          id: i.id,
          title: sub?.title ?? '',
          submittedBy: prof
            ? { handle: prof.handle, displayName: prof.displayName }
            : { handle: null, displayName: null },
          type: sub?.type ?? 'youtube',
          youtubeUrl: sub?.youtube_url ?? null,
          storagePath: sub?.storage_path ?? null,
          publishedAt: i.published_at,
        };
      },
    );

    return res.json({
      ok: true,
      data,
      error: null,
      meta: { total: count ?? 0, limit, offset },
    });
  },
);

// --- Admin content moderation APIs ---

const insertAuditLog = async (
  actorEmail: string | undefined,
  actorId: string | undefined,
  action: string,
  targetType: string,
  targetId: string | undefined,
  meta: Record<string, unknown>,
) => {
  await adminSupabase.from('audit_log').insert({
    actor_email: actorEmail,
    actor_id: actorId ?? null,
    action,
    target_type: targetType,
    target_id: targetId ?? null,
    meta,
  });
};

// GET /api/admin/content/submissions
app.get(
  '/api/admin/content/submissions',
  requireAdmin,
  async (req: AdminRequest, res: Response) => {
    const status =
      typeof req.query.status === 'string'
        ? req.query.status.trim() || null
        : null;
    const q =
      typeof req.query.q === 'string' ? req.query.q.trim() || null : null;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const sort = req.query.sort === 'updated_at' ? 'updated_at' : 'created_at';
    const order = req.query.order === 'desc' ? 'desc' : 'asc';

    let query = adminSupabase.from('content_submissions').select(
      `
        id,
        title,
        type,
        status,
        created_at,
        submitted_by
      `,
      { count: 'exact' },
    );

    if (status && status !== 'all') query = query.eq('status', status);
    if (q) query = query.ilike('title', `%${q}%`);

    query = query.order(sort, { ascending: order === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query;

    if (error) return res.status(500).json({ ok: false, error: error.message });

    const subIds = [
      ...new Set(
        (rows ?? []).map((r: { submitted_by: string }) => r.submitted_by),
      ),
    ];
    const { data: profiles } =
      subIds.length > 0
        ? await adminSupabase
            .from('profiles')
            .select('id, handle, display_name')
            .in('id', subIds)
        : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map(
        (p: {
          id: string;
          handle: string | null;
          display_name: string | null;
        }) => [p.id, { handle: p.handle, displayName: p.display_name }],
      ),
    );

    const data = (rows ?? []).map(
      (r: {
        id: string;
        title: string;
        type: string;
        status: string;
        created_at: string;
        submitted_by: string;
      }) => {
        const prof = profileMap.get(r.submitted_by);
        return {
          id: r.id,
          title: r.title,
          submittedBy: {
            id: r.submitted_by,
            handle: prof?.handle ?? null,
            displayName: prof?.displayName ?? null,
          },
          type: r.type,
          status: r.status,
          submittedAt: r.created_at,
        };
      },
    );

    return res.json({
      ok: true,
      data,
      error: null,
      meta: { total: count ?? 0, limit, offset },
    });
  },
);

// POST /api/admin/content/:id/approve
app.post(
  '/api/admin/content/:id/approve',
  requireAdmin,
  async (req: AdminRequest, res: Response) => {
    const id = req.params.id;
    const userId = req.adminUserId;
    const email = req.adminEmail;
    const notes =
      typeof (req.body as { notes?: string }).notes === 'string'
        ? (req.body as { notes: string }).notes.trim() || null
        : null;

    const { data: row, error } = await adminSupabase
      .from('content_submissions')
      .update({
        status: 'approved',
        moderation_notes: notes,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!row) return res.status(404).json({ ok: false, error: 'Not found' });

    await insertAuditLog(
      email,
      userId,
      'CONTENT_APPROVED',
      'content_submission',
      id,
      {
        notes,
        statusFrom: 'pending',
        statusTo: 'approved',
      },
    );

    return res.json({ ok: true, data: { id: row.id, status: row.status } });
  },
);

// POST /api/admin/content/:id/reject
app.post(
  '/api/admin/content/:id/reject',
  requireAdmin,
  async (req: AdminRequest, res: Response) => {
    const id = req.params.id;
    const userId = req.adminUserId;
    const email = req.adminEmail;
    const reason =
      typeof (req.body as { reason?: string }).reason === 'string'
        ? (req.body as { reason: string }).reason.trim() || null
        : null;

    const { data: row, error } = await adminSupabase
      .from('content_submissions')
      .update({
        status: 'rejected',
        moderation_notes: reason,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!row) return res.status(404).json({ ok: false, error: 'Not found' });

    await insertAuditLog(
      email,
      userId,
      'CONTENT_REJECTED',
      'content_submission',
      id,
      {
        reason,
        statusTo: 'rejected',
      },
    );

    return res.json({ ok: true, data: { id: row.id, status: row.status } });
  },
);

// POST /api/admin/content/:id/request-changes
app.post(
  '/api/admin/content/:id/request-changes',
  requireAdmin,
  async (req: AdminRequest, res: Response) => {
    const id = req.params.id;
    const userId = req.adminUserId;
    const email = req.adminEmail;
    const notes =
      typeof (req.body as { notes?: string }).notes === 'string'
        ? (req.body as { notes: string }).notes.trim() || null
        : null;

    const { data: row, error } = await adminSupabase
      .from('content_submissions')
      .update({
        status: 'changes_requested',
        moderation_notes: notes,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!row) return res.status(404).json({ ok: false, error: 'Not found' });

    await insertAuditLog(
      email,
      userId,
      'CONTENT_REQUEST_CHANGES',
      'content_submission',
      id,
      {
        notes,
        statusTo: 'changes_requested',
      },
    );

    return res.json({ ok: true, data: { id: row.id, status: row.status } });
  },
);

// POST /api/admin/content/:id/publish
app.post(
  '/api/admin/content/:id/publish',
  requireAdmin,
  async (req: AdminRequest, res: Response) => {
    const id = req.params.id;
    const userId = req.adminUserId;
    const email = req.adminEmail;
    const playlistId =
      typeof (req.body as { playlistId?: string }).playlistId === 'string'
        ? (req.body as { playlistId: string }).playlistId.trim() || null
        : null;
    const publishAt =
      typeof (req.body as { publishAt?: string }).publishAt === 'string'
        ? (req.body as { publishAt: string }).publishAt.trim() || null
        : null;

    if (!playlistId)
      return res.status(400).json({ ok: false, error: 'Missing playlistId' });

    const { data: subRow } = await adminSupabase
      .from('content_submissions')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!subRow || (subRow as { status: string }).status !== 'approved')
      return res.status(400).json({
        ok: false,
        error: 'Submission must be approved before publishing',
      });

    const { data: plRow } = await adminSupabase
      .from('playlists')
      .select('id')
      .eq('id', playlistId)
      .maybeSingle();

    if (!plRow)
      return res.status(404).json({ ok: false, error: 'Playlist not found' });

    const { data: maxOrder } = await adminSupabase
      .from('playlist_items')
      .select('sort_order')
      .eq('playlist_id', playlistId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder =
      ((maxOrder as { sort_order?: number })?.sort_order ?? -1) + 1;

    const { error: insertErr } = await adminSupabase
      .from('playlist_items')
      .insert({
        playlist_id: playlistId,
        submission_id: id,
        sort_order: sortOrder,
        published_at: publishAt || new Date().toISOString(),
      });

    if (insertErr) {
      if (insertErr.code === '23505')
        return res
          .status(409)
          .json({ ok: false, error: 'Already in playlist' });
      return res.status(500).json({ ok: false, error: insertErr.message });
    }

    await adminSupabase
      .from('content_submissions')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', id);

    await insertAuditLog(
      email,
      userId,
      'CONTENT_PUBLISHED',
      'content_submission',
      id,
      {
        playlistId,
        publishAt: publishAt || new Date().toISOString(),
      },
    );

    return res.json({ ok: true, data: { id } });
  },
);

// GET /api/admin/playlists — list all playlists (for publish dropdown)
app.get(
  '/api/admin/playlists',
  requireAdmin,
  async (req: Request, res: Response) => {
    const { data, error } = await adminSupabase
      .from('playlists')
      .select('id, slug, title, is_public')
      .order('title');

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({ ok: true, data: data ?? [], error: null, meta: {} });
  },
);

// POST /api/admin/playlists — create playlist (admin only)
app.post(
  '/api/admin/playlists',
  requireAdmin,
  async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const slug =
      typeof body.slug === 'string'
        ? body.slug.trim().toLowerCase().replace(/\s+/g, '-')
        : '';
    const description =
      typeof body.description === 'string'
        ? body.description.trim() || null
        : null;
    const isPublic = body.isPublic === true;

    if (!title)
      return res.status(400).json({ ok: false, error: 'Missing title' });

    const finalSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    const { data, error } = await adminSupabase
      .from('playlists')
      .insert({
        slug: finalSlug,
        title,
        description,
        is_public: isPublic,
      })
      .select('id, slug, title')
      .single();

    if (error) {
      if (error.code === '23505')
        return res
          .status(409)
          .json({ ok: false, error: 'Slug already exists' });
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, data, error: null, meta: {} });
  },
);

// GET /api/admin/audit
app.get(
  '/api/admin/audit',
  requireAdmin,
  async (req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const {
      data: rows,
      error,
      count,
    } = await adminSupabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ ok: false, error: error.message });

    const data = (rows ?? []).map(
      (r: {
        id: string;
        actor_email: string | null;
        action: string;
        target_type: string | null;
        target_id: string | null;
        meta: unknown;
        created_at: string;
      }) => ({
        id: r.id,
        actorEmail: r.actor_email,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id,
        meta: r.meta,
        createdAt: r.created_at,
      }),
    );

    return res.json({
      ok: true,
      data,
      error: null,
      meta: { total: count ?? 0, limit, offset },
    });
  },
);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export { app };
