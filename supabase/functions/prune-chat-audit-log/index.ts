/**
 * Edge Function: prune-chat-audit-log
 * Prunes chat_audit_log older than 90 days (per MVP spec retention).
 *
 * Invoke via: Supabase cron (e.g. daily), or manual trigger.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: count, error } = await supabase.rpc('chat_prune_audit_log');

    if (error) {
      console.error('Prune failed:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `chat_audit_log pruned: ${count ?? 0} rows removed (90-day retention)`,
    );
    return new Response(JSON.stringify({ ok: true, deleted: count ?? 0 }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
