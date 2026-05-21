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
