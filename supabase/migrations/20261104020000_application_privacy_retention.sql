-- Application-only retention. Apply AFTER transactional_outbox, direct uploads and
-- 20261104010000_application_document_policy.sql. No existing application is erased here.
-- Storage bytes must be deleted through the Storage API, never DELETE storage.objects.
begin;

alter table public.franchise_applications
  add column if not exists retention_closed_at timestamptz,
  add column if not exists retention_due_at timestamptz,
  add column if not exists retention_hold_reason text,
  add column if not exists retention_hold_until timestamptz;
create index if not exists franchise_retention_due on public.franchise_applications(retention_due_at)
  where status in ('declined','withdrawn');

create table public.franchise_privacy_officers (
  user_id uuid primary key references auth.users(id),
  enabled boolean not null default true
);
create table public.franchise_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.franchise_applications(id) on delete set null,
  kind text not null check (kind in ('access','correction','objection','consent_withdrawal','deletion')),
  received_at timestamptz not null default now(),
  handler_id uuid not null references public.franchise_privacy_officers(user_id),
  verified_at timestamptz,
  state text not null default 'received' check (state in ('received','verified','in_progress','completed','declined')),
  resolved_at timestamptz,
  -- Record a short decision, not copies of messages, IDs or answers.
  decision text check (length(decision) <= 1000),
  check ((state in ('completed','declined')) = (resolved_at is not null)),
  check (state not in ('verified','in_progress','completed') or verified_at is not null)
);

create table public.franchise_erasure_jobs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid unique,
  -- A pseudonymous replay guard, retained without answers, files or contact details.
  application_fingerprint text not null unique check(length(application_fingerprint)=64),
  reason text not null check (reason in ('retention','verified_request')),
  request_id uuid references public.franchise_privacy_requests(id) on delete set null,
  state text not null default 'deleting' check (state in ('deleting','external_cleanup','complete')),
  created_at timestamptz not null default now(),
  lease uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz not null default now(),
  site_deleted_at timestamptz,
  completed_at timestamptz,
  -- IDs let staff reconcile Resend/provider copies; no email or message bodies.
  provider_ids text[] not null default '{}',
  provider_fingerprints text[] not null default '{}',
  external_checked_by uuid references public.franchise_privacy_officers(user_id),
  external_checked_at timestamptz,
  check ((state = 'complete') = (completed_at is not null)),
  check (state <> 'complete' or (application_id is null and cardinality(provider_ids)=0))
);
create index franchise_erasure_due on public.franchise_erasure_jobs(next_attempt_at) where state='deleting';
create index franchise_erasure_provider_guard on public.franchise_erasure_jobs using gin(provider_fingerprints);
create table public.franchise_erasure_objects (
  job_id uuid not null references public.franchise_erasure_jobs(id) on delete cascade,
  bucket text not null check (bucket in ('franchise-documents','franchise-quarantine')),
  path text not null check (length(path) between 1 and 1024 and path !~ '(^/|\.\.|[\\])'),
  primary key(job_id,bucket,path)
);

alter table public.franchise_privacy_officers enable row level security;
alter table public.franchise_privacy_requests enable row level security;
alter table public.franchise_erasure_jobs enable row level security;
alter table public.franchise_erasure_objects enable row level security;
revoke all on public.franchise_privacy_officers, public.franchise_privacy_requests,
  public.franchise_erasure_jobs, public.franchise_erasure_objects from public, anon, authenticated;
grant all on public.franchise_privacy_officers, public.franchise_privacy_requests to service_role;
grant select on public.franchise_erasure_jobs, public.franchise_erasure_objects to service_role;

