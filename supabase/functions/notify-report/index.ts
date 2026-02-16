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

    // Resend example (uncomment when RESEND_API_KEY is set):
    // const res = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'info@wrdlnkdn.com',
    //     to: MODERATOR_EMAIL,
    //     subject: `[WRDLNKDN] New chat report: ${category}`,
    //     text: `Report ID: ${reportId}. Check admin panel.`,
    //   }),
    // });

    console.log(`Report ${reportId} (${category}) - notify ${MODERATOR_EMAIL}`);

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
