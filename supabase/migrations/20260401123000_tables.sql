create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in (
    'upload',
    'link',
    'gif_provider',
    'generated'
  )),
  media_type text not null check (media_type in (
    'image',
    'video',
    'doc',
    'gif',
    'link'
  )),
  processing_state text not null default 'pending' check (processing_state in (
    'pending',
    'uploading',
    'processing',
    'ready',
    'failed',
    'deleted'
  )),
  source_ref jsonb not null default '{}'::jsonb,
  original_ref jsonb,
  display_ref jsonb,
  thumbnail_ref jsonb,
  rendering_references jsonb not null default '{}'::jsonb,
  fallback_metadata jsonb not null default '{}'::jsonb,
  failure_metadata jsonb,
  metadata jsonb not null default '{}'::jsonb,
  telemetry jsonb not null default '{}'::jsonb,
  last_failure_code text,
  last_failure_reason text,
  retry_count integer not null default 0 check (retry_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_media_assets_owner_created_at
  on public.media_assets (owner_id, created_at desc);
create index if not exists idx_media_assets_processing_state
  on public.media_assets (processing_state, updated_at desc);
create index if not exists idx_media_assets_live_processing_state
  on public.media_assets (processing_state, updated_at desc)
  where deleted_at is null;
create index if not exists idx_media_assets_source_media_type
  on public.media_assets (source_type, media_type);
create index if not exists idx_media_assets_failure_code
  on public.media_assets (last_failure_code)
  where last_failure_code is not null;

drop trigger if exists trg_media_assets_updated_at on public.media_assets;
create trigger trg_media_assets_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

comment on table public.media_assets is
  'Canonical platform media registry for uploads, links, GIFs, derivatives, processing state, fallback metadata, and rendering references.';
comment on column public.media_assets.source_ref is
  'Normalized source pointer: provider, external URL, storage bucket/path, and upload origin details.';
comment on column public.media_assets.original_ref is
  'Original derivative reference for the source asset.';
comment on column public.media_assets.display_ref is
  'Display derivative reference used for inline rendering.';
comment on column public.media_assets.thumbnail_ref is
  'Thumbnail or poster derivative reference.';
comment on column public.media_assets.rendering_references is
  'Resolved URLs surfaces can render directly without rebuilding derivative precedence client-side.';
comment on column public.media_assets.fallback_metadata is
  'Fallback strategy, labels, and safe preview metadata when derivatives are unavailable.';
comment on column public.media_assets.failure_metadata is
  'Most recent processing failure metadata, including stage, retryability, and timestamps.';
comment on column public.media_assets.telemetry is
  'Pipeline telemetry summary for the latest media lifecycle transition.';

create table if not exists public.media_asset_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  pipeline text,
  processing_state text check (processing_state is null or processing_state in (
    'pending',
    'uploading',
    'processing',
    'ready',
    'failed',
    'deleted'
  )),
  failure_code text,
  failure_reason text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_asset_events_asset_created_at
  on public.media_asset_events (asset_id, created_at desc);
create index if not exists idx_media_asset_events_event_name_created_at
  on public.media_asset_events (event_name, created_at desc);
create index if not exists idx_media_asset_events_failure_code
  on public.media_asset_events (failure_code)
  where failure_code is not null;

comment on table public.media_asset_events is
  'Telemetry/event log for platform media lifecycle transitions, processing updates, and failure reasons.';

alter table if exists public.media_assets
  add column if not exists delivery_metadata jsonb not null default '{}'::jsonb,
  add column if not exists lifecycle_metadata jsonb not null default '{}'::jsonb,
  add column if not exists moderation_status text not null default 'unreviewed' check (moderation_status in (
    'unreviewed',
    'pending_review',
    'approved',
    'reported',
    'quarantined'
  )),
  add column if not exists moderation_metadata jsonb not null default '{}'::jsonb,
  add column if not exists abuse_report_ref jsonb;

comment on column public.media_assets.delivery_metadata is
  'Canonical asset delivery policy: storage prefix, cache profile, visibility, signed URL TTL, and cache-busting token for originals and derivatives.';
comment on column public.media_assets.lifecycle_metadata is
  'Lifecycle policy for cleanup and background work, including orphan retention, failed retention, delete cleanup windows, and reprocess state.';
comment on column public.media_assets.moderation_status is
  'Canonical moderation state for the asset. Quarantined assets are not rendered to product surfaces.';
comment on column public.media_assets.moderation_metadata is
  'Moderation and provider-safety details, including safe-to-render flag, provider hook status, quarantine timestamps, and hidden review metadata.';
comment on column public.media_assets.abuse_report_ref is
  'Optional reference to an external or internal abuse report associated with the asset.';

create index if not exists idx_media_assets_delivery_version
  on public.media_assets (((delivery_metadata->>'storageVersion')))
  where deleted_at is null;

create index if not exists idx_media_assets_lifecycle_state
  on public.media_assets (((lifecycle_metadata->>'cleanupState')), ((lifecycle_metadata->>'reprocessState')))
  where deleted_at is null;

create index if not exists idx_media_assets_moderation_status
  on public.media_assets (moderation_status, updated_at desc)
  where deleted_at is null;

create index if not exists idx_media_assets_abuse_report_id
  on public.media_assets (((abuse_report_ref->>'reportId')))
  where abuse_report_ref is not null and deleted_at is null;