-- Status transitions establish a real closure date. Existing closed rows remain undated:
-- staff must confirm their actual closure instead of guessing from updated_at.
create function public.franchise_retention_status_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.franchise_erasure_jobs j where j.application_fingerprint=encode(sha256(convert_to(new.id::text,'UTF8')),'hex')) then
    raise exception 'Application erasure has started; this record cannot be changed or recreated';
  end if;
  if new.status not in ('declined','withdrawn') then
    new.retention_closed_at := null; new.retention_due_at := null;
  elsif TG_OP='INSERT' or old.status not in ('declined','withdrawn') then
    new.retention_closed_at := now(); new.retention_due_at := now()+interval '180 days';
  else
    if new.retention_closed_at > now() or new.retention_closed_at < new.submitted_at then
      raise exception 'Closure must be between submission and now';
    end if;
    new.retention_due_at := new.retention_closed_at + interval '180 days';
  end if;
  new.retention_hold_reason := nullif(trim(new.retention_hold_reason),'');
  if (new.retention_hold_reason is null) <> (new.retention_hold_until is null)
     or length(new.retention_hold_reason)>1000 then raise exception 'Hold needs a reason and review date'; end if;
  return new;
end $$;
create trigger franchise_retention_status before insert or update on public.franchise_applications
  for each row execute function public.franchise_retention_status_guard();

-- A hold remains effective even after its review date until a human clears it.
-- The review date is a reminder, never automatic permission to delete held data.
create function public.review_franchise_retention(p_application uuid, p_officer uuid,
  p_closed_at timestamptz default null, p_hold_reason text default null, p_hold_review_at timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.franchise_privacy_officers where user_id=p_officer and enabled) then raise exception 'Privacy officer required'; end if;
  perform 1 from public.franchise_applications where id=p_application for update;
  if not found then raise exception 'Application not found'; end if;
  if p_hold_reason is not null and (p_hold_review_at is null or p_hold_review_at <= now()) then raise exception 'Choose a future hold review date'; end if;
  update public.franchise_applications set
    retention_closed_at=coalesce(p_closed_at,retention_closed_at),
    retention_hold_reason=nullif(trim(p_hold_reason),''), retention_hold_until=p_hold_review_at
    where id=p_application;
end $$;

-- Prevent new uploads for a case being erased, including a stale retry after the
-- application row has gone. The signed-upload grace is checked before erasure starts.
create function public.franchise_erasure_upload_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.application_id::text,0));
  if exists(select 1 from public.franchise_erasure_jobs where application_fingerprint=encode(sha256(convert_to(new.application_id::text,'UTF8')),'hex')) then
    raise exception 'Application is being erased';
  end if;
  return new;
end $$;
create trigger franchise_erasure_upload before insert or update on public.franchise_upload_sessions
  for each row execute function public.franchise_erasure_upload_guard();
create trigger franchise_erasure_correction before insert or update on public.franchise_corrections
  for each row execute function public.franchise_erasure_upload_guard();
create trigger franchise_erasure_verification before insert or update on public.franchise_funding_verifications
  for each row execute function public.franchise_erasure_upload_guard();
create trigger franchise_erasure_access_log before insert on public.franchise_document_access_log
  for each row execute function public.franchise_erasure_upload_guard();

create function public.franchise_erasure_notification_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_TABLE_NAME='notification_events' then
    if exists(select 1 from public.franchise_erasure_jobs where provider_fingerprints @> array[encode(sha256(convert_to(new.provider_id,'UTF8')),'hex')]) then return null; end if;
  elsif new.kind in ('application_received','application_updated') and new.state<>'cancelled' then
    perform pg_advisory_xact_lock(hashtextextended(new.reference,0));
    if exists(select 1 from public.franchise_erasure_jobs where application_fingerprint=encode(sha256(convert_to(new.reference,'UTF8')),'hex')) then
      raise exception 'Application is being erased; notification cancelled';
    end if;
  end if;
  return new;
end $$;
create trigger franchise_erasure_email before insert or update on public.notification_outbox
  for each row execute function public.franchise_erasure_notification_guard();
create trigger franchise_erasure_event before insert on public.notification_events
  for each row execute function public.franchise_erasure_notification_guard();

