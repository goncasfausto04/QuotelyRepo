-- Quotely: Row Level Security + housekeeping
-- ------------------------------------------------------------------
-- WHY: the frontend talks to Supabase directly with the public anon key
-- (it is in every browser and in this repo's git history). Without RLS,
-- anyone can read/modify every user's briefings, quotes and inbox statuses
-- through the Supabase REST API.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> paste -> Run.
-- It is idempotent (safe to run more than once).
--
-- BEFORE RUNNING, check existing policies:
--   select tablename, policyname, cmd, roles, qual from pg_policies
--   where schemaname = 'public';
-- Policies are OR'ed together, so an old "allow all" policy would keep
-- the table open. Drop any such policy.
--
-- The backend uses the service key, which bypasses RLS, so supplier
-- links / supplier quote submission keep working.
-- ------------------------------------------------------------------

-- ========== briefings ==========
alter table public.briefings enable row level security;
alter table public.briefings alter column user_auth_id set default auth.uid();

drop policy if exists "briefings_owner_select" on public.briefings;
drop policy if exists "briefings_owner_insert" on public.briefings;
drop policy if exists "briefings_owner_update" on public.briefings;
drop policy if exists "briefings_owner_delete" on public.briefings;

create policy "briefings_owner_select" on public.briefings
  for select to authenticated using (user_auth_id = auth.uid());
create policy "briefings_owner_insert" on public.briefings
  for insert to authenticated with check (user_auth_id = auth.uid());
create policy "briefings_owner_update" on public.briefings
  for update to authenticated using (user_auth_id = auth.uid()) with check (user_auth_id = auth.uid());
create policy "briefings_owner_delete" on public.briefings
  for delete to authenticated using (user_auth_id = auth.uid());

-- ========== quotes (owned through their briefing) ==========
alter table public.quotes enable row level security;

drop policy if exists "quotes_owner_all" on public.quotes;
create policy "quotes_owner_all" on public.quotes
  for all to authenticated
  using (exists (select 1 from public.briefings b where b.id = quotes.briefing_id and b.user_auth_id = auth.uid()))
  with check (exists (select 1 from public.briefings b where b.id = quotes.briefing_id and b.user_auth_id = auth.uid()));

-- ========== email_statuses (owned through their briefing) ==========
alter table public.email_statuses enable row level security;

drop policy if exists "email_statuses_owner_all" on public.email_statuses;
create policy "email_statuses_owner_all" on public.email_statuses
  for all to authenticated
  using (exists (select 1 from public.briefings b where b.id = email_statuses.briefing_id and b.user_auth_id = auth.uid()))
  with check (exists (select 1 from public.briefings b where b.id = email_statuses.briefing_id and b.user_auth_id = auth.uid()));

-- The inbox now marks deleted emails with status = 'deleted'. If you have a
-- CHECK constraint on email_statuses.status, allow that value, e.g.:
--   alter table public.email_statuses drop constraint <name>;
--   alter table public.email_statuses add constraint email_statuses_status_check
--     check (status in ('pending','approved','rejected','deleted'));
-- Upserts use onConflict (briefing_id, message_id), which requires:
create unique index if not exists email_statuses_briefing_message_uidx
  on public.email_statuses (briefing_id, message_id);

-- ========== users (profile rows) ==========
alter table public.users enable row level security;

drop policy if exists "users_self_select" on public.users;
drop policy if exists "users_self_insert" on public.users;
drop policy if exists "users_self_update" on public.users;

create policy "users_self_select" on public.users
  for select to authenticated using (auth_id = auth.uid());
create policy "users_self_insert" on public.users
  for insert to authenticated with check (auth_id = auth.uid());
create policy "users_self_update" on public.users
  for update to authenticated using (auth_id = auth.uid()) with check (auth_id = auth.uid());

-- Create the profile row automatically on signup (works even with email
-- confirmation on, where the browser has no session yet).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (auth_id, email, name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== Indexes for the queries the app actually runs ==========
create index if not exists quotes_briefing_id_idx on public.quotes (briefing_id);
create index if not exists briefings_user_auth_id_idx on public.briefings (user_auth_id, created_at desc);
create unique index if not exists briefings_supplier_link_token_uidx
  on public.briefings (supplier_link_token) where supplier_link_token is not null;

-- ========== Storage ==========
-- profile-photos: users may only write inside their own "<user id>/" folder.
drop policy if exists "profile_photos_own_folder_write" on storage.objects;
drop policy if exists "profile_photos_own_folder_update" on storage.objects;
drop policy if exists "profile_photos_own_folder_delete" on storage.objects;

create policy "profile_photos_own_folder_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_photos_own_folder_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_photos_own_folder_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- quote-pdfs is only written by the backend (service key). Note it is a
-- PUBLIC bucket: anyone with a PDF's URL can open it.
