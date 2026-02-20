import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
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
import {
  getConnectIntent,
  getConnectionOutcomeNotificationType,
} from './directory/connectionFlow.js';
import { sendApiError } from './lib/apiError.js';

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for ad/partner images
});

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
        return sendApiError(res, 401, 'Unauthorized');
      }

      const email = data.user.email;

      const { data: allowRow, error: allowErr } = await adminSupabase
        .from('admin_allowlist')
        .select('email')
        .ilike('email', email)
        .maybeSingle();

      if (allowErr) {
        return sendApiError(res, 500, 'Server error');
      }

      if (!allowRow?.email) {
        return sendApiError(res, 403, 'Forbidden');
      }

      req.adminEmail = email;
      req.adminUserId = data.user.id;
      return next();
    }

    // 2) Fallback: legacy token header
    const token = String(req.header('x-admin-token') || '').trim();
    if (token && ADMIN_TOKEN && token === ADMIN_TOKEN) return next();

    return sendApiError(res, 401, 'Unauthorized');
  } catch (e: unknown) {
    return sendApiError(res, 500, errorMessage(e, 'Server error'));
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
      return sendApiError(res, 401, 'Unauthorized');
    }
    const { data, error } = await adminSupabase.auth.getUser(bearer);
    if (error || !data.user?.id) {
      return sendApiError(res, 401, 'Unauthorized');
    }
    req.userId = data.user.id;
    next();
  } catch (e: unknown) {
    return sendApiError(res, 500, errorMessage(e, 'Server error'));
  }
};

// --- Weirdling generator (MVP-aligned) ---
const PROMPT_VERSION = getPromptVersion();
const MODEL_VERSION = getModelVersion();

const handleWeirdlingGenerate = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');

  const rl = checkRateLimit(userId);
  if (!rl.allowed) {
    return sendApiError(
      res,
      429,
      'Too many generations. Please try again later.',
      undefined,
      rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined,
    );
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
    return sendApiError(
      res,
      400,
      'Missing required fields: displayNameOrHandle, roleVibe',
    );
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
    return sendApiError(res, 500, 'Failed to create job');
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
    return sendApiError(res, 422, msg);
  }
};

app.post('/api/weirdling/generate', requireAuth, handleWeirdlingGenerate);
app.post('/api/weirdling/regenerate', requireAuth, handleWeirdlingGenerate);

app.post(
  '/api/weirdling/save',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');

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
        return sendApiError(res, 400, 'Job not found or not complete');
      }

      let validated;
      try {
        validated = validateWeirdlingResponse(
          job.raw_response as Record<string, unknown>,
        );
      } catch (e) {
        return sendApiError(res, 400, errorMessage(e, 'Invalid job response'));
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
        return sendApiError(res, 500, 'Failed to save weirdling');
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
      return sendApiError(res, 400, 'Missing required preview fields');
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
      return sendApiError(res, 500, 'Failed to save weirdling');
    }
    return res.json({ ok: true });
  },
);

app.get(
  '/api/weirdling/me',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');

    const { data: rows, error } = await adminSupabase
      .from('weirdlings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return sendApiError(res, 500, 'Server error');

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
    if (!userId) return sendApiError(res, 401, 'Unauthorized');
    if (!id) return sendApiError(res, 400, 'Missing weirdling id');

    const { error } = await adminSupabase
      .from('weirdlings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return sendApiError(res, 500, 'Server error');
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

    if (error) return sendApiError(res, 500, 'Server error');

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
    if (ids.length === 0) return sendApiError(res, 400, 'Missing ids[]');

    const { error } = await adminSupabase
      .from('profiles')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) return sendApiError(res, 500, 'Server error');
    return res.json({ ok: true });
  },
);

// Bulk reject
app.post(
  '/api/admin/profiles/reject',
  requireAdmin,
  async (req: Request, res: Response) => {
    const ids = requireIds(req.body as BulkIds);
    if (ids.length === 0) return sendApiError(res, 400, 'Missing ids[]');

    const { error } = await adminSupabase
      .from('profiles')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) return sendApiError(res, 500, 'Server error');
    return res.json({ ok: true });
  },
);