create function public.start_franchise_erasure(p_application uuid, p_request uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a public.franchise_applications; job uuid; r public.franchise_privacy_requests; paths text[]; sessions uuid[]; item text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_application::text,0));
  select * into a from public.franchise_applications where id=p_application for update;
  select id into job from public.franchise_erasure_jobs where application_id=p_application;
  if job is not null then return job; end if;
  if a.id is null or a.retention_hold_reason is not null then raise exception 'Application missing or on hold'; end if;
  if p_request is null then
    if a.status not in ('declined','withdrawn') or a.retention_due_at is null or a.retention_due_at>now() then raise exception 'Retention is not due'; end if;
  else
    select * into r from public.franchise_privacy_requests where id=p_request and application_id=a.id for update;
    if r.id is null or r.kind<>'deletion' or r.verified_at is null or r.state<>'verified'
      or nullif(trim(r.decision),'') is null
      or not exists(select 1 from public.franchise_privacy_officers where user_id=r.handler_id and enabled)
    then raise exception 'Verified deletion decision required'; end if;
    -- Accepted/active contract data needs a separate approved schedule, never this RPC.
    if a.status='approved' then raise exception 'Approved franchise records need a separate retention decision'; end if;
  end if;
  if exists(select 1 from public.franchise_upload_sessions where application_id=a.id and cleanup_after>now()) then raise exception 'Wait for the upload authorization grace period'; end if;
  if exists(select 1 from public.notification_outbox where reference=a.id::text and state='sending' and next_attempt_at>now()) then raise exception 'Notification delivery is in progress'; end if;
  -- Unknown shared-app dependencies require an explicit integration review BEFORE bytes
  -- are removed. Never cascade into another app's accounts or franchise contracts.
  if exists(select 1 from pg_catalog.pg_constraint c where c.contype='f'
    and c.confrelid='public.franchise_applications'::regclass
    and c.conrelid not in ('public.franchise_corrections'::regclass,'public.franchise_funding_verifications'::regclass,'public.franchise_privacy_requests'::regclass))
  then raise exception 'Review shared-app foreign keys before enabling retention'; end if;

  select coalesce(array_agg(id),'{}') into sessions from public.franchise_upload_sessions where application_id=a.id;
  select coalesce(array_agg(distinct path) filter(where path is not null),'{}') into paths from (
    select value->>'path' path from jsonb_each(a.document_paths)
    union select replacement->>'path' from public.franchise_corrections where application_id=a.id
    union select previous_document->>'path' from public.franchise_corrections where application_id=a.id
    union select evidence_snapshot->>'path' from public.franchise_funding_verifications where application_id=a.id
    union select verified_document->>'path' from public.franchise_upload_items where session_id=any(sessions)
  ) refs;
  foreach item in array paths loop
    if item !~ ('^('||a.id::text||'/|direct/[0-9a-f-]{36}/)[A-Za-z0-9/_-]+$') or item like '%..%' then raise exception 'Unrecognized document path; manual review required'; end if;
    -- A path referenced by another application must not be deleted.
    if exists(select 1 from public.franchise_applications other, lateral jsonb_each(other.document_paths) d
      where other.id<>a.id and d.value->>'path'=item)
      or exists(select 1 from public.franchise_corrections c where c.application_id<>a.id
        and (c.replacement->>'path'=item or c.previous_document->>'path'=item))
    then raise exception 'Document shared with another record; manual review required'; end if;
  end loop;
  -- Revoke portal access while the ordinary status trigger still allows an update.
  update public.franchise_applications set portal_access_revoked=true where id=a.id;
  insert into public.franchise_erasure_jobs(application_id,application_fingerprint,reason,request_id,provider_ids,provider_fingerprints)
    values(a.id,encode(sha256(convert_to(a.id::text,'UTF8')),'hex'),case when p_request is null then 'retention' else 'verified_request' end,p_request,
      array(select provider_id from public.notification_outbox where reference=a.id::text and provider_id is not null),
      array(select encode(sha256(convert_to(provider_id,'UTF8')),'hex') from public.notification_outbox where reference=a.id::text and provider_id is not null)) returning id into job;
  -- Direct referenced paths are included even if Storage metadata is momentarily stale.
  insert into public.franchise_erasure_objects(job_id,bucket,path)
    select job,bucket,path from unnest(paths) path cross join (values('franchise-documents'),('franchise-quarantine')) b(bucket)
    on conflict do nothing;
  -- Include abandoned legacy uploads and every original/processed object in extant sessions.
  insert into public.franchise_erasure_objects(job_id,bucket,path)
    select job,o.bucket_id,o.name from storage.objects o
    where o.bucket_id in ('franchise-documents','franchise-quarantine') and
      (starts_with(o.name,a.id::text||'/') or exists(select 1 from unnest(sessions) s where starts_with(o.name,'direct/'||s::text||'/')))
    on conflict do nothing;
  if (select count(*) from public.franchise_erasure_objects where job_id=job)>5000 then raise exception 'Large deletion requires a manual review'; end if;
  update public.notification_outbox set state='cancelled',lease=null where reference=a.id::text and state in ('pending','sending');
  if p_request is not null then update public.franchise_privacy_requests set state='in_progress' where id=p_request; end if;
  return job;
