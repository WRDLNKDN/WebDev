/**
 * Edge Function: generate-portfolio-thumbnail
 * Picks up portfolio_items with thumbnail_status = 'pending' and no manual image_url,
 * generates a thumbnail, uploads to portfolio-thumbnails bucket, updates the row.
 *
 * Invoke: HTTP POST (cron or database webhook on portfolio_items INSERT/UPDATE).
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto). Optional: THUMBNAIL_SERVICE_URL for PDF/Office/Google.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BUCKET = 'portfolio-thumbnails';
const MAX_ITEMS_PER_RUN = 5;
const FETCH_TIMEOUT_MS = 15_000;

type ResolvedType =
  | 'image'
  | 'pdf'
  | 'document'
  | 'presentation'
  | 'spreadsheet'
  | 'text'
  | 'google_doc'
  | 'google_sheet'
  | 'google_slides'
  | 'unsupported';

interface PortfolioRow {
  id: string;
  owner_id: string;
  project_url: string | null;
  resolved_type: string | null;
  thumbnail_status: string | null;
  image_url: string | null;
}

function getExtensionFromContentType(ct: string | null): string {
  if (!ct) return 'png';
  const m = ct.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('gif')) return 'gif';
  if (m.includes('webp')) return 'webp';
  return 'png';
}

async function fetchImageBlob(
  url: string,
): Promise<{ blob: Blob; ext: string }> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: controller.signal,
    headers: { Accept: 'image/*' },
  });
  clearTimeout(to);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const blob = await res.blob();
  const ct = res.headers.get('content-type');
  const ext = getExtensionFromContentType(ct);
  return { blob, ext };
}

async function callThumbnailService(
  serviceUrl: string,
  targetUrl: string,
): Promise<Blob> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 25_000);
  const res = await fetch(serviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: targetUrl }),
    signal: controller.signal,
  });
  clearTimeout(to);
  if (!res.ok) throw new Error(`Thumbnail service: ${res.status}`);
  return res.blob();
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: rows, error: selectError } = await supabase
      .from('portfolio_items')
      .select(
        'id, owner_id, project_url, resolved_type, thumbnail_status, image_url',
      )
      .eq('thumbnail_status', 'pending')
      .is('image_url', null)
      .not('project_url', 'is', null)
      .limit(MAX_ITEMS_PER_RUN);

    if (selectError) {
      console.error('[portfolio-thumbnail] select failed', {
        error: selectError.message,
      });
      return new Response(
        JSON.stringify({ ok: false, error: selectError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const items = (rows ?? []) as PortfolioRow[];
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const thumbnailServiceUrl = Deno.env.get('THUMBNAIL_SERVICE_URL') ?? '';
    const results: {
      id: string;
      status: 'generated' | 'failed';
      error?: string;
    }[] = [];

    for (const row of items) {
      const url = (row.project_url ?? '').trim();
      const resolvedType = (row.resolved_type ?? 'unsupported') as ResolvedType;

      try {
        let blob: Blob;
        let ext: string;

        if (resolvedType === 'image') {
          const out = await fetchImageBlob(url);
          blob = out.blob;
          ext = out.ext;
        } else if (thumbnailServiceUrl && resolvedType !== 'unsupported') {
          blob = await callThumbnailService(thumbnailServiceUrl, url);
          ext = getExtensionFromContentType(blob.type || null);
        } else {
          throw new Error('No thumbnail service for non-image type');
        }

        const path = `${row.owner_id}/${row.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, {
            contentType: blob.type || `image/${ext}`,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);
        const publicUrl = urlData?.publicUrl ?? '';

        const { error: updateError } = await supabase
          .from('portfolio_items')
          .update({ thumbnail_url: publicUrl, thumbnail_status: 'generated' })
          .eq('id', row.id);

        if (updateError) throw updateError;

        results.push({ id: row.id, status: 'generated' });
        console.log('[portfolio-thumbnail] generated', {
          id: row.id,
          type: resolvedType,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ id: row.id, status: 'failed', error: msg });
        console.warn('[portfolio-thumbnail] failed', {
          id: row.id,
          type: resolvedType,
          error: msg,
        });

        await supabase
          .from('portfolio_items')
          .update({ thumbnail_status: 'failed' })
          .eq('id', row.id);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed: results.length, results }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    console.error('[portfolio-thumbnail]', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
