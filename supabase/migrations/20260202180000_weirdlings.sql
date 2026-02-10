-- Weirdling generator: persisted persona + generation jobs (MVP-aligned)
-- See docs/architecture/epic-weirdling-generator.md

-- -----------------------------
-- generation_jobs (audit + resume)
-- -----------------------------
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'complete', 'failed')),
  idempotency_key text unique,
  raw_response jsonb,
  error_message text,
  prompt_version text not null default 'v1',
  model_version text not null default 'mock',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_generation_jobs_user_id on public.generation_jobs(user_id);
create index idx_generation_jobs_status on public.generation_jobs(status);
create index idx_generation_jobs_idempotency on public.generation_jobs(idempotency_key) where idempotency_key is not null;

-- -----------------------------
-- weirdlings (one active per user; history via jobs)
-- -----------------------------
create table if not exists public.weirdlings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  handle text not null,
  role_vibe text not null,
  industry_tags text[] not null default '{}',
  tone numeric not null default 0.5,
  tagline text not null,
  boundaries text not null default '',
  bio text,
  avatar_url text,
  raw_ai_response jsonb,
  prompt_version text not null default 'v1',
  model_version text not null default 'mock',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

comment on table public.weirdlings is 'One Weirdling persona per user (replace on save); MVP-aligned.';
comment on table public.generation_jobs is 'Generation audit trail and idempotency for Weirdling creation.';

-- RLS: users can only read/write their own
alter table public.generation_jobs enable row level security;
alter table public.weirdlings enable row level security;

create policy "Users can manage own generation_jobs"
  on public.generation_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own weirdlings"
  on public.weirdlings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at trigger for generation_jobs
create or replace function public.set_generation_jobs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_generation_jobs_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_generation_jobs_updated_at();

create trigger trg_weirdlings_updated_at
  before update on public.weirdlings
  for each row execute function public.set_updated_at();
