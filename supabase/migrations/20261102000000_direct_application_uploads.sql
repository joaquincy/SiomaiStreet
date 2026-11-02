-- Direct browser uploads stay private and untrusted until individually scanned.
-- Apply after all earlier migrations. Only the server may use these tables/RPCs.
begin;

create table public.franchise_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  correction_id uuid references public.franchise_corrections(id),
  retry_id uuid,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  application_data jsonb not null check (jsonb_typeof(application_data) = 'object'),
  state text not null default 'pending' check (state in ('pending','submitted')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  -- Signed upload tokens last 2h; an in-flight TUS resource may last another 24h.
  -- Leave a conservative grace period before deleting immutable object paths.
  cleanup_after timestamptz not null default now() + interval '50 hours',
  check ((correction_id is null) = (retry_id is null))
);
create index franchise_upload_sessions_lookup on public.franchise_upload_sessions(application_id, request_hash, expires_at);
create index franchise_upload_sessions_cleanup on public.franchise_upload_sessions(cleanup_after);

create table public.franchise_upload_items (
  session_id uuid not null references public.franchise_upload_sessions(id) on delete cascade,
  document_key text not null check (document_key in ('govIdFront','govIdBack','proofOfBilling','proofOfFunds','idPhoto','dtiSecCert','businessPermit','resumeCv','characterRef','siteProposal')),
  name text not null check (length(name) between 1 and 200),
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png')),
  size bigint not null check (size between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  state text not null default 'pending' check (state in ('pending','ready','rejected')),
  verified_document jsonb,
  lease_id uuid,
  lease_until timestamptz,
  attempts integer not null default 0 check (attempts between 0 and 8),
  primary key(session_id, document_key),
  check (document_key <> 'idPhoto' or content_type <> 'application/pdf')
);

alter table public.franchise_upload_sessions enable row level security;
alter table public.franchise_upload_items enable row level security;
revoke all on public.franchise_upload_sessions, public.franchise_upload_items from public, anon, authenticated;
grant all on public.franchise_upload_sessions, public.franchise_upload_items to service_role;

create function public.prepare_franchise_upload(p_application_id uuid, p_request_hash text, p_data jsonb, p_manifest jsonb, p_correction uuid default null, p_retry uuid default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.franchise_upload_sessions; item jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_application_id::text, 0));
  select * into s from public.franchise_upload_sessions
    where application_id = p_application_id and request_hash = p_request_hash and expires_at > now()
    order by created_at desc limit 1;
  if found then return to_jsonb(s); end if;
  if jsonb_typeof(p_manifest) <> 'array' or jsonb_array_length(p_manifest) not between 1 and 10 then
    raise exception 'Invalid upload manifest';
  end if;
  insert into public.franchise_upload_sessions(application_id, request_hash, application_data, correction_id, retry_id)
    values(p_application_id, p_request_hash, p_data, p_correction, p_retry) returning * into s;
  for item in select value from jsonb_array_elements(p_manifest) loop
    insert into public.franchise_upload_items(session_id, document_key, name, content_type, size, sha256)
      values(s.id, item->>'key', item->>'name', item->>'type', (item->>'size')::bigint, item->>'sha256');
  end loop;
  return to_jsonb(s);
end $$;

