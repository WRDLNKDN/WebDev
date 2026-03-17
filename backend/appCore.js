/* global Buffer, URL, URLSearchParams, console, process */
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import express from 'express';
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
import { checkDirectoryRateLimit } from './directory/rateLimit.js';
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
import {
  generateResumeThumbnailPng,
  getResumeExtension,
  isSupportedResumeThumbnailExtension,
} from './resumeThumbnail.js';
import { registerAdvertiseRequestRoute } from './routes/advertiseRequest.js';
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
const AUTH_CALLBACK_TIMEOUT_ALERT_WINDOW_MS = 10 * 60 * 1e3;
const AUTH_CALLBACK_TIMEOUT_ALERT_THRESHOLD = 3;
app.post('/api/auth/callback-log', async (req, res) => {
  const body = req.body ?? {};
  const truncate = (v, max = 300) =>
    typeof v === 'string' ? v.slice(0, max) : '';
  const payload = {
    event: truncate(body.event || 'auth_callback_error', 80),
    next: truncate(body.next, 120),
    timed_out: Boolean(body.timed_out),
    timeout_ms:
      typeof body.timeout_ms === 'number' && Number.isFinite(body.timeout_ms)
        ? Math.max(0, Math.floor(body.timeout_ms))
        : null,
    provider: truncate(body.provider || 'unknown', 32),
    app_env: truncate(body.app_env || 'unknown', 32),
    elapsed_ms:
      typeof body.elapsed_ms === 'number' && Number.isFinite(body.elapsed_ms)
        ? Math.max(0, Math.floor(body.elapsed_ms))
        : null,
    url: truncate(body.url, 300),
    user_agent: truncate(body.user_agent, 300),
    error: truncate(body.error, 500),
    timestamp: truncate(body.timestamp, 80),
    server_received_at: /* @__PURE__ */ new Date().toISOString(),
  };
  console.warn('[auth-callback-log]', payload);
  try {
    await adminSupabase.from('audit_log').insert({
      actor_id: null,
      actor_email: null,
      action: 'AUTH_CALLBACK_ERROR',
      target_type: 'auth_callback',
      target_id: null,
      meta: payload,
    });
  } catch (e) {
    console.warn(
      '[auth-callback-log] failed to persist AUTH_CALLBACK_ERROR',
      errorMessage(e, 'unknown'),
    );
  }
  if (payload.timed_out) {
    const windowStartIso = new Date(
      Date.now() - AUTH_CALLBACK_TIMEOUT_ALERT_WINDOW_MS,
    ).toISOString();
    const { data: timeoutRows, error: timeoutErr } = await adminSupabase
      .from('audit_log')
      .select('meta, created_at')
      .eq('target_type', 'auth_callback')
      .eq('action', 'AUTH_CALLBACK_ERROR')
      .gte('created_at', windowStartIso);
    if (timeoutErr) {
      console.warn(
        '[auth-callback-timeout-alert] failed to read timeout window',
        timeoutErr.message,
      );
    } else {
      const timeoutCount = (timeoutRows ?? []).filter((row) => {
        const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
        return meta.timed_out === true;
      }).length;
      if (timeoutCount >= AUTH_CALLBACK_TIMEOUT_ALERT_THRESHOLD) {
        const { count: recentAlertCount, error: alertReadErr } =
          await adminSupabase
            .from('audit_log')
            .select('id', { count: 'exact', head: true })
            .eq('target_type', 'auth_callback')
            .eq('action', 'AUTH_CALLBACK_TIMEOUT_ALERT')
            .gte('created_at', windowStartIso);
        if (alertReadErr) {
          console.warn(
            '[auth-callback-timeout-alert] failed to read recent alerts',
            alertReadErr.message,
          );
        } else if ((recentAlertCount ?? 0) === 0) {
          const alertMeta = {
            reason: 'auth_callback_timeout_threshold',
            threshold: AUTH_CALLBACK_TIMEOUT_ALERT_THRESHOLD,
            window_ms: AUTH_CALLBACK_TIMEOUT_ALERT_WINDOW_MS,
            observed_timeouts: timeoutCount,
            last_event: payload,
            server_received_at: /* @__PURE__ */ new Date().toISOString(),
          };
          console.error('[auth-callback-timeout-alert]', alertMeta);
          try {
            await adminSupabase.from('audit_log').insert({
              actor_id: null,
              actor_email: null,
              action: 'AUTH_CALLBACK_TIMEOUT_ALERT',
              target_type: 'auth_callback',
              target_id: null,
              meta: alertMeta,
            });
          } catch (e) {
            console.warn(
              '[auth-callback-timeout-alert] failed to persist alert',
              errorMessage(e, 'unknown'),
            );
          }
        }
      }
    }
  }
  return res.json({ ok: true });
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  // 50MB for ad/partner images
});
app.use((req, _res, next) => {
  const q = req.query?.path;
  const pathSeg = Array.isArray(q) ? q[0] : q;
  if (pathSeg && typeof pathSeg === 'string' && req.url?.startsWith('/api')) {
    const raw = req.url;
    const qsPart = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
    const params = new URLSearchParams(qsPart);
    params.delete('path');
    const qs = params.toString() ? '?' + params.toString() : '';
    req.url = `/api/${decodeURIComponent(pathSeg)}${qs}`;
  }
  next();
});
const ENFORCED_INACTIVE_STATUSES = /* @__PURE__ */ new Set([
  'disabled',
  'suspended',
  'banned',
]);
const normalizeStatus = (s) => {
  const v = s.toLowerCase();
  if (v === 'all') return 'all';
  if (v === 'approved') return 'approved';
  if (v === 'rejected') return 'rejected';
  if (v === 'disabled') return 'disabled';
  return 'pending';
};
const pickBearer = (req) => {
  const h = req.headers.authorization;
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
};
const errorMessage = (e, fallback) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string' && e.trim()) return e;
  return fallback;
};
const CHAT_GIF_PROCESSING_MAX_BYTES = 8 * 1024 * 1024;
const CHAT_PROCESSED_MEDIA_MAX_BYTES = CHAT_GIF_PROCESSING_MAX_BYTES;
const FFMPEG_BINARY = process.env.FFMPEG_PATH || 'ffmpeg';
const runExecFile = (file, args) =>
  new Promise((resolve, reject) => {
    execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
const transcodeGifBufferToMp4 = async (buffer) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrdlnkdn-gif-'));
  const inputPath = path.join(tempDir, 'input.gif');
  const outputPath = path.join(tempDir, 'output.mp4');
  try {
    await fs.writeFile(inputPath, buffer);
    await runExecFile(FFMPEG_BINARY, [
      '-y',
      '-i',
      inputPath,
      '-movflags',
      '+faststart',
      '-pix_fmt',
      'yuv420p',
      '-vf',
      'fps=15,scale=min(960\\,iw):-2:flags=lanczos',
      outputPath,
    ]);
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};
const readNerdCreds = async (userId) => {
  const { data } = await adminSupabase
    .from('profiles')
    .select('nerd_creds')
    .eq('id', userId)
    .maybeSingle();
  const raw = data?.nerd_creds;
  return raw && typeof raw === 'object' ? raw : {};
};
const updateResumeThumbnailState = async (userId, updates) => {
  const nerdCreds = await readNerdCreds(userId);
  const payload = {
    ...nerdCreds,
    ...updates,
    resume_thumbnail_updated_at: /* @__PURE__ */ new Date().toISOString(),
  };
  await adminSupabase
    .from('profiles')
    .update({ nerd_creds: payload })
    .eq('id', userId);
};
const logResumeThumbnailEvent = async (params) => {
  await adminSupabase.from('audit_log').insert({
    actor_id: params.userId,
    actor_email: null,
    action: params.action,
    target_type: 'resume_thumbnail',
    target_id: params.userId,
    meta: params.meta,
  });
};
const RESUME_BACKFILL_LOCK_TTL_MS = 15 * 60 * 1e3;
const isLockExpired = (acquiredAtIso) => {
  const acquiredMs = new Date(acquiredAtIso).getTime();
  if (!Number.isFinite(acquiredMs)) return true;
  return Date.now() - acquiredMs > RESUME_BACKFILL_LOCK_TTL_MS;
};
const fetchActiveResumeBackfillLock = async () => {
  const { data, error } = await adminSupabase
    .from('audit_log')
    .select('id, action, target_id, actor_email, created_at')
    .eq('target_type', 'resume_thumbnail_backfill_lock')
    .in('action', [
      'RESUME_THUMBNAIL_BACKFILL_LOCK_ACQUIRED',
      'RESUME_THUMBNAIL_BACKFILL_LOCK_RELEASED',
    ])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data;
  if (row.action !== 'RESUME_THUMBNAIL_BACKFILL_LOCK_ACQUIRED') return null;
  if (!row.target_id || isLockExpired(row.created_at)) return null;
  return {
    runId: row.target_id,
    acquiredAtIso: row.created_at,
    adminEmail: row.actor_email ?? null,
    lockEventId: row.id,
  };
};
const acquireResumeBackfillLock = async (adminEmail, adminUserId) => {
  const active = await fetchActiveResumeBackfillLock();
  if (active) {
    return {
      lock: active,
      lockExpiresInMs: Math.max(
        0,
        RESUME_BACKFILL_LOCK_TTL_MS -
          (Date.now() - new Date(active.acquiredAtIso).getTime()),
      ),
    };
  }
  const runId = crypto.randomUUID();
  const { data: inserted, error } = await adminSupabase
    .from('audit_log')
    .insert({
      actor_id: adminUserId ?? null,
      actor_email: adminEmail ?? null,
      action: 'RESUME_THUMBNAIL_BACKFILL_LOCK_ACQUIRED',
      target_type: 'resume_thumbnail_backfill_lock',
      target_id: runId,
      meta: { runId, lockTtlMs: RESUME_BACKFILL_LOCK_TTL_MS },
    })
    .select('id, target_id, actor_email, created_at')
    .single();
  if (error || !inserted) {
    return { lock: null, lockExpiresInMs: null };
  }
  const latest = await fetchActiveResumeBackfillLock();
  if (!latest || latest.runId !== runId) {
    return {
      lock: latest,
      lockExpiresInMs: latest
        ? Math.max(
            0,
            RESUME_BACKFILL_LOCK_TTL_MS -
              (Date.now() - new Date(latest.acquiredAtIso).getTime()),
          )
        : null,
    };
  }
  return { lock: latest, lockExpiresInMs: RESUME_BACKFILL_LOCK_TTL_MS };
};
const releaseResumeBackfillLock = async (runId, adminEmail, adminUserId) => {
  await adminSupabase.from('audit_log').insert({
    actor_id: adminUserId ?? null,
    actor_email: adminEmail ?? null,
    action: 'RESUME_THUMBNAIL_BACKFILL_LOCK_RELEASED',
    target_type: 'resume_thumbnail_backfill_lock',
    target_id: runId,
    meta: { runId },
  });
};
const decodeResumeStoragePath = (resumeUrl) => {
  try {
    const parsed = new URL(resumeUrl);
    const marker = '/resumes/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return null;
    const raw = parsed.pathname.slice(idx + marker.length);
    const clean = decodeURIComponent(raw).replace(/^\/+/, '').trim();
    return clean || null;
  } catch {
    const marker = '/resumes/';
    const idx = resumeUrl.indexOf(marker);
    if (idx < 0) return null;
    const raw = resumeUrl.slice(idx + marker.length);
    const clean = decodeURIComponent(raw).replace(/^\/+/, '').trim();
    return clean || null;
  }
};
const generateAndPersistResumeThumbnail = async (userId, storagePath) => {
  const extension = getResumeExtension(storagePath);
  if (!isSupportedResumeThumbnailExtension(extension)) {
    throw new Error('Only .doc and .docx are supported');
  }
  await updateResumeThumbnailState(userId, {
    resume_thumbnail_status: 'pending',
    resume_thumbnail_error: null,
  });
  await logResumeThumbnailEvent({
    userId,
    action: 'RESUME_THUMBNAIL_PENDING',
    meta: { storagePath, extension },
  });
  const startedAt = Date.now();
  const { data: fileBlob, error: downloadError } = await adminSupabase.storage
    .from('resumes')
    .download(storagePath);
  if (downloadError || !fileBlob) {
    const message =
      downloadError?.message || 'Could not download resume for thumbnailing';
    await updateResumeThumbnailState(userId, {
      resume_thumbnail_status: 'failed',
      resume_thumbnail_error: message,
    });
    await logResumeThumbnailEvent({
      userId,
      action: 'RESUME_THUMBNAIL_FAILED',
      meta: { storagePath, extension, error: message },
    });
    throw new Error(message);
  }
  try {
    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    const thumbnailBuffer = await generateResumeThumbnailPng(
      fileBuffer,
      storagePath,
    );
    const thumbPath = `${userId}/resume-thumbnail.png`;
    const { error: uploadError } = await adminSupabase.storage
      .from('resumes')
      .upload(thumbPath, thumbnailBuffer, {
        contentType: 'image/png',
        upsert: true,
      });
    if (uploadError) throw new Error(uploadError.message);
    const { data: thumbPublic } = adminSupabase.storage
      .from('resumes')
      .getPublicUrl(thumbPath);
    const thumbnailUrl = thumbPublic.publicUrl;
    const durationMs = Date.now() - startedAt;
    await updateResumeThumbnailState(userId, {
      resume_thumbnail_status: 'complete',
      resume_thumbnail_url: thumbnailUrl,
      resume_thumbnail_error: null,
      resume_thumbnail_source_extension: extension,
    });
    await logResumeThumbnailEvent({
      userId,
      action: 'RESUME_THUMBNAIL_COMPLETE',
      meta: { storagePath, extension, durationMs },
    });
    return { thumbnailUrl, extension, durationMs };
  } catch (e) {
    const message = errorMessage(e, 'Thumbnail generation failed');
    await updateResumeThumbnailState(userId, {
      resume_thumbnail_status: 'failed',
      resume_thumbnail_error: message,
    });
    await logResumeThumbnailEvent({
      userId,
      action: 'RESUME_THUMBNAIL_FAILED',
      meta: { storagePath, extension, error: message },
    });
    throw new Error(message);
  }
};
const requireAdmin = async (req, res, next) => {
  try {
    const bearer = pickBearer(req);
    if (bearer) {
      const { data, error } = await adminSupabase.auth.getUser(bearer);
      if (error || !data.user?.email) {
        return sendApiError(res, 403, 'Forbidden');
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
    const token = String(req.header('x-admin-token') || '').trim();
    if (token && ADMIN_TOKEN && token === ADMIN_TOKEN) return next();
    return sendApiError(res, 403, 'Forbidden');
  } catch (e) {
    return sendApiError(res, 500, errorMessage(e, 'Server error'));
  }
};
const requireAuth = async (req, res, next) => {
  try {
    const bearer = pickBearer(req);
    if (!bearer) {
      return sendApiError(res, 401, 'Unauthorized');
    }
    const { data, error } = await adminSupabase.auth.getUser(bearer);
    if (error || !data.user?.id) {
      return sendApiError(res, 401, 'Unauthorized');
    }
    const userId = data.user.id;
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .maybeSingle();
    const status =
      profile && typeof profile.status === 'string'
        ? String(profile.status).toLowerCase()
        : 'active';
    if (ENFORCED_INACTIVE_STATUSES.has(status)) {
      await adminSupabase.from('audit_log').insert({
        actor_id: userId,
        actor_email: data.user.email ?? null,
        action: 'AUTH_BLOCKED_INACTIVE_STATUS',
        target_type: 'profile',
        target_id: userId,
        meta: { status },
      });
      return sendApiError(res, 403, 'Forbidden', void 0, {
        code: 'INACTIVE_ACCOUNT',
      });
    }
    req.userId = userId;
    next();
  } catch (e) {
    return sendApiError(res, 500, errorMessage(e, 'Server error'));
  }
};
const PROMPT_VERSION = getPromptVersion();
const MODEL_VERSION = getModelVersion();
const handleWeirdlingGenerate = async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const rl = checkRateLimit(userId);
  if (!rl.allowed) {
    return sendApiError(
      res,
      429,
      'Too many generations. Please try again later.',
      void 0,
      rl.retryAfter ? { retryAfter: rl.retryAfter } : void 0,
    );
  }
  const body = req.body;
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
    ? body.industryOrInterests.map(String).filter(Boolean)
    : [];
  const tone =
    typeof body.tone === 'number' && Number.isFinite(body.tone)
      ? body.tone
      : 0.5;
  const boundaries =
    typeof body.boundaries === 'string' ? body.boundaries.trim() : '';
  const bioSeed =
    typeof body.bioSeed === 'string' ? body.bioSeed.trim() : void 0;
  const includeImage =
    typeof body.includeImage === 'boolean' ? body.includeImage : false;
  if (!displayNameOrHandle || !roleVibe) {
    return sendApiError(
      res,
      400,
      'Missing required fields: displayNameOrHandle, roleVibe',
    );
  }
  let jobId = null;
  if (idempotencyKey) {
    const { data: existing } = await adminSupabase
      .from('generation_jobs')
      .select('id, status, raw_response')
      .eq('user_id', userId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing?.status === 'complete' && existing.raw_response) {
      try {
        const validated = validateWeirdlingResponse(existing.raw_response);
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
        // Ignore malformed preview metadata and continue with the original payload.
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
        updated_at: /* @__PURE__ */ new Date().toISOString(),
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
        updated_at: /* @__PURE__ */ new Date().toISOString(),
      })
      .eq('id', jobId);
    return sendApiError(res, 422, msg);
  }
};
app.post('/api/weirdling/generate', requireAuth, handleWeirdlingGenerate);
app.post('/api/weirdling/regenerate', requireAuth, handleWeirdlingGenerate);
app.post('/api/weirdling/save', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const body = req.body;
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
      validated = validateWeirdlingResponse(job.raw_response);
    } catch (e) {
      return sendApiError(res, 400, errorMessage(e, 'Invalid job response'));
    }
    const { error: insertErr2 } = await adminSupabase
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
    if (insertErr2) {
      return sendApiError(res, 500, 'Failed to save weirdling');
    }
    return res.json({ ok: true });
  }
  const displayName =
    typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const handle = typeof body.handle === 'string' ? body.handle.trim() : '';
  const roleVibe =
    typeof body.roleVibe === 'string' ? body.roleVibe.trim() : '';
  const industryTags = Array.isArray(body.industryTags)
    ? body.industryTags.map(String).filter(Boolean)
    : [];
  const tone =
    typeof body.tone === 'number' && Number.isFinite(body.tone)
      ? body.tone
      : 0.5;
  const tagline = typeof body.tagline === 'string' ? body.tagline.trim() : '';
  const boundaries =
    typeof body.boundaries === 'string' ? body.boundaries.trim() : '';
  const bio = typeof body.bio === 'string' ? body.bio.trim() : void 0;
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
    avatar_url: body.avatarUrl ?? null,
    prompt_version: body.promptVersion ?? PROMPT_VERSION,
    model_version: body.modelVersion ?? MODEL_VERSION,
    is_active: true,
  });
  if (insertErr) {
    return sendApiError(res, 500, 'Failed to save weirdling');
  }
  return res.json({ ok: true });
});
app.get('/api/weirdling/me', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const { data: rows, error } = await adminSupabase
    .from('weirdlings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return sendApiError(res, 500, 'Server error');
  const weirdlings = (rows ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    roleVibe: row.role_vibe,
    industryTags: row.industry_tags ?? [],
    tone: Number(row.tone),
    tagline: row.tagline,
    boundaries: row.boundaries ?? '',
    bio: row.bio ?? void 0,
    avatarUrl: row.avatar_url ?? void 0,
    promptVersion: row.prompt_version,
    modelVersion: row.model_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  return res.json({ ok: true, weirdlings });
});
app.delete('/api/weirdling/me/:id', requireAuth, async (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  if (!id) return sendApiError(res, 400, 'Missing weirdling id');
  const { error } = await adminSupabase
    .from('weirdlings')
    .update({
      is_active: false,
      updated_at: /* @__PURE__ */ new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) return sendApiError(res, 500, 'Server error');
  return res.json({ ok: true });
});
app.get('/api/admin/profiles', requireAdmin, async (req, res) => {
  const status = normalizeStatus(String(req.query.status || 'pending'));
  const qRaw = String(req.query.q || '').trim();
  const q = qRaw.replaceAll(',', ' ').trim();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
  const offset = Math.max(0, Number(req.query.offset || 0));
  const sortRaw = String(req.query.sort || 'created_at');
  const sort = sortRaw === 'updated_at' ? 'updated_at' : 'created_at';
  const orderRaw = String(req.query.order || 'asc').toLowerCase();
  const ascending = orderRaw !== 'desc';
  let query = adminSupabase.from('profiles').select('*', { count: 'exact' });
  if (status !== 'all') query = query.eq('status', status);
  if (q) {
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
  return res.json({
    data: data ?? [],
    count: count ?? 0,
  });
});
const requireIds = (body) => {
  if (!body || typeof body !== 'object') return [];
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return ids.map(String).filter(Boolean);
};
app.post('/api/admin/profiles/approve', requireAdmin, async (req, res) => {
  const ids = requireIds(req.body);
  if (ids.length === 0) return sendApiError(res, 400, 'Missing ids[]');
  const { error } = await adminSupabase
    .from('profiles')
    .update({
      status: 'approved',
      reviewed_at: /* @__PURE__ */ new Date().toISOString(),
    })
    .in('id', ids);
  if (error) return sendApiError(res, 500, 'Server error');
  return res.json({ ok: true });
});
app.post('/api/admin/profiles/reject', requireAdmin, async (req, res) => {
  const ids = requireIds(req.body);
  if (ids.length === 0) return sendApiError(res, 400, 'Missing ids[]');
  const { error } = await adminSupabase
    .from('profiles')
    .update({
      status: 'rejected',
      reviewed_at: /* @__PURE__ */ new Date().toISOString(),
    })
    .in('id', ids);
  if (error) return sendApiError(res, 500, 'Server error');
  return res.json({ ok: true });
});
app.post('/api/admin/profiles/disable', requireAdmin, async (req, res) => {
  const ids = requireIds(req.body);
  if (ids.length === 0) return sendApiError(res, 400, 'Missing ids[]');
  const { error } = await adminSupabase
    .from('profiles')
    .update({
      status: 'disabled',
      reviewed_at: /* @__PURE__ */ new Date().toISOString(),
    })
    .in('id', ids);
  if (error) return sendApiError(res, 500, 'Server error');
  return res.json({ ok: true });
});
app.post('/api/admin/profiles/delete', requireAdmin, async (req, res) => {
  const body = req.body;
  const ids = requireIds(body);
  if (ids.length === 0) return sendApiError(res, 400, 'Missing ids[]');
  const { error: profErr } = await adminSupabase
    .from('profiles')
    .delete()
    .in('id', ids);
  if (profErr) return sendApiError(res, 500, 'Server error');
  if (body.hardDeleteAuthUsers) {
    for (const id of ids) {
      try {
        await adminSupabase.auth.admin.deleteUser(id);
      } catch {
        // Ignore best-effort auth cleanup failures after the profile delete succeeds.
      }
    }
  }
  return res.json({ ok: true });
});
const FEED_EMOJI_REACTION_TYPES = [
  'like',
  'love',
  'inspiration',
  'care',
  'laughing',
  'rage',
];
const FEED_EMOJI_REACTION_FILTER = FEED_EMOJI_REACTION_TYPES.map(
  (type) => `payload->>type.eq.${type}`,
).join(',');

app.get('/api/feeds', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const savedOnly = req.query.saved === 'true';
    const cursorRaw =
      typeof req.query.cursor === 'string' ? req.query.cursor.trim() : null;
    let cursorCreatedAt = null;
    let cursorId = null;
    if (cursorRaw) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursorRaw, 'base64').toString('utf8'),
        );
        cursorCreatedAt =
          typeof decoded.created_at === 'string' ? decoded.created_at : null;
        cursorId = typeof decoded.id === 'string' ? decoded.id : null;
      } catch {
        // Ignore invalid cursor payloads and fall back to the first page of results.
      }
    }
    let rows;
    if (savedOnly) {
      const { data: savedRows, error } = await adminSupabase.rpc(
        'get_saved_feed_page',
        {
          p_viewer_id: userId,
          p_cursor_created_at: cursorCreatedAt,
          p_cursor_id: cursorId,
          p_limit: limit + 1,
        },
      );
      if (error) {
        console.error(
          '[GET /api/feeds] get_saved_feed_page RPC error:',
          error.message,
          error,
        );
        return sendApiError(
          res,
          500,
          'Saved feed could not be loaded. Ensure Supabase migrations are applied.',
        );
      }
      rows = Array.isArray(savedRows) ? savedRows : [];
    } else {
      const { data: prefRow } = await adminSupabase
        .from('profiles')
        .select('feed_view_preference')
        .eq('id', userId)
        .maybeSingle();
      const feedView =
        prefRow?.feed_view_preference === 'connections'
          ? 'connections'
          : 'anyone';
      const { data: data2, error } = await adminSupabase.rpc('get_feed_page', {
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
      rows = Array.isArray(data2) ? data2 : [];
    }
    const list = rows;
    const hasMore = list.length > limit;
    const page = hasMore ? list.slice(0, limit) : list;
    const actorIds = [
      ...new Set(page.map((row) => row.user_id).filter(Boolean)),
    ];
    const actorBioById = {};
    if (actorIds.length > 0) {
      const { data: actorProfiles } = await adminSupabase
        .from('profiles')
        .select('id, bio')
        .in('id', actorIds);
      for (const profile of actorProfiles ?? []) {
        actorBioById[profile.id] =
          typeof profile.bio === 'string' ? profile.bio : null;
      }
    }
    const last = page[page.length - 1];
    const sortAt = savedOnly
      ? last?.saved_at
      : (last?.scheduled_at ?? last?.created_at);
    const nextCursor =
      hasMore && sortAt && last?.id
        ? Buffer.from(
            JSON.stringify({ created_at: sortAt, id: last.id }),
            'utf8',
          ).toString('base64')
        : void 0;
    const data = page.map((row) => ({
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
        bio: actorBioById[row.user_id] ?? null,
      },
      like_count: Number(row.like_count ?? 0),
      love_count: Number(row.love_count ?? 0),
      inspiration_count: Number(row.inspiration_count ?? 0),
      care_count: Number(row.care_count ?? 0),
      laughing_count: Number(row.laughing_count ?? 0),
      rage_count: Number(row.rage_count ?? 0),
      viewer_reaction: row.viewer_reaction ?? null,
      comment_count: Number(row.comment_count ?? 0),
      viewer_saved: Boolean(row.viewer_saved),
    }));
    return res.json({ data, nextCursor });
  } catch (e) {
    console.error('[GET /api/feeds] Unhandled error:', e);
    return sendApiError(res, 500, 'Feed could not be loaded.');
  }
});
app.post('/api/feeds', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const body = req.body;
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
    const payload2 = { body: text };
    const firstUrl = getFirstUrl(text);
    if (firstUrl) {
      const linkPreview = await fetchLinkPreview(firstUrl);
      if (linkPreview) payload2.link_preview = linkPreview;
    }
    const imagesRaw = body.images;
    if (
      Array.isArray(imagesRaw) &&
      imagesRaw.length > 0 &&
      imagesRaw.every((u) => typeof u === 'string')
    ) {
      payload2.images = imagesRaw.filter((u) => u.trim().length > 0);
    }
    const scheduledAtRaw =
      typeof body.scheduled_at === 'string' ? body.scheduled_at.trim() : null;
    let scheduledAt = null;
    if (scheduledAtRaw) {
      const d = new Date(scheduledAtRaw);
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
        scheduledAt = d.toISOString();
      }
    }
    const { error: error2 } = await adminSupabase.from('feed_items').insert({
      user_id: userId,
      kind: 'post',
      payload: payload2,
      ...(scheduledAt && { scheduled_at: scheduledAt }),
    });
    if (error2) {
      return sendApiError(res, 500, 'Server error');
    }
    return res.status(201).json({ ok: true });
  }
  if (rawKind === 'reaction') {
    const parentId =
      typeof body.parent_id === 'string' ? body.parent_id.trim() : null;
    const type =
      typeof body.type === 'string' ? body.type.trim().toLowerCase() : '';
    const isEmoji = FEED_EMOJI_REACTION_TYPES.includes(type);
    if (!parentId || (type !== 'comment' && !isEmoji)) {
      return sendApiError(
        res,
        400,
        'parent_id and type (like|love|inspiration|care|laughing|rage|comment) required',
      );
    }
    const payload2 = { type };
    if (type === 'comment') {
      const commentBody = typeof body.body === 'string' ? body.body.trim() : '';
      if (!commentBody) {
        return sendApiError(res, 400, 'Comment body required');
      }
      payload2.body = commentBody;
    }
    if (isEmoji) {
      await adminSupabase
        .from('feed_items')
        .delete()
        .eq('parent_id', parentId)
        .eq('user_id', userId)
        .or(FEED_EMOJI_REACTION_FILTER);
    }
    const { error: error2 } = await adminSupabase.from('feed_items').insert({
      user_id: userId,
      kind: 'reaction',
      parent_id: parentId,
      payload: payload2,
    });
    if (error2) return sendApiError(res, 500, 'Server error');
    return res.status(201).json({ ok: true });
  }
  if (rawKind === 'repost') {
    const originalId =
      typeof body.original_id === 'string' ? body.original_id.trim() : null;
    if (!originalId) {
      return sendApiError(res, 400, 'original_id required for repost');
    }
    const { data: existingRepost } = await adminSupabase
      .from('feed_items')
      .select('id')
      .eq('user_id', userId)
      .eq('kind', 'repost')
      .eq('payload->>original_id', originalId)
      .maybeSingle();
    if (existingRepost) {
      return sendApiError(res, 409, 'You have already reposted this post.');
    }
    const { data: original, error: fetchErr } = await adminSupabase
      .from('feed_items')
      .select('id, payload, created_at, user_id')
      .eq('id', originalId)
      .single();
    if (fetchErr || !original) {
      return sendApiError(res, 404, 'Original post not found');
    }
    const op = original.payload;
    const { data: author } = await adminSupabase
      .from('profiles')
      .select('handle, display_name, avatar')
      .eq('id', original.user_id)
      .single();
    let avatar = null;
    const { data: w } = await adminSupabase
      .from('weirdlings')
      .select('avatar_url')
      .eq('user_id', original.user_id)
      .eq('is_active', true)
      .maybeSingle();
    if (w?.avatar_url) avatar = w.avatar_url;
    else if (author && author.avatar) avatar = author.avatar;
    const snapshot = {
      body: op?.body ?? op?.text ?? '',
      created_at: original.created_at,
      actor_handle: author?.handle ?? null,
      actor_display_name: author?.display_name ?? null,
      actor_avatar: avatar,
    };
    const { error: error2 } = await adminSupabase.from('feed_items').insert({
      user_id: userId,
      kind: 'repost',
      payload: { original_id: originalId, snapshot },
    });
    if (error2) return sendApiError(res, 500, 'Server error');
    return res.status(201).json({ ok: true });
  }
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const label = typeof body.label === 'string' ? body.label.trim() : void 0;
  if (!url) {
    return sendApiError(res, 400, 'URL is required');
  }
  const payload = { url };
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
app.patch('/api/feeds/items/:postId', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const postIdRaw = req.params.postId;
  const postId = typeof postIdRaw === 'string' ? postIdRaw.trim() : '';
  if (!postId) return sendApiError(res, 400, 'Invalid post id');
  const reqBody = req.body;
  const text = typeof reqBody.body === 'string' ? reqBody.body.trim() : '';
  if (!text) return sendApiError(res, 400, 'Post body is required');
  const { data: existing, error: existingErr } = await adminSupabase
    .from('feed_items')
    .select('id, user_id, kind, payload')
    .eq('id', postId)
    .maybeSingle();
  if (existingErr) return sendApiError(res, 500, 'Server error');
  if (!existing) return sendApiError(res, 404, 'Post not found');
  if (existing.user_id !== userId) {
    return sendApiError(res, 403, 'Only the post author may edit');
  }
  if (existing.kind !== 'post') {
    return sendApiError(res, 400, 'Only post items can be edited');
  }
  const payload = existing.payload ?? {};
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
    .update({ payload, edited_at: /* @__PURE__ */ new Date().toISOString() })
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('kind', 'post');
  if (error) return sendApiError(res, 500, 'Server error');
  return res.status(204).send();
});
app.delete('/api/feeds/items/:postId', requireAuth, async (req, res) => {
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
  if (existing.user_id !== userId) {
    return sendApiError(res, 403, 'Only the post author may delete');
  }
  if (existing.kind === 'reaction') {
    return sendApiError(res, 400, 'Use comment delete endpoint for comments');
  }
  const { error } = await adminSupabase
    .from('feed_items')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);
  if (error) return sendApiError(res, 500, 'Server error');
  return res.status(204).send();
});
app.delete(
  '/api/feeds/items/:postId/reaction',
  requireAuth,
  async (req, res) => {
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
      .or(FEED_EMOJI_REACTION_FILTER);
    if (error) return sendApiError(res, 500, 'Server error');
    return res.status(204).send();
  },
);
app.post('/api/feeds/items/:postId/save', requireAuth, async (req, res) => {
  const userId = req.userId;
  const postId =
    typeof req.params.postId === 'string' ? req.params.postId.trim() : '';
  if (!userId || !postId) return sendApiError(res, 400, 'Invalid post id');
  const { error } = await adminSupabase.from('saved_feed_items').insert({
    user_id: userId,
    feed_item_id: postId,
  });
  if (error) {
    if (error.code === '23503') return sendApiError(res, 404, 'Post not found');
    if (error.code === '23505') return res.status(204).send();
    return sendApiError(res, 500, 'Could not save post');
  }
  return res.status(204).send();
});
app.delete('/api/feeds/items/:postId/save', requireAuth, async (req, res) => {
  const userId = req.userId;
  const postId =
    typeof req.params.postId === 'string' ? req.params.postId.trim() : '';
  if (!userId || !postId) return sendApiError(res, 400, 'Invalid post id');
  const { error } = await adminSupabase
    .from('saved_feed_items')
    .delete()
    .eq('user_id', userId)
    .eq('feed_item_id', postId);
  if (error) return sendApiError(res, 500, 'Could not unsave post');
  return res.status(204).send();
});
app.get('/api/feeds/items/:postId/comments', requireAuth, async (req, res) => {
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
  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const profilesMap = {};
  const weirdlingsMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id, handle, display_name, avatar, bio')
      .in('id', userIds);
    for (const p of profiles ?? []) {
      const id = p.id;
      profilesMap[id] = p;
    }
    const { data: weirdlings } = await adminSupabase
      .from('weirdlings')
      .select('user_id, avatar_url')
      .in('user_id', userIds)
      .eq('is_active', true);
    for (const w of weirdlings ?? []) {
      const uid = w.user_id;
      weirdlingsMap[uid] = w.avatar_url ?? null;
    }
  }
  const commentIds = comments.map((c) => c.id);
  let reactionRows = [];
  if (commentIds.length > 0) {
    const { data: rr } = await adminSupabase
      .from('feed_items')
      .select('parent_id, payload, user_id')
      .eq('kind', 'reaction')
      .in('parent_id', commentIds)
      .or(FEED_EMOJI_REACTION_FILTER);
    reactionRows = rr ?? [];
  }
  const reactionMap = {};
  for (const row of reactionRows) {
    const parentId = row.parent_id;
    if (!parentId) continue;
    if (!reactionMap[parentId]) {
      reactionMap[parentId] = {
        like_count: 0,
        love_count: 0,
        inspiration_count: 0,
        care_count: 0,
        laughing_count: 0,
        rage_count: 0,
        viewer_reaction: null,
      };
    }
    const type = row.payload?.type;
    if (type === 'like') reactionMap[parentId].like_count += 1;
    if (type === 'love') reactionMap[parentId].love_count += 1;
    if (type === 'inspiration') reactionMap[parentId].inspiration_count += 1;
    if (type === 'care') reactionMap[parentId].care_count += 1;
    if (type === 'laughing') reactionMap[parentId].laughing_count += 1;
    if (type === 'rage') reactionMap[parentId].rage_count += 1;
    if (type && row.user_id === req.userId) {
      reactionMap[parentId].viewer_reaction = type;
    }
  }
  const list = comments.map((r) => {
    const uid = r.user_id;
    const p = profilesMap[uid];
    const avatar = weirdlingsMap[uid] ?? p?.avatar ?? null;
    const counts = reactionMap[String(r.id)] ?? {
      like_count: 0,
      love_count: 0,
      inspiration_count: 0,
      care_count: 0,
      laughing_count: 0,
      rage_count: 0,
      viewer_reaction: null,
    };
    return {
      id: r.id,
      user_id: r.user_id,
      body: r.payload?.body ?? '',
      created_at: r.created_at,
      edited_at: r.edited_at ?? null,
      like_count: counts.like_count,
      love_count: counts.love_count,
      inspiration_count: counts.inspiration_count,
      care_count: counts.care_count,
      laughing_count: counts.laughing_count,
      rage_count: counts.rage_count,
      viewer_reaction: counts.viewer_reaction,
      actor: {
        handle: p?.handle ?? null,
        display_name: p?.display_name ?? null,
        avatar: avatar ?? null,
        bio: p?.bio ?? null,
      },
    };
  });
  return res.json({ data: list });
});
app.patch('/api/feeds/comments/:commentId', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const commentIdRaw = req.params.commentId;
  const commentId = typeof commentIdRaw === 'string' ? commentIdRaw.trim() : '';
  if (!commentId) return sendApiError(res, 400, 'Invalid comment id');
  const reqBody = req.body;
  const text = typeof reqBody.body === 'string' ? reqBody.body.trim() : '';
  if (!text) return sendApiError(res, 400, 'Comment body is required');
  const { data: existing, error: existingErr } = await adminSupabase
    .from('feed_items')
    .select('id, user_id, kind, payload')
    .eq('id', commentId)
    .maybeSingle();
  if (existingErr) return sendApiError(res, 500, 'Server error');
  if (!existing) return sendApiError(res, 404, 'Comment not found');
  if (existing.user_id !== userId) {
    return sendApiError(res, 403, 'Only the comment author may edit');
  }
  const type = existing.payload?.type;
  if (existing.kind !== 'reaction' || type !== 'comment') {
    return sendApiError(res, 400, 'Target item is not a comment');
  }
  const payload = existing.payload ?? {};
  payload.body = text;
  const { error } = await adminSupabase
    .from('feed_items')
    .update({ payload, edited_at: /* @__PURE__ */ new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', userId);
  if (error) return sendApiError(res, 500, 'Server error');
  return res.status(204).send();
});
app.delete('/api/feeds/comments/:commentId', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const commentIdRaw = req.params.commentId;
  const commentId = typeof commentIdRaw === 'string' ? commentIdRaw.trim() : '';
  if (!commentId) return sendApiError(res, 400, 'Invalid comment id');
  const { data: existing, error: existingErr } = await adminSupabase
    .from('feed_items')
    .select('id, user_id, kind, payload')
    .eq('id', commentId)
    .maybeSingle();
  if (existingErr) return sendApiError(res, 500, 'Server error');
  if (!existing) return sendApiError(res, 404, 'Comment not found');
  if (existing.user_id !== userId) {
    return sendApiError(res, 403, 'Only the comment author may delete');
  }
  const type = existing.payload?.type;
  if (existing.kind !== 'reaction' || type !== 'comment') {
    return sendApiError(res, 400, 'Target item is not a comment');
  }
  const { error } = await adminSupabase
    .from('feed_items')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);
  if (error) return sendApiError(res, 500, 'Server error');
  return res.status(204).send();
});
const directoryRateLimitAndLog = (req, res, next) => {
  const userId = req.userId;
  if (!userId) {
    next();
    return;
  }
  const action = req.method === 'GET' ? 'list' : 'action';
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
      void 0,
      rl.retryAfter ? { retryAfter: rl.retryAfter } : void 0,
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
app.get('/api/directory', async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const DIRECTORY_SEARCH_MAX_CHARS = 500;
  const rawSearch = typeof req.query.q === 'string' ? req.query.q.trim() : null;
  if (rawSearch && rawSearch.length > DIRECTORY_SEARCH_MAX_CHARS) {
    return sendApiError(
      res,
      400,
      `Search query cannot exceed ${DIRECTORY_SEARCH_MAX_CHARS} characters.`,
    );
  }
  const search =
    typeof req.query.q === 'string' ? req.query.q.trim() || null : null;
  const primaryIndustry =
    typeof req.query.primary_industry === 'string'
      ? req.query.primary_industry.trim() || null
      : null;
  const secondaryIndustry =
    typeof req.query.secondary_industry === 'string'
      ? req.query.secondary_industry.trim() || null
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
  const skillsArr =
    typeof skillsRaw === 'string'
      ? skillsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(skillsRaw)
        ? skillsRaw.map((s) => String(s).trim()).filter(Boolean)
        : [];
  const interestsRaw = req.query.interests;
  const interestsArr =
    typeof interestsRaw === 'string'
      ? interestsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(interestsRaw)
        ? interestsRaw.map((s) => String(s).trim()).filter(Boolean)
        : [];
  const { data: rows, error } = await adminSupabase.rpc('get_directory_page', {
    p_viewer_id: userId,
    p_search: search,
    p_primary_industry: primaryIndustry,
    p_secondary_industry: secondaryIndustry,
    p_location: location,
    p_skills: skillsArr.length > 0 ? skillsArr : null,
    p_interests: interestsArr.length > 0 ? interestsArr : null,
    p_connection_status: connectionStatus,
    p_sort: sort,
    p_offset: offset,
    p_limit: limit + 1,
  });
  if (error) {
    logDirectoryError({
      method: 'GET',
      path: '/api/directory',
      userId: userId ?? void 0,
      error: error.message,
    });
    return sendApiError(res, 500, 'Server error');
  }
  const list = Array.isArray(rows) ? rows : [];
  const hasMore = list.length > limit;
  const data = hasMore ? list.slice(0, limit) : list;
  return res.json({ data, hasMore });
});
const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET?.trim() || '';
const UNSUBSCRIBE_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1e3;
function verifyUnsubscribeToken(token) {
  if (!UNSUBSCRIBE_SECRET) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const [rawPayload, rawExpiry, rawSig] = parts;
    const userId = Buffer.from(rawPayload, 'base64url').toString('utf8');
    const expiry = parseInt(
      Buffer.from(rawExpiry, 'base64url').toString('utf8'),
      10,
    );
    if (!userId || userId.length > 128) return null;
    if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
    const expected = crypto
      .createHmac('sha256', UNSUBSCRIBE_SECRET)
      .update(rawPayload + rawExpiry)
      .digest('base64url');
    if (expected !== rawSig) return null;
    return userId;
  } catch {
    return null;
  }
}
function buildUnsubscribeToken(userId) {
  if (!UNSUBSCRIBE_SECRET) return null;
  const expiry = Date.now() + UNSUBSCRIBE_TOKEN_TTL_MS;
  const rawPayload = Buffer.from(userId, 'utf8').toString('base64url');
  const rawExpiry = Buffer.from(String(expiry), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', UNSUBSCRIBE_SECRET)
    .update(rawPayload + rawExpiry)
    .digest('base64url');
  return `${rawPayload}.${rawExpiry}.${sig}`;
}
app.get('/api/unsubscribe/token', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const token = buildUnsubscribeToken(userId);
  if (!token)
    return sendApiError(
      res,
      503,
      'Unsubscribe links are not configured on this server.',
    );
  return res.json({ token });
});
app.get('/api/unsubscribe', async (req, res) => {
  const token =
    typeof req.query.token === 'string' ? req.query.token.trim() : '';
  if (!token) return sendApiError(res, 400, 'Missing token');
  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return sendApiError(
      res,
      400,
      'Invalid or expired link. Please sign in and use Settings \u2192 Email preferences to unsubscribe.',
    );
  }
  const { error } = await adminSupabase
    .from('profiles')
    .update({
      marketing_email_enabled: false,
      marketing_opt_in: false,
      marketing_product_updates: false,
      marketing_events: false,
      consent_updated_at: /* @__PURE__ */ new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id')
    .maybeSingle();
  if (error) return sendApiError(res, 500, 'Server error');
  return res.json({ ok: true });
});
app.get('/api/link-preview', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  if (!rawUrl) return sendApiError(res, 400, 'Missing url');
  const preview = await fetchLinkPreview(rawUrl);
  return res.json({ ok: true, data: preview });
});
const uploadChatGifFile = upload.single('file');
app.post('/api/chat/attachments/process-gif', requireAuth, (req, res) => {
  uploadChatGifFile(req, res, async (uploadErr) => {
    if (uploadErr) return sendApiError(res, 400, 'GIF upload failed');
    const userId = req.userId;
    if (!userId) return sendApiError(res, 401, 'Unauthorized');
    const file = req.file;
    if (!file || file.mimetype !== 'image/gif') {
      return sendApiError(res, 400, 'GIF file required');
    }
    if (file.size > CHAT_GIF_PROCESSING_MAX_BYTES) {
      return sendApiError(
        res,
        413,
        'This GIF is too large to process. Try a smaller file.',
      );
    }

    try {
      const processedBuffer = await transcodeGifBufferToMp4(file.buffer);
      if (processedBuffer.length > CHAT_PROCESSED_MEDIA_MAX_BYTES) {
        return sendApiError(
          res,
          413,
          'This GIF is too large to process. Try a smaller file.',
        );
      }
      const storagePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.mp4`;
      const { error } = await adminSupabase.storage
        .from('chat-attachments')
        .upload(storagePath, processedBuffer, {
          contentType: 'video/mp4',
          upsert: false,
        });
      if (error) return sendApiError(res, 500, 'GIF processing failed');

      return res.json({
        ok: true,
        data: {
          path: storagePath,
          mime: 'video/mp4',
          size: processedBuffer.length,
        },
      });
    } catch (cause) {
      console.error('[chat/process-gif] failed', cause);
      return sendApiError(res, 500, 'GIF processing failed');
    }
  });
});
app.post('/api/resumes/generate-thumbnail', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const storagePath =
    typeof req.body.storagePath === 'string' ? req.body.storagePath.trim() : '';
  if (!storagePath) return sendApiError(res, 400, 'Missing storagePath');
  if (!storagePath.startsWith(`${userId}/`)) {
    return sendApiError(res, 403, 'Forbidden');
  }
  const extension = getResumeExtension(storagePath);
  if (!isSupportedResumeThumbnailExtension(extension)) {
    return sendApiError(res, 400, 'Only .doc and .docx are supported');
  }
  try {
    const { thumbnailUrl, durationMs } =
      await generateAndPersistResumeThumbnail(userId, storagePath);
    console.info('[resume-thumbnail] complete', {
      userId,
      storagePath,
      durationMs,
    });
    return res.json({
      ok: true,
      data: { status: 'complete', thumbnailUrl },
    });
  } catch (e) {
    const message = errorMessage(e, 'Thumbnail generation failed');
    console.warn('[resume-thumbnail] failed', {
      userId,
      storagePath,
      message,
    });
    return sendApiError(res, 422, message);
  }
});
app.post('/api/directory/connect', async (req, res) => {
  const userId = req.userId;
  const targetId =
    typeof req.body.targetId === 'string' ? req.body.targetId.trim() : null;
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
  if (profile && profile.status === 'disabled')
    return sendApiError(res, 403, 'Account disabled');
  const { data: existingConnections } = await adminSupabase
    .from('feed_connections')
    .select('user_id, connected_user_id')
    .or(
      `and(user_id.eq.${userId},connected_user_id.eq.${targetId}),and(user_id.eq.${targetId},connected_user_id.eq.${userId})`,
    );
  const { data: reversePending } = await adminSupabase
    .from('connection_requests')
    .select('id')
    .eq('requester_id', targetId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .maybeSingle();
  const intent = getConnectIntent(
    Boolean(reversePending),
    Boolean(existingConnections?.length),
  );
  if (intent === 'normalize_existing_connection') {
    const nowIso = /* @__PURE__ */ new Date().toISOString();
    await adminSupabase.from('feed_connections').upsert(
      [
        { user_id: userId, connected_user_id: targetId },
        { user_id: targetId, connected_user_id: userId },
      ],
      { onConflict: 'user_id,connected_user_id' },
    );
    await adminSupabase
      .from('connection_requests')
      .update({ status: 'accepted', updated_at: nowIso })
      .or(
        `and(requester_id.eq.${userId},recipient_id.eq.${targetId},status.eq.pending),and(requester_id.eq.${targetId},recipient_id.eq.${userId},status.eq.pending)`,
      );
    return res
      .status(200)
      .json({ ok: true, normalizedExistingConnection: true });
  }
  if (intent === 'auto_accept_reverse_pending') {
    const nowIso = /* @__PURE__ */ new Date().toISOString();
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
  const { data: existing } = await adminSupabase
    .from('connection_requests')
    .select('id, status')
    .eq('requester_id', userId)
    .eq('recipient_id', targetId)
    .maybeSingle();
  if (existing) {
    const status = existing.status;
    if (status === 'accepted') return res.status(200).json({ ok: true });
    if (status === 'pending') return res.status(200).json({ ok: true });
    if (status === 'declined') {
      const nowIso = /* @__PURE__ */ new Date().toISOString();
      const { error: updateErr } = await adminSupabase
        .from('connection_requests')
        .update({ status: 'pending', updated_at: nowIso })
        .eq('requester_id', userId)
        .eq('recipient_id', targetId);
      if (updateErr) {
        logDirectoryError({
          method: 'POST',
          path: '/api/directory/connect',
          userId: userId ?? void 0,
          error: updateErr.message,
        });
        return sendApiError(res, 500, 'Server error');
      }
      return res.status(201).json({ ok: true });
    }
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
      userId: userId ?? void 0,
      error: error.message,
    });
    return sendApiError(res, 500, 'Server error');
  }
  return res.status(201).json({ ok: true });
});
app.get(
  '/api/admin/resume-thumbnails/summary',
  requireAdmin,
  async (_req, res) => {
    const [
      pending,
      complete,
      failed,
      totalWithResume,
      recentFailed,
      recentRuns,
    ] = await Promise.all([
      adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('nerd_creds->>resume_thumbnail_status', 'pending'),
      adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('nerd_creds->>resume_thumbnail_status', 'complete'),
      adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('nerd_creds->>resume_thumbnail_status', 'failed'),
      adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('resume_url', 'is', null),
      adminSupabase
        .from('profiles')
        .select('id, handle, nerd_creds')
        .eq('nerd_creds->>resume_thumbnail_status', 'failed')
        .order('updated_at', { ascending: false })
        .limit(5),
      adminSupabase
        .from('audit_log')
        .select('id, action, target_id, meta, created_at')
        .eq('target_type', 'resume_thumbnail_backfill')
        .in('action', [
          'RESUME_THUMBNAIL_BACKFILL_STARTED',
          'RESUME_THUMBNAIL_BACKFILL_COMPLETED',
          'RESUME_THUMBNAIL_BACKFILL_FAILED',
        ])
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    const firstError =
      pending.error ||
      complete.error ||
      failed.error ||
      totalWithResume.error ||
      recentFailed.error ||
      recentRuns.error;
    if (firstError) {
      return sendApiError(
        res,
        500,
        errorMessage(firstError.message, 'Could not load thumbnail summary'),
      );
    }
    const recentFailures = (recentFailed.data ?? []).map((row) => {
      const creds = row.nerd_creds;
      const meta = creds && typeof creds === 'object' ? creds : {};
      return {
        profileId: row.id,
        handle: row.handle ?? null,
        error:
          typeof meta.resume_thumbnail_error === 'string'
            ? meta.resume_thumbnail_error
            : null,
        updatedAt:
          typeof meta.resume_thumbnail_updated_at === 'string'
            ? meta.resume_thumbnail_updated_at
            : null,
      };
    });
    const latestBackfillRuns = (recentRuns.data ?? []).map((row) => {
      const meta =
        row.meta && typeof row.meta === 'object' ? (row.meta ?? {}) : {};
      return {
        id: row.id,
        action: row.action,
        runId:
          typeof meta.runId === 'string' ? meta.runId : (row.target_id ?? null),
        attempted: typeof meta.attempted === 'number' ? meta.attempted : null,
        completed: typeof meta.completed === 'number' ? meta.completed : null,
        failed: typeof meta.failed === 'number' ? meta.failed : null,
        durationMs:
          typeof meta.durationMs === 'number' ? meta.durationMs : null,
        createdAt: row.created_at,
      };
    });
    const activeBackfillLock = await fetchActiveResumeBackfillLock();
    return res.json({
      ok: true,
      data: {
        pending: pending.count ?? 0,
        complete: complete.count ?? 0,
        failed: failed.count ?? 0,
        totalWithResume: totalWithResume.count ?? 0,
        recentFailures,
        backfillLock: activeBackfillLock
          ? {
              runId: activeBackfillLock.runId,
              acquiredAt: activeBackfillLock.acquiredAtIso,
              adminEmail: activeBackfillLock.adminEmail ?? null,
            }
          : null,
        latestBackfillRuns,
      },
      error: null,
    });
  },
);
app.get(
  '/api/admin/resume-thumbnails/failures',
  requireAdmin,
  async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const { data, error, count } = await adminSupabase
      .from('profiles')
      .select('id, handle, resume_url, nerd_creds, updated_at', {
        count: 'exact',
      })
      .eq('nerd_creds->>resume_thumbnail_status', 'failed')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error)
      return sendApiError(
        res,
        500,
        errorMessage(error.message, 'Server error'),
      );
    const rows = (data ?? []).map((row) => {
      const creds = row.nerd_creds;
      const meta = creds && typeof creds === 'object' ? creds : {};
      return {
        profileId: row.id,
        handle: row.handle ?? null,
        resumeUrl: row.resume_url ?? null,
        error:
          typeof meta.resume_thumbnail_error === 'string'
            ? meta.resume_thumbnail_error
            : null,
        status:
          typeof meta.resume_thumbnail_status === 'string'
            ? meta.resume_thumbnail_status
            : 'failed',
        updatedAt:
          typeof meta.resume_thumbnail_updated_at === 'string'
            ? meta.resume_thumbnail_updated_at
            : (row.updated_at ?? null),
      };
    });
    return res.json({
      ok: true,
      data: rows,
      meta: { total: count ?? 0, limit, offset },
      error: null,
    });
  },
);
app.get('/api/admin/resume-thumbnails/runs', requireAdmin, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const action =
    typeof req.query.action === 'string' ? req.query.action.trim() : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  let query = adminSupabase
    .from('audit_log')
    .select('id, actor_email, action, target_id, meta, created_at', {
      count: 'exact',
    })
    .eq('target_type', 'resume_thumbnail_backfill')
    .in('action', [
      'RESUME_THUMBNAIL_BACKFILL_STARTED',
      'RESUME_THUMBNAIL_BACKFILL_COMPLETED',
      'RESUME_THUMBNAIL_BACKFILL_FAILED',
    ]);
  if (action) query = query.eq('action', action);
  if (q) query = query.ilike('target_id', `%${q}%`);
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error)
    return sendApiError(res, 500, errorMessage(error.message, 'Server error'));
  const rows = (data ?? []).map((row) => {
    const meta =
      row.meta && typeof row.meta === 'object' ? (row.meta ?? {}) : {};
    return {
      id: row.id,
      actorEmail: row.actor_email ?? null,
      action: row.action,
      runId:
        typeof meta.runId === 'string' ? meta.runId : (row.target_id ?? null),
      attempted: typeof meta.attempted === 'number' ? meta.attempted : null,
      completed: typeof meta.completed === 'number' ? meta.completed : null,
      failed: typeof meta.failed === 'number' ? meta.failed : null,
      durationMs: typeof meta.durationMs === 'number' ? meta.durationMs : null,
      createdAt: row.created_at,
    };
  });
  return res.json({
    ok: true,
    data: rows,
    meta: { total: count ?? 0, limit, offset },
    error: null,
  });
});
app.get(
  '/api/admin/resume-thumbnails/runs/:runId',
  requireAdmin,
  async (req, res) => {
    const rawRunId = req.params.runId;
    const runId =
      typeof rawRunId === 'string'
        ? rawRunId.trim()
        : Array.isArray(rawRunId)
          ? (rawRunId[0] ?? '').trim()
          : '';
    if (!runId) return sendApiError(res, 400, 'Missing runId');
    const { data, error } = await adminSupabase
      .from('audit_log')
      .select('id, actor_email, action, target_id, meta, created_at')
      .eq('target_type', 'resume_thumbnail_backfill')
      .eq('target_id', runId)
      .order('created_at', { ascending: true });
    if (error)
      return sendApiError(
        res,
        500,
        errorMessage(error.message, 'Server error'),
      );
    if (!data || data.length === 0)
      return sendApiError(res, 404, 'Run not found');
    const items = data.map((row) => {
      const meta =
        row.meta && typeof row.meta === 'object' ? (row.meta ?? {}) : {};
      return {
        id: row.id,
        actorEmail: row.actor_email ?? null,
        action: row.action,
        createdAt: row.created_at,
        meta,
      };
    });
    return res.json({
      ok: true,
      data: {
        runId,
        events: items,
      },
      error: null,
    });
  },
);
app.post(
  '/api/admin/resume-thumbnails/retry',
  requireAdmin,
  async (req, res) => {
    const profileId =
      typeof req.body.profileId === 'string' ? req.body.profileId.trim() : '';
    if (!profileId) return sendApiError(res, 400, 'Missing profileId');
    const { data: profile, error } = await adminSupabase
      .from('profiles')
      .select('id, resume_url')
      .eq('id', profileId)
      .maybeSingle();
    if (error)
      return sendApiError(
        res,
        500,
        errorMessage(error.message, 'Server error'),
      );
    if (!profile) return sendApiError(res, 404, 'Profile not found');
    const resumeUrl = profile.resume_url ?? null;
    if (!resumeUrl) return sendApiError(res, 400, 'Profile has no resume URL');
    const storagePath = decodeResumeStoragePath(resumeUrl);
    if (!storagePath)
      return sendApiError(res, 400, 'Resume URL is not in resumes bucket');
    try {
      const result = await generateAndPersistResumeThumbnail(
        profileId,
        storagePath,
      );
      return res.json({
        ok: true,
        data: {
          profileId,
          status: 'complete',
          thumbnailUrl: result.thumbnailUrl,
          durationMs: result.durationMs,
        },
      });
    } catch (e) {
      return sendApiError(res, 422, errorMessage(e, 'Thumbnail retry failed'));
    }
  },
);
app.post(
  '/api/admin/resume-thumbnails/backfill',
  requireAdmin,
  async (req, res) => {
    const acquired = await acquireResumeBackfillLock(
      req.adminEmail,
      req.adminUserId,
    );
    const activeLock = acquired.lock;
    if (!activeLock) {
      return sendApiError(
        res,
        500,
        'Could not acquire backfill lock. Please try again.',
      );
    }
    if (acquired.lockExpiresInMs !== RESUME_BACKFILL_LOCK_TTL_MS) {
      return sendApiError(
        res,
        409,
        'A resume thumbnail backfill is already in progress.',
        'BACKFILL_LOCKED',
        {
          runId: activeLock.runId,
          acquiredAt: activeLock.acquiredAtIso,
          lockExpiresInMs: acquired.lockExpiresInMs ?? 0,
        },
      );
    }
    const runId = activeLock.runId;
    const recordBackfillAudit = async (action, meta) => {
      await adminSupabase.from('audit_log').insert({
        actor_id: req.adminUserId ?? null,
        actor_email: req.adminEmail ?? null,
        action,
        target_type: 'resume_thumbnail_backfill',
        target_id: runId,
        meta: {
          runId,
          ...meta,
        },
      });
    };
    const limit = Math.min(200, Math.max(1, Number(req.body.limit) || 25));
    const startedAt = Date.now();
    await recordBackfillAudit('RESUME_THUMBNAIL_BACKFILL_STARTED', {
      limit,
      lockTtlMs: RESUME_BACKFILL_LOCK_TTL_MS,
    });
    try {
      const { data: rows, error } = await adminSupabase
        .from('profiles')
        .select('id, resume_url, nerd_creds')
        .not('resume_url', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(limit * 4);
      if (error) {
        throw new Error(errorMessage(error.message, 'Server error'));
      }
      const candidates = (rows ?? [])
        .map((row) => {
          const profileId = row.id;
          const resumeUrl = row.resume_url ?? null;
          const nerdCreds = row.nerd_creds;
          const status =
            nerdCreds && typeof nerdCreds === 'object'
              ? nerdCreds.resume_thumbnail_status
              : null;
          if (!resumeUrl || status === 'complete') return null;
          const storagePath = decodeResumeStoragePath(resumeUrl);
          if (!storagePath) return null;
          const extension = getResumeExtension(storagePath);
          if (!isSupportedResumeThumbnailExtension(extension)) return null;
          return { profileId, storagePath };
        })
        .filter((item) => Boolean(item))
        .slice(0, limit);
      const results = [];
      for (const candidate of candidates) {
        try {
          await generateAndPersistResumeThumbnail(
            candidate.profileId,
            candidate.storagePath,
          );
          results.push({ profileId: candidate.profileId, status: 'complete' });
        } catch (e) {
          results.push({
            profileId: candidate.profileId,
            status: 'failed',
            message: errorMessage(e, 'Thumbnail generation failed'),
          });
        }
      }
      const completed = results.filter((r) => r.status === 'complete').length;
      const failedCount = results.filter((r) => r.status === 'failed').length;
      const attempted = results.length;
      const durationMs = Date.now() - startedAt;
      await recordBackfillAudit('RESUME_THUMBNAIL_BACKFILL_COMPLETED', {
        limit,
        attempted,
        completed,
        failed: failedCount,
        durationMs,
        failedProfiles: results
          .filter((r) => r.status === 'failed')
          .map((r) => ({
            profileId: r.profileId,
            message: r.message ?? 'Thumbnail generation failed',
          })),
      });
      return res.json({
        ok: true,
        data: {
          runId,
          attempted,
          completed,
          failed: failedCount,
          durationMs,
          results,
        },
        error: null,
      });
    } catch (e) {
      const message = errorMessage(e, 'Backfill failed');
      await recordBackfillAudit('RESUME_THUMBNAIL_BACKFILL_FAILED', {
        limit,
        durationMs: Date.now() - startedAt,
        error: message,
      });
      return sendApiError(res, 500, message);
    } finally {
      await releaseResumeBackfillLock(runId, req.adminEmail, req.adminUserId);
    }
  },
);
app.post('/api/directory/accept', async (req, res) => {
  const userId = req.userId;
  const targetId =
    typeof req.body.targetId === 'string' ? req.body.targetId.trim() : null;
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
    .update({
      status: 'accepted',
      updated_at: /* @__PURE__ */ new Date().toISOString(),
    })
    .eq('id', reqRow.id);
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
    reference_id: reqRow.id,
    reference_type: 'connection_request',
    payload: {
      request_id: reqRow.id,
      status: 'accepted',
    },
  });
  return res.json({ ok: true });
});
app.post('/api/directory/decline', async (req, res) => {
  const userId = req.userId;
  const targetId =
    typeof req.body.targetId === 'string' ? req.body.targetId.trim() : null;
  if (!userId || !targetId) return sendApiError(res, 400, 'Missing targetId');
  const { data } = await adminSupabase
    .from('connection_requests')
    .update({
      status: 'declined',
      updated_at: /* @__PURE__ */ new Date().toISOString(),
    })
    .eq('requester_id', targetId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .select('id');
  if (!data?.length) return sendApiError(res, 404, 'No pending request found');
  const requestId = data[0].id;
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
app.post('/api/directory/cancel', async (req, res) => {
  const userId = req.userId;
  const targetId =
    typeof req.body.targetId === 'string' ? req.body.targetId.trim() : null;
  if (!userId || !targetId) return sendApiError(res, 400, 'Missing targetId');
  const { data, error } = await adminSupabase
    .from('connection_requests')
    .delete()
    .eq('requester_id', userId)
    .eq('recipient_id', targetId)
    .eq('status', 'pending')
    .select('id');
  if (error) {
    logDirectoryError({
      method: 'POST',
      path: '/api/directory/cancel',
      userId: userId ?? void 0,
      error: error.message,
    });
    return sendApiError(res, 500, 'Server error');
  }
  if (!data?.length) return sendApiError(res, 404, 'No pending request found');
  return res.json({ ok: true });
});
app.post('/api/directory/disconnect', async (req, res) => {
  const userId = req.userId;
  const targetId =
    typeof req.body.targetId === 'string' ? req.body.targetId.trim() : null;
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
  await adminSupabase
    .from('connection_requests')
    .update({
      status: 'declined',
      updated_at: /* @__PURE__ */ new Date().toISOString(),
    })
    .or(
      `and(requester_id.eq.${userId},recipient_id.eq.${targetId},status.eq.pending),and(requester_id.eq.${targetId},recipient_id.eq.${userId},status.eq.pending)`,
    );
  return res.json({ ok: true });
});
app.get('/api/me/avatar', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('avatar, use_weirdling_avatar')
    .eq('id', userId)
    .maybeSingle();
  let avatarUrl = null;
  const p = profile;
  if (p?.use_weirdling_avatar) {
    const { data: w } = await adminSupabase
      .from('weirdlings')
      .select('avatar_url')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    avatarUrl = w?.avatar_url ?? null;
  }
  if (!avatarUrl && p?.avatar) avatarUrl = p.avatar;
  return res.json({
    ok: true,
    data: { avatarUrl: avatarUrl ?? null },
    error: null,
    meta: {},
  });
});
app.get('/api/me', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const bearer = pickBearer(req);
  const { data: user } = await adminSupabase.auth.getUser(bearer ?? void 0);
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
      handle: profile?.handle ?? null,
      displayName: profile?.display_name ?? null,
      roles: isAdmin ? ['admin'] : ['user'],
      isAdmin,
    },
    error: null,
    meta: {},
  });
});
app.post('/api/content/submissions', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const body = req.body;
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
    ? body.tags.map(String).filter(Boolean)
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
});
app.post('/api/content/uploads/url', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!userId) return sendApiError(res, 401, 'Unauthorized');
  const body = req.body;
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
});
const uploadAdFile = upload.single('file');
app.post(
  '/api/admin/advertisers/upload',
  requireAdmin,
  (req, res, next) => {
    uploadAdFile(req, res, (err) => {
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
  async (req, res) => {
    try {
      const file = req.file;
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
      const extByMime = {
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
app.get('/api/public/playlists', async (_req, res) => {
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
  const data = (playlists ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    thumbnailUrl: p.thumbnail_url,
    updatedAt: p.updated_at,
  }));
  const itemCounts = await Promise.all(
    (playlists ?? []).map(async (p) => {
      const { count: c } = await adminSupabase
        .from('playlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', p.id);
      return c ?? 0;
    }),
  );
  const enriched = data.map((p, i) => ({
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
app.get('/api/public/playlists/:slug/items', async (req, res) => {
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
    .eq('playlist_id', playlist.id)
    .order('sort_order')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return sendApiError(res, 500, 'Server error');
  const { count } = await adminSupabase
    .from('playlist_items')
    .select('*', { count: 'exact', head: true })
    .eq('playlist_id', playlist.id);
  const subs = (items ?? []).map((i) =>
    Array.isArray(i.content_submissions)
      ? i.content_submissions[0]
      : i.content_submissions,
  );
  const subIds = [
    ...new Set(
      (subs ?? []).filter((s) => s != null).map((s) => s.submitted_by),
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
    (profiles ?? []).map((p) => [
      p.id,
      { handle: p.handle, displayName: p.display_name },
    ]),
  );
  const data = (items ?? []).map((i) => {
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
  });
  return res.json({
    ok: true,
    data,
    error: null,
    meta: { total: count ?? 0, limit, offset },
  });
});
const insertAuditLog = async (
  actorEmail,
  actorId,
  action,
  targetType,
  targetId,
  meta,
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
app.get('/api/admin/content/submissions', requireAdmin, async (req, res) => {
  const status =
    typeof req.query.status === 'string'
      ? req.query.status.trim() || null
      : null;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() || null : null;
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
  const subIds = [...new Set((rows ?? []).map((r) => r.submitted_by))];
  const { data: profiles } =
    subIds.length > 0
      ? await adminSupabase
          .from('profiles')
          .select('id, handle, display_name')
          .in('id', subIds)
      : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      { handle: p.handle, displayName: p.display_name },
    ]),
  );
  const data = (rows ?? []).map((r) => {
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
  });
  return res.json({
    ok: true,
    data,
    error: null,
    meta: { total: count ?? 0, limit, offset },
  });
});
app.post('/api/admin/content/:id/approve', requireAdmin, async (req, res) => {
  const id =
    (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? '';
  const userId = req.adminUserId;
  const email = req.adminEmail;
  const notes =
    typeof req.body.notes === 'string' ? req.body.notes.trim() || null : null;
  const { data: row, error } = await adminSupabase
    .from('content_submissions')
    .update({
      status: 'approved',
      moderation_notes: notes,
      moderated_at: /* @__PURE__ */ new Date().toISOString(),
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
});
app.post('/api/admin/content/:id/reject', requireAdmin, async (req, res) => {
  const id =
    (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? '';
  const userId = req.adminUserId;
  const email = req.adminEmail;
  const reason =
    typeof req.body.reason === 'string' ? req.body.reason.trim() || null : null;
  const { data: row, error } = await adminSupabase
    .from('content_submissions')
    .update({
      status: 'rejected',
      moderation_notes: reason,
      moderated_at: /* @__PURE__ */ new Date().toISOString(),
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
});
app.post(
  '/api/admin/content/:id/request-changes',
  requireAdmin,
  async (req, res) => {
    const id =
      (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? '';
    const userId = req.adminUserId;
    const email = req.adminEmail;
    const notes =
      typeof req.body.notes === 'string' ? req.body.notes.trim() || null : null;
    const { data: row, error } = await adminSupabase
      .from('content_submissions')
      .update({
        status: 'changes_requested',
        moderation_notes: notes,
        moderated_at: /* @__PURE__ */ new Date().toISOString(),
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
app.post('/api/admin/content/:id/publish', requireAdmin, async (req, res) => {
  const id =
    (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? '';
  const userId = req.adminUserId;
  const email = req.adminEmail;
  const playlistId =
    typeof req.body.playlistId === 'string'
      ? req.body.playlistId.trim() || null
      : null;
  const publishAt =
    typeof req.body.publishAt === 'string'
      ? req.body.publishAt.trim() || null
      : null;
  if (!playlistId) return sendApiError(res, 400, 'Missing playlistId');
  const { data: subRow } = await adminSupabase
    .from('content_submissions')
    .select('id, status')
    .eq('id', id)
    .single();
  if (!subRow || subRow.status !== 'approved')
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
  const sortOrder = (maxOrder?.sort_order ?? -1) + 1;
  const { error: insertErr } = await adminSupabase
    .from('playlist_items')
    .insert({
      playlist_id: playlistId,
      submission_id: id,
      sort_order: sortOrder,
      published_at: publishAt || /* @__PURE__ */ new Date().toISOString(),
    });
  if (insertErr) {
    if (insertErr.code === '23505')
      return sendApiError(res, 409, 'Already in playlist');
    return sendApiError(res, 500, 'Server error');
  }
  await adminSupabase
    .from('content_submissions')
    .update({
      status: 'published',
      updated_at: /* @__PURE__ */ new Date().toISOString(),
    })
    .eq('id', id);
  await insertAuditLog(
    email,
    userId,
    'CONTENT_PUBLISHED',
    'content_submission',
    id,
    {
      playlistId,
      publishAt: publishAt || /* @__PURE__ */ new Date().toISOString(),
    },
  );
  return res.json({ ok: true, data: { id } });
});
app.get('/api/admin/playlists', requireAdmin, async (_req, res) => {
  const { data, error } = await adminSupabase
    .from('playlists')
    .select('id, slug, title, is_public')
    .order('title');
  if (error) return sendApiError(res, 500, 'Server error');
  return res.json({ ok: true, data: data ?? [], error: null, meta: {} });
});
app.post('/api/admin/playlists', requireAdmin, async (req, res) => {
  const body = req.body;
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
});
app.get('/api/admin/auth-callback-logs', requireAdmin, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const {
    data: rows,
    error,
    count,
  } = await adminSupabase
    .from('audit_log')
    .select('id, action, actor_email, meta, created_at', { count: 'exact' })
    .eq('target_type', 'auth_callback')
    .in('action', ['AUTH_CALLBACK_ERROR', 'AUTH_CALLBACK_TIMEOUT_ALERT'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return sendApiError(res, 500, 'Server error');
  const data = (rows ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    actorEmail: row.actor_email,
    meta: row.meta && typeof row.meta === 'object' ? row.meta : {},
    createdAt: row.created_at,
  }));
  return res.json({
    ok: true,
    data,
    error: null,
    meta: { total: count ?? data.length },
  });
});
app.get('/api/admin/audit', requireAdmin, async (req, res) => {
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
  const data = (rows ?? []).map((r) => ({
    id: r.id,
    actorEmail: r.actor_email,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    meta: r.meta,
    createdAt: r.created_at,
  }));
  return res.json({
    ok: true,
    data,
    error: null,
    meta: { total: count ?? 0, limit, offset },
  });
});
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
registerAdvertiseRequestRoute(app, adminSupabase);
export { app };
