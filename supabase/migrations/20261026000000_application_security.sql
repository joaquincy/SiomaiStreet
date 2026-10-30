-- Siomai Street: application security, rate limiting, and idempotency.
-- Run after 20261025000000_schema.sql.

begin;

-- Idempotency: SHA-256 hash prevents duplicate submissions.
alter table public.franchise_applications
  add column if not exists request_hash text
    check (request_hash is null or request_hash ~ '^[0-9a-f]{64}$');

comment on column public.franchise_applications.request_hash is
  'SHA-256 of canonical request + documents. Same ID and hash replays the receipt; changed payload conflicts.';

-- Private quarantine bucket for virus scanning before final storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'franchise-quarantine',
  'franchise-quarantine',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Keep documents bucket private.
update storage.buckets set public = false where id = 'franchise-documents';

-- Block anon/authenticated from accessing franchise storage directly.
drop policy if exists franchise_private_files on storage.objects;
create policy franchise_private_files on storage.objects
  as restrictive for all to anon, authenticated
  using  (bucket_id not in ('franchise-documents', 'franchise-quarantine'))
  with check (bucket_id not in ('franchise-documents', 'franchise-quarantine'));

-- Block anon/authenticated from reading franchise applications directly.
drop policy if exists franchise_server_only on public.franchise_applications;
create policy franchise_server_only on public.franchise_applications
  as restrictive for all to anon, authenticated
  using (false) with check (false);
revoke all on public.franchise_applications from anon, authenticated;

-- Rate limiting table (server-side only, no public access).
create table if not exists public.application_rate_windows (
  key_hash   text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  requests   integer not null,
  expires_at timestamptz not null
);

create index if not exists application_rate_expiry
  on public.application_rate_windows (expires_at);

alter table public.application_rate_windows enable row level security;
revoke all on public.application_rate_windows from public, anon, authenticated;

-- Rate limiter: returns true if the caller is under the hourly limit.
create or replace function public.consume_application_rate(key_hash text, max_requests integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_count integer;
begin
  if key_hash is null or max_requests is null
     or key_hash !~ '^[0-9a-f]{64}$'
     or max_requests not between 1 and 100
  then return false; end if;

  perform pg_advisory_xact_lock(810291);
  delete from public.application_rate_windows where expires_at <= now();

  if not exists (select 1 from public.application_rate_windows w
                 where w.key_hash = consume_application_rate.key_hash)
     and (select count(*) from public.application_rate_windows) >= 10000
  then return false; end if;

  insert into public.application_rate_windows as w (key_hash, requests, expires_at)
    values (consume_application_rate.key_hash, 1, now() + interval '1 hour')
    on conflict on constraint application_rate_windows_pkey
    do update set requests = least(w.requests + 1, 101)
    returning requests into current_count;

  return current_count <= max_requests;
end;
$$;

revoke all on function public.consume_application_rate(text, integer) from public, anon, authenticated;
grant execute on function public.consume_application_rate(text, integer) to service_role;

-- Security preflight: confirms private buckets and RLS are active before accepting submissions.
create or replace function public.franchise_security_ready()
returns boolean language sql security definer set search_path = '' as $$
  select
    (select count(*) = 2 from storage.buckets
     where id in ('franchise-documents', 'franchise-quarantine') and public = false)
    and exists (
      select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'storage' and c.relname = 'objects' and c.relrowsecurity)
    and exists (
      select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'franchise_applications' and c.relrowsecurity)
    and exists (
      select 1 from pg_catalog.pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'franchise_private_files' and permissive = 'RESTRICTIVE'
        and roles @> array['anon','authenticated']::name[])
    and exists (
      select 1 from pg_catalog.pg_policies
      where schemaname = 'public' and tablename = 'franchise_applications'
        and policyname = 'franchise_server_only' and permissive = 'RESTRICTIVE');
$$;

revoke all on function public.franchise_security_ready() from public, anon, authenticated;
grant execute on function public.franchise_security_ready() to service_role;

comment on table public.franchise_applications is
  'Private franchise applications. Access through authorized server APIs only.';

notify pgrst, 'reload schema';

commit;

