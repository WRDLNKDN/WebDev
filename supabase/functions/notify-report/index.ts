/**
 * Edge Function: notify-report
 * Triggered by Database Webhook on chat_reports INSERT.
 * Sends email notification to moderators.
 *
 * Setup:
 * 1. Add Resend/SendGrid API key to secrets
 * 2. Configure webhook: Database > Webhooks > chat_reports INSERT
 * 3. Point to this function URL
 *
 * Env: RESEND_API_KEY (or SENDGRID_API_KEY), MODERATOR_EMAIL
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MODERATOR_EMAIL = Deno.env.get('MODERATOR_EMAIL') ?? '';

serve(async (req) => {
  try {
    const payload = (await req.json()) as {
      type?: string;
      table?: string;
      record?: { id: string; category: string; reporter_id: string };
    };

    if (payload.table !== 'chat_reports' || payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!MODERATOR_EMAIL) {
      console.log('MODERATOR_EMAIL not set; skipping notification');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const reportId = payload.record?.id ?? 'unknown';
    const category = payload.record?.category ?? 'unknown';
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Chat Reports <info@wrdlnkdn.com>',
          to: [MODERATOR_EMAIL],
          subject: `[WRDLNKDN] New chat report: ${category}`,
          html: `<p>A new chat report has been submitted.</p><p><strong>Report ID:</strong> ${reportId}</p><p><strong>Category:</strong> ${category}</p><p>Check the <a href="https://webdev-uat.vercel.app/admin/chat-reports">admin panel</a> to review.</p>`,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Resend failed:', err);
      }
    } else {
      console.log(
        `Report ${reportId} (${category}) - notify ${MODERATOR_EMAIL} (RESEND_API_KEY not set)`,
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