// Bulk disable
app.post(
  '/api/admin/profiles/disable',
  requireAdmin,
  async (req: Request, res: Response) => {
    const ids = requireIds(req.body as BulkIds);
    if (ids.length === 0) return sendApiError(res, 400, 'Missing ids[]');

    const { error } = await adminSupabase
      .from('profiles')
      .update({
        status: 'disabled',
        reviewed_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) return sendApiError(res, 500, 'Server error');
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
    if (ids.length === 0) return sendApiError(res, 400, 'Missing ids[]');

    // Delete profiles first
    const { error: profErr } = await adminSupabase
      .from('profiles')
      .delete()
      .in('id', ids);
    if (profErr) return sendApiError(res, 500, 'Server error');

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
    if (!userId) return sendApiError(res, 401, 'Unauthorized');

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
      return sendApiError(
        res,
        500,
        'Feed could not be loaded. Ensure Supabase migrations are applied.',
      );
    }

    const list = Array.isArray(rows) ? rows : [];
    const hasMore = list.length > limit;
    const page = hasMore ? list.slice(0, limit) : list;
    const last = page[page.length - 1] as
      | { created_at?: string; scheduled_at?: string | null; id?: string }
      | undefined;
    const sortAt = last?.scheduled_at ?? last?.created_at;
    const nextCursor =
      hasMore && sortAt && last?.id
        ? Buffer.from(
            JSON.stringify({ created_at: sortAt, id: last.id }),
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
        edited_at?: string | null;
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
        edited_at: row.edited_at ?? null,
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
    return sendApiError(res, 500, 'Feed could not be loaded.');
  }
});

// POST /api/feeds — create a new feed item (post or external_link)
app.post('/api/feeds', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');

  const body = req.body as Record<string, unknown>;
  const rawKind =
    typeof body.kind === 'string' ? body.kind.trim().toLowerCase() : 'post';

  if (
    rawKind !== 'post' &&
    rawKind !== 'external_link' &&
    rawKind !== 'reaction' &&
    rawKind !== 'repost'
  ) {
    return sendApiError(res, 400, 'Unsupported kind');
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
      return sendApiError(res, 400, 'Post body is required');
    }

    const payload: {
      body: string;
      link_preview?: import('./linkPreview.js').LinkPreview;
      images?: string[];
    } = { body: text };
    const firstUrl = getFirstUrl(text);
    if (firstUrl) {
      const linkPreview = await fetchLinkPreview(firstUrl);
      if (linkPreview) payload.link_preview = linkPreview;
    }
    const imagesRaw = body.images;
    if (
      Array.isArray(imagesRaw) &&
      imagesRaw.length > 0 &&
      imagesRaw.every((u): u is string => typeof u === 'string')
    ) {
      payload.images = imagesRaw.filter((u) => u.trim().length > 0);
    }

    const scheduledAtRaw =
      typeof body.scheduled_at === 'string' ? body.scheduled_at.trim() : null;
    let scheduledAt: string | null = null;
    if (scheduledAtRaw) {
      const d = new Date(scheduledAtRaw);
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
        scheduledAt = d.toISOString();
      }
    }

    const { error } = await adminSupabase.from('feed_items').insert({
      user_id: userId,
      kind: 'post',
      payload,
      ...(scheduledAt && { scheduled_at: scheduledAt }),
    });

    if (error) {
      return sendApiError(res, 500, 'Server error');
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
      return sendApiError(
        res,
        400,
        'parent_id and type (like|love|inspiration|care|comment) required',
      );
    }
    const payload: Record<string, string> = { type };
    if (type === 'comment') {
      const commentBody = typeof body.body === 'string' ? body.body.trim() : '';
      if (!commentBody) {
        return sendApiError(res, 400, 'Comment body required');
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
    if (error) return sendApiError(res, 500, 'Server error');
    return res.status(201).json({ ok: true });
  }

  if (rawKind === 'repost') {
    const originalId =
      typeof body.original_id === 'string' ? body.original_id.trim() : null;
    if (!originalId) {
      return sendApiError(res, 400, 'original_id required for repost');
    }
    const { data: original, error: fetchErr } = await adminSupabase
      .from('feed_items')
      .select('id, payload, created_at, user_id')
      .eq('id', originalId)
      .single();
    if (fetchErr || !original) {
      return sendApiError(res, 404, 'Original post not found');
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
    if (error) return sendApiError(res, 500, 'Server error');
    return res.status(201).json({ ok: true });
  }

  // external_link
  const url = typeof body.url === 'string' ? body.url.trim() : ('' as string);
  const label = typeof body.label === 'string' ? body.label.trim() : undefined;

  if (!url) {
    return sendApiError(res, 400, 'URL is required');
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
    return sendApiError(res, 500, 'Server error');
  }

  return res.status(201).json({ ok: true });
});

