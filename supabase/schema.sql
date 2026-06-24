create table if not exists public.editor_state (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.editor_state enable row level security;

-- Browser clients never talk to Supabase directly in this deployment.
-- Cloudflare Pages Functions use SUPABASE_SERVICE_ROLE_KEY and bypass RLS.
drop policy if exists "editor_state_no_public_access" on public.editor_state;
create policy "editor_state_no_public_access"
on public.editor_state
for all
to anon, authenticated
using (false)
with check (false);

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.editor_state to service_role;

create table if not exists public.match_records (
  record_user_id text not null,
  match_id text not null,
  record jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (record_user_id, match_id)
);

alter table public.match_records enable row level security;

-- Browser clients never talk to Supabase directly in this deployment.
-- Cloudflare Pages Functions use SUPABASE_SERVICE_ROLE_KEY and bypass RLS.
drop policy if exists "match_records_no_public_access" on public.match_records;
create policy "match_records_no_public_access"
on public.match_records
for all
to anon, authenticated
using (false)
with check (false);

grant select, insert, update, delete on table public.match_records to service_role;

create table if not exists public.world_cup_match_events (
  match_id text primary key,
  match_no integer not null,
  utc_date timestamptz,
  goals jsonb,
  red_cards jsonb,
  penalty_shootout jsonb,
  updated_at timestamptz not null default now()
);

alter table public.world_cup_match_events enable row level security;

drop policy if exists "world_cup_match_events_no_public_access" on public.world_cup_match_events;
create policy "world_cup_match_events_no_public_access"
on public.world_cup_match_events
for all
to anon, authenticated
using (false)
with check (false);

grant select, insert, update, delete on table public.world_cup_match_events to service_role;