end $$;

create function public.claim_franchise_erasure() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare j public.franchise_erasure_jobs; candidate uuid;
begin
  -- One case per invocation; multiple worker instances coordinate in PostgreSQL.
  perform pg_advisory_xact_lock(hashtextextended('franchise-erasure-worker-v1',0));
  select * into j from public.franchise_erasure_jobs where state='deleting' and next_attempt_at<=now()
    and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 1;
  if j.id is null then
    select id into candidate from public.franchise_applications a
      where status in ('declined','withdrawn') and retention_due_at<=now() and retention_hold_reason is null
      and not exists(select 1 from public.franchise_erasure_jobs where application_id=a.id)
      and not exists(select 1 from public.franchise_upload_sessions where application_id=a.id and cleanup_after>now())
      order by retention_due_at limit 1;
    if candidate is null then return null; end if;
    candidate := public.start_franchise_erasure(candidate);
    select * into j from public.franchise_erasure_jobs where id=candidate;
  end if;
  update public.franchise_erasure_jobs set lease=gen_random_uuid(), lease_until=now()+interval '2 minutes'
    where id=j.id returning * into j;
  return jsonb_build_object('id',j.id,'lease',j.lease);
end $$;

create function public.franchise_erasure_batch(p_job uuid,p_lease uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.franchise_erasure_jobs where id=p_job and lease=p_lease and lease_until>now() and state='deleting') then raise exception 'Deletion lease expired'; end if;
  return coalesce((select jsonb_agg(to_jsonb(batch)) from
    (select bucket,path from public.franchise_erasure_objects where job_id=p_job order by bucket,path limit 50) batch),'[]');
end $$;

