import crypto from 'crypto';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type { SupabaseClient } from '@supabase/supabase-js';

const ADVERTISER_RECIPIENT = 'info@wrdlnkdn.com';
const ADVERTISER_RATE_WINDOW_MS = 5 * 60 * 1000;
const ADVERTISER_RATE_MAX = 3;
const advertiserRateMap = new Map<string, number[]>();
const ADVERTISER_ICON_MAX_BYTES = 5 * 1024 * 1024;
const ADVERTISER_ICON_MIMES = ['image/png', 'image/svg+xml'] as const;

const uploadAdvertiser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ADVERTISER_ICON_MAX_BYTES },
});

const uploadAdvertiserForm = uploadAdvertiser.fields([
  { name: 'icon', maxCount: 1 },
]) as express.RequestHandler;

function trim(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s.trim().slice(0, max);
}

function cleanAdvertiserRequest(body: unknown): {
  name: string;
  email: string;
  destinationUrl: string;
  message: string;
  adCopyDescription: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const name = trim(o.name, 200);
  const email = trim(o.email, 254);
  const destinationUrl = trim(o.destinationUrl, 2000);
  const message = trim(o.message, 5000);
  const adCopyDescription = trim(o.adCopyDescription, 2000);
  if (name.length < 2) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  try {
    const parsedUrl = new URL(destinationUrl);
    if (parsedUrl.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  if (message.length < 10) return null;
  if (adCopyDescription.length < 10) return null;
  return { name, email, destinationUrl, message, adCopyDescription };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const registerAdvertiseRequestRoute = (
  app: express.Express,
  adminSupabase: SupabaseClient,
) => {
  app.post(
    '/api/advertise/request',
    (req: Request, res: Response, next: NextFunction) => {
      uploadAdvertiserForm(req, res, (err: unknown) => {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          err.code === 'LIMIT_FILE_SIZE'
        ) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Icon/logo file must be 5MB or less.',
          });
        }
        if (err) return next(err);
        next();
      });
    },
    async (req: Request, res: Response) => {
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
      const now = Date.now();
      const times = advertiserRateMap.get(ip) ?? [];
      const recent = times.filter((t) => now - t < ADVERTISER_RATE_WINDOW_MS);
      if (recent.length >= ADVERTISER_RATE_MAX) {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Please try again in a few minutes.',
        });
        return;
      }
      recent.push(now);
      advertiserRateMap.set(ip, recent);

      const parsed = cleanAdvertiserRequest(req.body);
      if (!parsed) {
        return res.status(400).json({
          error: 'Invalid request',
          message:
            'Name, email, destination URL, message (min 10 chars), and Ad Copy Description (min 10 chars) are required.',
        });
      }

      const files = (
        req as Request & { files?: { icon?: Express.Multer.File[] } }
      ).files;
      const iconFile = files?.icon?.[0];
      if (!iconFile || !iconFile.buffer) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Icon/logo file is required.',
        });
      }
      if (
        !ADVERTISER_ICON_MIMES.includes(
          iconFile.mimetype as (typeof ADVERTISER_ICON_MIMES)[number],
        )
      ) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Icon must be PNG or SVG.',
        });
      }
      if (iconFile.size > ADVERTISER_ICON_MAX_BYTES) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Icon must be 5MB or less.',
        });
      }

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        console.warn(
          '[advertise/request] RESEND_API_KEY not set; cannot send email',
        );
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Email service is not configured. Please try again later.',
        });
      }

      const ext = iconFile.mimetype === 'image/svg+xml' ? '.svg' : '.png';
      const storagePath = `inquiry/${crypto.randomUUID()}${ext}`;
      const { error: uploadErr } = await adminSupabase.storage
        .from('advertiser-inquiry-assets')
        .upload(storagePath, iconFile.buffer, {
          contentType: iconFile.mimetype,
          upsert: false,
        });
      if (uploadErr) {
        console.error('[advertise/request] Storage upload error:', uploadErr);
        return res.status(500).json({
          error: 'Upload failed',
          message: 'Please try again later.',
        });
      }

      const { data: signed } = await adminSupabase.storage
        .from('advertiser-inquiry-assets')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      const fileLink = signed?.signedUrl ?? '[file stored, link unavailable]';

      const subject = `Advertiser Request: ${parsed.name}`;
      const textBody = `Name: ${parsed.name}\nEmail: ${parsed.email}\nDestination URL: ${parsed.destinationUrl}\n\nMessage:\n${parsed.message}\n\nAd Copy Description:\n${parsed.adCopyDescription}\n\nIcon/Logo: ${fileLink}`;
      const htmlBody = `<p><strong>Name:</strong> ${escapeHtml(parsed.name)}</p><p><strong>Email:</strong> <a href="mailto:${escapeHtml(parsed.email)}">${escapeHtml(parsed.email)}</a></p><p><strong>Destination URL:</strong> <a href="${escapeHtml(parsed.destinationUrl)}">${escapeHtml(parsed.destinationUrl)}</a></p><p><strong>Message:</strong></p><pre>${escapeHtml(parsed.message)}</pre><p><strong>Ad Copy Description:</strong></p><pre>${escapeHtml(parsed.adCopyDescription)}</pre><p><strong>Icon/Logo:</strong> <a href="${escapeHtml(fileLink)}">View file (7-day link)</a></p>`;

      const emailPayload: Record<string, unknown> = {
        from: 'WRDLNKDN Advertise <info@wrdlnkdn.com>',
        to: [ADVERTISER_RECIPIENT],
        reply_to: parsed.email,
        subject,
        text: textBody,
        html: htmlBody,
      };

      const iconExt = ext === '.svg' ? 'svg' : 'png';
      emailPayload.attachments = [
        {
          filename: `advertiser-icon.${iconExt}`,
          content: iconFile.buffer.toString('base64'),
        },
      ];

      try {
        const apiRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          console.error(
            '[advertise/request] Resend API error:',
            apiRes.status,
            errText,
          );
          res.status(502).json({
            error: 'Email delivery failed',
            message: 'Please try again later or contact us directly.',
          });
          return;
        }

        res
          .status(200)
          .json({ ok: true, message: 'Request sent successfully.' });
      } catch (e) {
        console.error('[advertise/request] Unhandled error:', e);
        res.status(500).json({
          error: 'Server error',
          message: 'Please try again later.',
        });
      }
    },
  );
};