// PATCH /api/feeds/items/:postId — edit viewer-owned post body
app.patch(
  '/api/feeds/items/:postId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');
    const postIdRaw = req.params.postId;
    const postId = typeof postIdRaw === 'string' ? postIdRaw.trim() : '';
    if (!postId) return sendApiError(res, 400, 'Invalid post id');
    const reqBody = req.body as { body?: unknown };
    const text = typeof reqBody.body === 'string' ? reqBody.body.trim() : '';
    if (!text) return sendApiError(res, 400, 'Post body is required');

    const { data: existing, error: existingErr } = await adminSupabase
      .from('feed_items')
      .select('id, user_id, kind, payload')
      .eq('id', postId)
      .maybeSingle();
    if (existingErr) return sendApiError(res, 500, 'Server error');
    if (!existing) return sendApiError(res, 404, 'Post not found');
    if ((existing as { user_id: string }).user_id !== userId) {
      return sendApiError(res, 403, 'Only the post author may edit');
    }
    if ((existing as { kind: string }).kind !== 'post') {
      return sendApiError(res, 400, 'Only post items can be edited');
    }

    const payload = ((existing as { payload?: Record<string, unknown> })
      .payload ?? {}) as Record<string, unknown>;
    payload.body = text;
    const firstUrl = getFirstUrl(text);
    if (firstUrl) {
      const linkPreview = await fetchLinkPreview(firstUrl);
      if (linkPreview) payload.link_preview = linkPreview;
      else delete payload.link_preview;
    } else {
      delete payload.link_preview;
    }

    const { error } = await adminSupabase
      .from('feed_items')
      .update({ payload, edited_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('kind', 'post');
    if (error) return sendApiError(res, 500, 'Server error');
    return res.status(204).send();
  },
);

// DELETE /api/feeds/items/:postId — delete viewer-owned post
app.delete(
  '/api/feeds/items/:postId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');
    const postIdRaw = req.params.postId;
    const postId = typeof postIdRaw === 'string' ? postIdRaw.trim() : '';
    if (!postId) return sendApiError(res, 400, 'Invalid post id');
    const { data: existing, error: existingErr } = await adminSupabase
      .from('feed_items')
      .select('id, user_id, kind')
      .eq('id', postId)
      .maybeSingle();
    if (existingErr) return sendApiError(res, 500, 'Server error');
    if (!existing) return sendApiError(res, 404, 'Post not found');
    if ((existing as { user_id: string }).user_id !== userId) {
      return sendApiError(res, 403, 'Only the post author may delete');
    }
    if ((existing as { kind: string }).kind === 'reaction') {
      return sendApiError(res, 400, 'Use comment delete endpoint for comments');
    }
    const { error } = await adminSupabase
      .from('feed_items')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);
    if (error) return sendApiError(res, 500, 'Server error');
    return res.status(204).send();
  },
);

