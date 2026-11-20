-- Runtime settings toggled from the /admin page (e.g. email test mode).
-- Run once in Supabase -> SQL Editor. Only the backend (service key) reads/writes it:
-- RLS is enabled with no policies, so the public anon key can't touch it.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value)
values ('email_mode', '"test"')
on conflict (key) do nothing;