create function public.claim_franchise_upload(p_session uuid, p_key text, p_lease uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare item public.franchise_upload_items;
begin
  update public.franchise_upload_items i set lease_id = p_lease, lease_until = now() + interval '5 minutes', attempts = attempts + 1
    where i.session_id = p_session and document_key = p_key and state = 'pending' and attempts < 8
      and (lease_until is null or lease_until < now())
      and exists(select 1 from public.franchise_upload_sessions s where s.id = p_session and s.expires_at > now() and s.state = 'pending')
    returning i.* into item;
  return case when found then to_jsonb(item) else null end;
end $$;

create function public.finish_franchise_upload(p_session uuid, p_key text, p_lease uuid, p_document jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_document->>'path' is distinct from ('direct/' || p_session::text || '/' || p_key)
    or coalesce(p_document->'scan'->>'status','') not in ('clean','skipped') then
    raise exception 'Invalid checked document';
  end if;
  update public.franchise_upload_items set state = 'ready', verified_document = p_document, lease_id = null, lease_until = null
    where session_id = p_session and document_key = p_key and lease_id = p_lease and lease_until > now()
      and exists(select 1 from public.franchise_upload_sessions s where s.id = p_session and s.expires_at > now() and s.state = 'pending');
  return found;
end $$;

create function public.finalize_franchise_upload(p_session uuid, p_allow_unscanned boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.franchise_upload_sessions; a public.franchise_applications; c public.franchise_corrections; docs jsonb; d jsonb;
begin
  select * into s from public.franchise_upload_sessions where id = p_session for update;
  if not found then raise exception 'Upload session not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(s.application_id::text, 0));
  select * into a from public.franchise_applications where id = s.application_id for update;
  if s.correction_id is not null then
    select * into c from public.franchise_corrections where id = s.correction_id and application_id = s.application_id for update;
    if a.id is null or c.id is null or a.portal_access_revoked or a.submitted_at + interval '90 days' <= now() then raise exception 'Correction access unavailable'; end if;
    if c.status = 'received' and c.request_id = s.retry_id and c.request_hash = s.request_hash then
      return jsonb_build_object('id',c.id,'requestId',s.retry_id,'status','received');
    end if;
    if c.status <> 'open' or a.status <> 'more_information_requested' then raise exception 'Correction request is no longer open'; end if;
  elsif a.id is not null then
    if a.request_hash <> s.request_hash then raise exception 'Application already submitted with different answers'; end if;
    return jsonb_build_object('id',a.id,'submitted_at',a.submitted_at,'request_hash',a.request_hash);
  end if;
  if s.expires_at <= now() or s.state <> 'pending' then raise exception 'Upload session expired'; end if;
  if not exists(select 1 from public.franchise_upload_items where session_id = s.id)
    or exists(select 1 from public.franchise_upload_items where session_id = s.id and
      (state <> 'ready' or verified_document is null or coalesce(verified_document->'scan'->>'status','') not in ('clean', case when p_allow_unscanned then 'skipped' else 'clean' end))) then
    raise exception 'Documents are not ready';
  end if;
  select jsonb_object_agg(document_key, verified_document) into docs from public.franchise_upload_items where session_id = s.id;
  if s.correction_id is not null then
    if (select count(*) from public.franchise_upload_items where session_id = s.id) <> 1 or not (docs ? c.document_key) then raise exception 'Incorrect replacement document'; end if;
    update public.franchise_corrections set status = 'received', received_at = now(), request_id = s.retry_id,
      request_hash = s.request_hash, replacement = docs->c.document_key, previous_document = a.document_paths->c.document_key where id = c.id;
    update public.franchise_applications set document_paths = jsonb_set(a.document_paths, array[c.document_key], docs->c.document_key),
      status = case when exists(select 1 from public.franchise_corrections where application_id = a.id and status = 'open') then 'more_information_requested' else 'under_review' end where id = a.id;
    update public.franchise_upload_sessions set state = 'submitted' where id = s.id;
    return jsonb_build_object('id',c.id,'requestId',s.retry_id,'status','received');
  end if;
  if not (docs ?& array['govIdFront','govIdBack','proofOfBilling','proofOfFunds','idPhoto']) then raise exception 'Required documents missing'; end if;
  d := s.application_data;
  insert into public.franchise_applications(id,request_hash,applicant_name,applicant_email,applicant_phone,target_region,target_city,selected_package,application_data,document_paths,status)
    values(s.application_id,s.request_hash,concat_ws(' ',d->>'firstName',d->>'lastName'),d->>'email',d->>'primaryPhone',d->>'targetRegion',d->>'targetCity',nullif(d->>'selectedPackage','not-sure'),d - 'confirmEmail',docs,'submitted')
    returning * into a;
  update public.franchise_upload_sessions set state = 'submitted' where id = s.id;
  return jsonb_build_object('id',a.id,'submitted_at',a.submitted_at,'request_hash',a.request_hash);
end $$;

-- Explicit staff permission, provisioned by the owner/server administrator only.
-- The classmate's app supplies the user's Supabase Auth access token to our API.
create table public.franchise_document_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.franchise_document_access_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  application_id uuid not null,
  document_key text not null,
  created_at timestamptz not null default now()
);
alter table public.franchise_document_reviewers enable row level security;
alter table public.franchise_document_access_log enable row level security;
revoke all on public.franchise_document_reviewers, public.franchise_document_access_log from public, anon, authenticated;
grant all on public.franchise_document_reviewers, public.franchise_document_access_log to service_role;
grant usage, select on sequence public.franchise_document_access_log_id_seq to service_role;

revoke all on function public.prepare_franchise_upload(uuid,text,jsonb,jsonb,uuid,uuid), public.claim_franchise_upload(uuid,text,uuid), public.finish_franchise_upload(uuid,text,uuid,jsonb), public.finalize_franchise_upload(uuid,boolean) from public, anon, authenticated;
grant execute on function public.prepare_franchise_upload(uuid,text,jsonb,jsonb,uuid,uuid), public.claim_franchise_upload(uuid,text,uuid), public.finish_franchise_upload(uuid,text,uuid,jsonb), public.finalize_franchise_upload(uuid,boolean) to service_role;
commit;
