alter table public.chat_rooms
  add column if not exists description text,
  add column if not exists image_url text;

alter table public.chat_rooms
  drop constraint if exists chat_rooms_group_description_length;

alter table public.chat_rooms
  add constraint chat_rooms_group_description_length
  check (description is null or char_length(description) <= 256);

comment on column public.chat_rooms.description is
  'Optional group description shown in group create/list/header surfaces.';

comment on column public.chat_rooms.image_url is
  'Optional public image URL used as the group picture/avatar.';

alter table public.portfolio_items
  drop constraint if exists portfolio_items_project_source_required;

alter table public.portfolio_items
  add constraint portfolio_items_project_source_required
  check (nullif(btrim(coalesce(project_url, '')), '') is not null)
  not valid;

comment on constraint portfolio_items_project_source_required on public.portfolio_items is
  'Each portfolio item must retain exactly one primary source URL. Uploaded files are stored as public project_url values in project-sources.';