create function public.ack_franchise_erasure_objects(p_job uuid,p_lease uuid,p_objects jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.franchise_erasure_jobs where id=p_job and lease=p_lease and lease_until>now() and state='deleting' for update;
  if not found then raise exception 'Deletion lease expired'; end if;
  if jsonb_typeof(p_objects)<>'array' or jsonb_array_length(p_objects)>50 then raise exception 'Invalid deletion acknowledgement'; end if;
  -- Storage API calls must succeed before the worker acknowledges these paths.
  delete from public.franchise_erasure_objects o where job_id=p_job and exists
    (select 1 from jsonb_array_elements(p_objects) x where x->>'bucket'=o.bucket and x->>'path'=o.path);
end $$;

create function public.finish_franchise_erasure(p_job uuid,p_lease uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare j public.franchise_erasure_jobs;
begin
  select * into j from public.franchise_erasure_jobs where id=p_job and lease=p_lease and lease_until>now() and state='deleting' for update;
  if j.id is null then raise exception 'Deletion lease expired'; end if;
  if exists(select 1 from public.franchise_erasure_objects where job_id=j.id) then return false; end if;
  delete from public.notification_events where provider_id=any(j.provider_ids);
  delete from public.notification_outbox where reference=j.application_id::text;
  delete from public.franchise_upload_sessions where application_id=j.application_id;
  delete from public.franchise_corrections where application_id=j.application_id;
  delete from public.franchise_funding_verifications where application_id=j.application_id;
  delete from public.franchise_document_access_log where application_id=j.application_id;
  -- Privacy request decisions may themselves contain personal details. Keep only the
  -- deleting request's reference until external cleanup is reconciled.
  delete from public.franchise_privacy_requests where application_id=j.application_id and id is distinct from j.request_id;
  update public.franchise_privacy_requests set decision=null where id=j.request_id;
  delete from public.franchise_applications where id=j.application_id;
  update public.franchise_erasure_jobs set state='external_cleanup',site_deleted_at=now(),lease=null,lease_until=null where id=j.id;
  return true;
end $$;

create function public.release_franchise_erasure(p_job uuid,p_lease uuid,p_failed boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.franchise_erasure_jobs set lease=null,lease_until=null,
    next_attempt_at=now()+case when p_failed then interval '5 minutes' else interval '0 seconds' end
    where id=p_job and lease=p_lease and state='deleting';
end $$;

-- Called by the privacy operator AFTER checking external copies/backup restoration
-- suppression. It does not claim to delete another provider's data automatically.
create function public.confirm_franchise_external_erasure(p_job uuid,p_officer uuid,p_confirmed boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare j public.franchise_erasure_jobs;
begin
  if p_confirmed is distinct from true or not exists(select 1 from public.franchise_privacy_officers where user_id=p_officer and enabled) then raise exception 'Privacy officer confirmation required'; end if;
  select * into j from public.franchise_erasure_jobs where id=p_job for update;
  if j.state='complete' then return; end if;
  if j.id is null or j.state<>'external_cleanup' then raise exception 'Website deletion is not complete'; end if;
  delete from public.notification_events where provider_id=any(j.provider_ids);
  delete from public.franchise_privacy_requests where id=j.request_id;
  update public.franchise_erasure_jobs set application_id=null,request_id=null,provider_ids='{}',state='complete',
    completed_at=now(),external_checked_at=now(),external_checked_by=p_officer where id=j.id;
end $$;

revoke all on function public.franchise_retention_status_guard(),public.franchise_erasure_upload_guard(),public.franchise_erasure_notification_guard(),
  public.review_franchise_retention(uuid,uuid,timestamptz,text,timestamptz),public.start_franchise_erasure(uuid,uuid),
  public.claim_franchise_erasure(),public.franchise_erasure_batch(uuid,uuid),public.ack_franchise_erasure_objects(uuid,uuid,jsonb),
  public.finish_franchise_erasure(uuid,uuid),public.release_franchise_erasure(uuid,uuid,boolean),
  public.confirm_franchise_external_erasure(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.review_franchise_retention(uuid,uuid,timestamptz,text,timestamptz),
  public.start_franchise_erasure(uuid,uuid),public.claim_franchise_erasure(),public.franchise_erasure_batch(uuid,uuid),
  public.ack_franchise_erasure_objects(uuid,uuid,jsonb),public.finish_franchise_erasure(uuid,uuid),
  public.release_franchise_erasure(uuid,uuid,boolean),public.confirm_franchise_external_erasure(uuid,uuid,boolean) to service_role;

comment on table public.franchise_erasure_jobs is 'Private deletion coordination. External cleanup is manual; completion scrubs applicant/provider references. Never expose via public APIs.';
notify pgrst,'reload schema';
commit;