// DELETE /api/feeds/items/:postId/reaction — remove viewer's emoji reaction on a post
app.delete(
  '/api/feeds/items/:postId/reaction',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');
    const postIdRaw = req.params.postId;
    const postId = typeof postIdRaw === 'string' ? postIdRaw.trim() : '';
    if (!postId) return sendApiError(res, 400, 'Invalid post id');
    const { error } = await adminSupabase
      .from('feed_items')
      .delete()
      .eq('kind', 'reaction')
      .eq('parent_id', postId)
      .eq('user_id', userId)
      .or(
        'payload->>type.eq.like,payload->>type.eq.love,payload->>type.eq.inspiration,payload->>type.eq.care',
      );
    if (error) return sendApiError(res, 500, 'Server error');
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
    if (!postId) return sendApiError(res, 400, 'Invalid post id');
    const { data: rows, error } = await adminSupabase
      .from('feed_items')
      .select('id, user_id, payload, created_at, edited_at')
      .eq('kind', 'reaction')
      .eq('parent_id', postId)
      .eq('payload->>type', 'comment')
      .order('created_at', { ascending: true });
    if (error) return sendApiError(res, 500, 'Server error');
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
    const commentIds = (comments as { id: string }[]).map((c) => c.id);
    let reactionRows: {
      parent_id: string | null;
      payload: unknown;
      user_id: string;
    }[] = [];
    if (commentIds.length > 0) {
      const { data: rr } = await adminSupabase
        .from('feed_items')
        .select('parent_id, payload, user_id')
        .eq('kind', 'reaction')
        .in('parent_id', commentIds)
        .or(
          'payload->>type.eq.like,payload->>type.eq.love,payload->>type.eq.inspiration,payload->>type.eq.care',
        );
      reactionRows = (rr ?? []) as {
        parent_id: string | null;
        payload: unknown;
        user_id: string;
      }[];
    }

    const reactionMap: Record<
      string,
      {
        like_count: number;
        love_count: number;
        inspiration_count: number;
        care_count: number;
        viewer_reaction: string | null;
      }
    > = {};
    for (const row of reactionRows) {
      const parentId = row.parent_id;
      if (!parentId) continue;
      if (!reactionMap[parentId]) {
        reactionMap[parentId] = {
          like_count: 0,
          love_count: 0,
          inspiration_count: 0,
          care_count: 0,
          viewer_reaction: null,
        };
      }
      const type = (row.payload as { type?: string })?.type;
      if (type === 'like') reactionMap[parentId].like_count += 1;
      if (type === 'love') reactionMap[parentId].love_count += 1;
      if (type === 'inspiration') reactionMap[parentId].inspiration_count += 1;
      if (type === 'care') reactionMap[parentId].care_count += 1;
      if (type && row.user_id === req.userId) {
        reactionMap[parentId].viewer_reaction = type;
      }
    }

    const list = comments.map((r: Record<string, unknown>) => {
      const uid = r.user_id as string;
      const p = profilesMap[uid];
      const avatar = weirdlingsMap[uid] ?? p?.avatar ?? null;
      const counts = reactionMap[String(r.id)] ?? {
        like_count: 0,
        love_count: 0,
        inspiration_count: 0,
        care_count: 0,
        viewer_reaction: null,
      };
      return {
        id: r.id,
        user_id: r.user_id,
        body: (r.payload as Record<string, unknown>)?.body ?? '',
        created_at: r.created_at,
        edited_at: r.edited_at ?? null,
        like_count: counts.like_count,
        love_count: counts.love_count,
        inspiration_count: counts.inspiration_count,
        care_count: counts.care_count,
        viewer_reaction: counts.viewer_reaction,
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

// PATCH /api/feeds/comments/:commentId — edit viewer-owned comment
app.patch(
  '/api/feeds/comments/:commentId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');
    const commentIdRaw = req.params.commentId;
    const commentId =
      typeof commentIdRaw === 'string' ? commentIdRaw.trim() : '';
    if (!commentId) return sendApiError(res, 400, 'Invalid comment id');
    const reqBody = req.body as { body?: unknown };
    const text = typeof reqBody.body === 'string' ? reqBody.body.trim() : '';
    if (!text) return sendApiError(res, 400, 'Comment body is required');

    const { data: existing, error: existingErr } = await adminSupabase
      .from('feed_items')
      .select('id, user_id, kind, payload')
      .eq('id', commentId)
      .maybeSingle();
    if (existingErr) return sendApiError(res, 500, 'Server error');
    if (!existing) return sendApiError(res, 404, 'Comment not found');
    if ((existing as { user_id: string }).user_id !== userId) {
      return sendApiError(res, 403, 'Only the comment author may edit');
    }
    const type = (existing as { payload?: { type?: string } }).payload?.type;
    if (
      (existing as { kind: string }).kind !== 'reaction' ||
      type !== 'comment'
    ) {
      return sendApiError(res, 400, 'Target item is not a comment');
    }

    const payload = ((existing as { payload?: Record<string, unknown> })
      .payload ?? {}) as Record<string, unknown>;
    payload.body = text;
    const { error } = await adminSupabase
      .from('feed_items')
      .update({ payload, edited_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', userId);
    if (error) return sendApiError(res, 500, 'Server error');
    return res.status(204).send();
  },
);

// DELETE /api/feeds/comments/:commentId — delete viewer-owned comment
app.delete(
  '/api/feeds/comments/:commentId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');
    const commentIdRaw = req.params.commentId;
    const commentId =
      typeof commentIdRaw === 'string' ? commentIdRaw.trim() : '';
    if (!commentId) return sendApiError(res, 400, 'Invalid comment id');

    const { data: existing, error: existingErr } = await adminSupabase
      .from('feed_items')
      .select('id, user_id, kind, payload')
      .eq('id', commentId)
      .maybeSingle();
    if (existingErr) return sendApiError(res, 500, 'Server error');
    if (!existing) return sendApiError(res, 404, 'Comment not found');
    if ((existing as { user_id: string }).user_id !== userId) {
      return sendApiError(res, 403, 'Only the comment author may delete');
    }
    const type = (existing as { payload?: { type?: string } }).payload?.type;
    if (
      (existing as { kind: string }).kind !== 'reaction' ||
      type !== 'comment'
    ) {
      return sendApiError(res, 400, 'Target item is not a comment');
    }

    const { error } = await adminSupabase
      .from('feed_items')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);
    if (error) return sendApiError(res, 500, 'Server error');
    return res.status(204).send();
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
    sendApiError(
      res,
      429,
      'Too many requests. Please try again later.',
      undefined,
      rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined,
    );
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
  if (!userId) return sendApiError(res, 401, 'Unauthorized');

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
    return sendApiError(res, 500, 'Server error');
  }

  const list = Array.isArray(rows) ? rows : [];
  const hasMore = list.length > limit;
  const data = hasMore ? list.slice(0, limit) : list;

  return res.json({ data, hasMore });
});

// GET /api/link-preview?url=... — authenticated preview fetch for chat composer
app.get(
  '/api/link-preview',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');

    const rawUrl =
      typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl) return sendApiError(res, 400, 'Missing url');

    const preview = await fetchLinkPreview(rawUrl);
    return res.json({ ok: true, data: preview });
  },
);

// POST /api/directory/connect — send connection request
app.post('/api/directory/connect', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const targetId =
    typeof (req.body as { targetId?: string }).targetId === 'string'
      ? (req.body as { targetId: string }).targetId.trim()
      : null;
  if (!userId || !targetId) return sendApiError(res, 400, 'Missing targetId');

  const { data: suspension } = await adminSupabase
    .from('chat_suspensions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (suspension) return sendApiError(res, 403, 'Account suspended');

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('status')
    .eq('id', userId)
    .maybeSingle();
  if (profile && (profile as { status: string }).status === 'disabled')
    return sendApiError(res, 403, 'Account disabled');

  const { data: reversePending } = await adminSupabase
    .from('connection_requests')
    .select('id')
    .eq('requester_id', targetId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  const intent = getConnectIntent(Boolean(reversePending));
  if (intent === 'auto_accept_reverse_pending') {
    const nowIso = new Date().toISOString();
    await adminSupabase
      .from('connection_requests')
      .update({ status: 'accepted', updated_at: nowIso })
      .or(
        `and(requester_id.eq.${targetId},recipient_id.eq.${userId},status.eq.pending),and(requester_id.eq.${userId},recipient_id.eq.${targetId},status.eq.pending)`,
      );

    await adminSupabase.from('feed_connections').upsert(
      [
        { user_id: userId, connected_user_id: targetId },
        { user_id: targetId, connected_user_id: userId },
      ],
      { onConflict: 'user_id,connected_user_id' },
    );

    if (reversePending?.id) {
      await adminSupabase.from('notifications').insert({
        recipient_id: targetId,
        actor_id: userId,
        type: getConnectionOutcomeNotificationType('accepted'),
        reference_id: reversePending.id,
        reference_type: 'connection_request',
        payload: { request_id: reversePending.id, status: 'accepted' },
      });
    }

    return res.status(200).json({ ok: true, autoAccepted: true });
  }

  const { error } = await adminSupabase.from('connection_requests').insert({
    requester_id: userId,
    recipient_id: targetId,
    status: 'pending',
  });
  if (error) {
    if (error.code === '23505')
      return sendApiError(res, 409, 'Request already exists');
    logDirectoryError({
      method: 'POST',
      path: '/api/directory/connect',
      userId: userId ?? undefined,
      error: error.message,
    });
    return sendApiError(res, 500, 'Server error');
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
  if (!userId || !targetId) return sendApiError(res, 400, 'Missing targetId');

  const { data: reqRow } = await adminSupabase
    .from('connection_requests')
    .select('id')
    .eq('requester_id', targetId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .maybeSingle();
  if (!reqRow) return sendApiError(res, 404, 'No pending request found');

  await adminSupabase
    .from('connection_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', (reqRow as { id: string }).id);

  await adminSupabase.from('feed_connections').upsert(
    [
      { user_id: userId, connected_user_id: targetId },
      { user_id: targetId, connected_user_id: userId },
    ],
    { onConflict: 'user_id,connected_user_id' },
  );

  await adminSupabase.from('notifications').insert({
    recipient_id: targetId,
    actor_id: userId,
    type: getConnectionOutcomeNotificationType('accepted'),
    reference_id: (reqRow as { id: string }).id,
    reference_type: 'connection_request',
    payload: {
      request_id: (reqRow as { id: string }).id,
      status: 'accepted',
    },
  });

  return res.json({ ok: true });
});

// POST /api/directory/decline — decline connection request
app.post('/api/directory/decline', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const targetId =
    typeof (req.body as { targetId?: string }).targetId === 'string'
      ? (req.body as { targetId: string }).targetId.trim()
      : null;
  if (!userId || !targetId) return sendApiError(res, 400, 'Missing targetId');

  const { data } = await adminSupabase
    .from('connection_requests')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('requester_id', targetId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .select('id');
  if (!data?.length) return sendApiError(res, 404, 'No pending request found');

  const requestId = (data[0] as { id: string }).id;
  await adminSupabase.from('notifications').insert({
    recipient_id: targetId,
    actor_id: userId,
    type: getConnectionOutcomeNotificationType('declined'),
    reference_id: requestId,
    reference_type: 'connection_request',
    payload: { request_id: requestId, status: 'declined' },
  });

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
    if (!userId || !targetId) return sendApiError(res, 400, 'Missing targetId');

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
    if (!userId) return sendApiError(res, 401, 'Unauthorized');

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
  if (!userId) return sendApiError(res, 401, 'Unauthorized');

  const bearer = pickBearer(req);
  const { data: user } = await adminSupabase.auth.getUser(bearer ?? undefined);
  if (!user?.user) return sendApiError(res, 401, 'Unauthorized');

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
    if (!userId) return sendApiError(res, 401, 'Unauthorized');

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

    if (!title) return sendApiError(res, 400, 'Missing title');
    if (type === 'youtube' && !youtubeUrl)
      return sendApiError(res, 400, 'YouTube URL required for type youtube');
    if (type === 'upload' && !storagePath)
      return sendApiError(res, 400, 'Storage path required for type upload');

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

    if (error) return sendApiError(res, 500, 'Server error');

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
    if (!userId) return sendApiError(res, 401, 'Unauthorized');

    const body = req.body as Record<string, unknown>;
    const filename =
      typeof body.filename === 'string' ? body.filename.trim() : '';

    if (!filename) return sendApiError(res, 400, 'Missing filename');

    const ext = filename.includes('.')
      ? filename.slice(filename.lastIndexOf('.'))
      : '.mp4';
    const storagePath = `submissions/${userId}/${crypto.randomUUID()}${ext}`;

    const { data: signed, error } = await adminSupabase.storage
      .from('content-submissions')
      .createSignedUploadUrl(storagePath);

    if (error) return sendApiError(res, 500, 'Server error');

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

// POST /api/admin/advertisers/upload — upload ad banner via backend (admin only)
const uploadAdFile = upload.single('file');
app.post(
  '/api/admin/advertisers/upload',
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    uploadAdFile(req, res, (err: unknown) => {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'LIMIT_FILE_SIZE'
      ) {
        return sendApiError(
          res,
          413,
          'File too large. Max 50MB for ad and partner images.',
        );
      }
      if (err) return next(err);
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file || !file.buffer) {
        return sendApiError(
          res,
          400,
          'No file uploaded. Use multipart field "file".',
        );
      }
      const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const valid = validMimes.includes(file.mimetype);
      if (!valid) {
        return sendApiError(
          res,
          400,
          'Unsupported image type. Allowed: JPG, PNG, WEBP, GIF.',
        );
      }
      const extByMime: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
      };
      const ext = extByMime[file.mimetype] ?? '.jpg';
      const storagePath = `ads/${crypto.randomUUID()}${ext}`;
      const { error } = await adminSupabase.storage
        .from('feed-ad-images')
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
      if (error) {
        console.error('[advertisers/upload] Supabase storage error:', error);
        return sendApiError(res, 500, `Upload failed: ${error.message}`);
      }
      const { data: publicUrl } = adminSupabase.storage
        .from('feed-ad-images')
        .getPublicUrl(storagePath);
      return res.json({
        ok: true,
        data: { publicUrl: publicUrl.publicUrl },
        error: null,
      });
    } catch (e) {
      console.error('[advertisers/upload] Unhandled error:', e);
      return sendApiError(res, 500, 'Upload failed');
    }
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

  if (error) return sendApiError(res, 500, 'Server error');

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
    if (!slug) return sendApiError(res, 400, 'Missing slug');

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const { data: playlist, error: plErr } = await adminSupabase
      .from('playlists')
      .select('id')
      .eq('slug', slug)
      .eq('is_public', true)
      .maybeSingle();

    if (plErr || !playlist) return sendApiError(res, 404, 'Playlist not found');

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

    if (error) return sendApiError(res, 500, 'Server error');

    const { count } = await adminSupabase
      .from('playlist_items')
      .select('*', { count: 'exact', head: true })
      .eq('playlist_id', (playlist as { id: string }).id);

    type SubRow = {
      title: string;
      type: string;
      youtube_url: string | null;
      storage_path: string | null;
      submitted_by: string;
    };
    const subs = (items ?? []).map(
      (
        i: { content_submissions: SubRow | SubRow[] | null } & {
          id: string;
          published_at: string;
        },
      ) =>
        Array.isArray(i.content_submissions)
          ? i.content_submissions[0]
          : i.content_submissions,
    );
    const subIds = [
      ...new Set(
        (subs ?? [])
          .filter((s): s is SubRow => s != null)
          .map((s) => s.submitted_by),
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

    const data = (items ?? []).map(
      (
        i: { content_submissions: SubRow | SubRow[] | null } & {
          id: string;
          published_at: string;
        },
      ) => {
        const sub = Array.isArray(i.content_submissions)
          ? i.content_submissions[0]
          : i.content_submissions;
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

    if (error) return sendApiError(res, 500, 'Server error');

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
    const id =
      (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? '';
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

    if (error) return sendApiError(res, 500, 'Server error');
    if (!row) return sendApiError(res, 404, 'Not found');

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
    const id =
      (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? '';
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

    if (error) return sendApiError(res, 500, 'Server error');
    if (!row) return sendApiError(res, 404, 'Not found');

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
    const id =
      (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? '';
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

    if (error) return sendApiError(res, 500, 'Server error');
    if (!row) return sendApiError(res, 404, 'Not found');

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
    const id =
      (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? '';
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

    if (!playlistId) return sendApiError(res, 400, 'Missing playlistId');

    const { data: subRow } = await adminSupabase
      .from('content_submissions')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!subRow || (subRow as { status: string }).status !== 'approved')
      return sendApiError(
        res,
        400,
        'Submission must be approved before publishing',
      );

    const { data: plRow } = await adminSupabase
      .from('playlists')
      .select('id')
      .eq('id', playlistId)
      .maybeSingle();

    if (!plRow) return sendApiError(res, 404, 'Playlist not found');

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
        return sendApiError(res, 409, 'Already in playlist');
      return sendApiError(res, 500, 'Server error');
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
  async (_req: Request, res: Response) => {
    const { data, error } = await adminSupabase
      .from('playlists')
      .select('id, slug, title, is_public')
      .order('title');

    if (error) return sendApiError(res, 500, 'Server error');

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

    if (!title) return sendApiError(res, 400, 'Missing title');

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
        return sendApiError(res, 409, 'Slug already exists');
      return sendApiError(res, 500, 'Server error');
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

    if (error) return sendApiError(res, 500, 'Server error');

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
