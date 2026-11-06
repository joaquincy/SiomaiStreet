-- Apply after application_followup and followup_evidence_and_staff_access.
begin;
create table public.franchise_field_requests (
  id uuid primary key,
  application_id uuid not null references public.franchise_applications(id) on delete cascade,
  field_key text not null check(field_key in ('firstName','middleName','lastName','address','govIdNumber','govIdReviewReason','primaryPhone','secondaryPhone','targetCity','additionalPlanDetails','pendingFundingDetails')),
  reason text not null check(length(trim(reason)) between 10 and 1000),
  requested_by uuid not null references auth.users(id),
  state text not null default 'open' check(state in ('open','received','changes_needed','resolved')),
  revision integer not null default 1,
  response_note text,
  change_id uuid references public.franchise_answer_changes(id),
  review_note text,
  created_at timestamptz not null default now(),
  received_at timestamptz,
  reviewed_at timestamptz
);
create unique index franchise_open_field_request on public.franchise_field_requests(application_id,field_key) where state<>'resolved';
create index franchise_field_request_application on public.franchise_field_requests(application_id,created_at);
create table public.franchise_field_request_events (
  id uuid primary key,
  application_id uuid not null references public.franchise_applications(id) on delete cascade,
  field_request_id uuid not null references public.franchise_field_requests(id) on delete cascade,
  actor_id uuid references auth.users(id),
  request_hash text not null,
  kind text not null,
  note text not null,
  receipt jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.franchise_field_requests enable row level security;
alter table public.franchise_field_request_events enable row level security;
revoke all on public.franchise_field_requests,public.franchise_field_request_events from public,anon,authenticated;
grant select on public.franchise_field_requests,public.franchise_field_request_events to service_role;
create trigger franchise_field_erasure before insert or update on public.franchise_field_requests for each row execute function public.franchise_erasure_upload_guard();
create trigger franchise_field_event_erasure before insert or update on public.franchise_field_request_events for each row execute function public.franchise_erasure_upload_guard();

create function public.request_franchise_field_correction(p_application uuid,p_id uuid,p_reviewer uuid,p_field text,p_reason text,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.franchise_field_requests; a public.franchise_applications; result jsonb;
begin
 perform public.assert_franchise_staff_followup(p_application,p_reviewer);
 select * into r from public.franchise_field_requests where id=p_id;
 if found then
  if r.application_id<>p_application or r.requested_by<>p_reviewer or r.field_key<>p_field or r.reason<>p_reason then raise exception 'Retry differs'; end if;
  return jsonb_build_object('id',r.id,'state',r.state);
 end if;
 select * into a from public.franchise_applications where id=p_application;
 if a.answer_revision<>p_revision then raise exception 'Application changed'; end if;
 if (select count(*) from public.franchise_field_requests where application_id=p_application)>=50 then raise exception 'Correction limit reached'; end if;
 insert into public.franchise_field_requests(id,application_id,field_key,reason,requested_by) values(p_id,p_application,p_field,p_reason,p_reviewer);
 result:=jsonb_build_object('id',p_id,'state','open');
 insert into public.franchise_field_request_events(id,application_id,field_request_id,actor_id,request_hash,kind,note,receipt) values(p_id,p_application,p_id,p_reviewer,md5(p_field||p_reason),'requested',p_reason,result);
 return result;
end $$;

create function public.respond_franchise_field_correction(p_application uuid,p_item uuid,p_id uuid,p_hash text,p_revision integer,p_answer_revision integer,p_note text,p_category text,p_before jsonb,p_proposed jsonb,p_required text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.franchise_field_requests; e public.franchise_field_request_events; result jsonb; change_result jsonb;
begin
 perform public.assert_franchise_followup(p_application);
 select * into e from public.franchise_field_request_events where id=p_id;
 if found then
  if e.application_id<>p_application or e.field_request_id<>p_item or e.request_hash<>p_hash or e.actor_id is not null then raise exception 'Retry differs'; end if;
  return e.receipt;
 end if;
 select * into r from public.franchise_field_requests where id=p_item and application_id=p_application for update;
 if not found or r.state not in ('open','changes_needed') or r.revision<>p_revision then raise exception 'Request changed'; end if;
 if length(trim(p_note)) not between 10 and 1000 then raise exception 'Explain the correction'; end if;
 if (select answer_revision from public.franchise_applications where id=p_application)<>p_answer_revision then raise exception 'Application changed'; end if;
 if p_proposed is not null then
  if not (p_proposed ? r.field_key) then raise exception 'Reply to the requested field'; end if;
  change_result:=public.submit_franchise_answer_change_with_evidence(p_application,p_id,p_hash,p_answer_revision,p_category,p_before,p_proposed,p_note,p_required);
 end if;
 update public.franchise_field_requests set state='received',revision=revision+1,response_note=p_note,received_at=now(),change_id=case when p_proposed is not null then p_id else null end where id=p_item;
 result:=jsonb_build_object('id',p_item,'state','received','changeId',case when p_proposed is not null then p_id else null end);
 insert into public.franchise_field_request_events(id,application_id,field_request_id,request_hash,kind,note,receipt) values(p_id,p_application,p_item,p_hash,'received',p_note,result);
 return result;
end $$;

create function public.review_franchise_field_correction(p_application uuid,p_item uuid,p_id uuid,p_hash text,p_reviewer uuid,p_revision integer,p_state text,p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.franchise_field_requests; e public.franchise_field_request_events; result jsonb; change_state text;
begin
 perform public.assert_franchise_staff_followup(p_application,p_reviewer);
 select * into e from public.franchise_field_request_events where id=p_id;
 if found then
  if e.application_id<>p_application or e.field_request_id<>p_item or e.request_hash<>p_hash or e.actor_id is distinct from p_reviewer then raise exception 'Retry differs'; end if;
  return e.receipt;
 end if;
 select * into r from public.franchise_field_requests where id=p_item and application_id=p_application for update;
 if not found or r.state<>'received' or r.revision<>p_revision then raise exception 'Response changed'; end if;
 if p_state not in ('resolved','changes_needed') or length(trim(p_note)) not between 10 and 1000 then raise exception 'Provide a decision and reason'; end if;
 if r.change_id is not null then
  select state into change_state from public.franchise_answer_changes where id=r.change_id;
  if change_state='pending' or (p_state='resolved' and change_state<>'accepted') then raise exception 'Review the linked answer change first'; end if;
 end if;
 update public.franchise_field_requests set state=p_state,revision=revision+1,review_note=p_note,reviewed_at=now() where id=p_item;
 result:=jsonb_build_object('id',p_item,'state',p_state);
 insert into public.franchise_field_request_events(id,application_id,field_request_id,actor_id,request_hash,kind,note,receipt) values(p_id,p_application,p_item,p_reviewer,p_hash,p_state,p_note,result);
 return result;
end $$;

create function public.guard_open_field_corrections() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and old.status<>'approved' and exists(select 1 from public.franchise_field_requests where application_id=new.id and state<>'resolved') then raise exception 'Resolve requested answer corrections before approval'; end if;
 return new;
end $$;
create trigger franchise_open_corrections_guard before update on public.franchise_applications for each row execute function public.guard_open_field_corrections();
create function public.guard_duplicate_id_sides() returns trigger language plpgsql set search_path='' as $$
declare front_hash text := new.document_paths->'govIdFront'->>'sha256'; back_hash text := new.document_paths->'govIdBack'->>'sha256';
begin
 if new.application_data->>'govIdType' is distinct from 'Passport' and front_hash ~ '^[a-f0-9]{64}$' and front_hash=back_hash then raise exception 'ID front and back must be different files'; end if;
 return new;
end $$;
create trigger franchise_duplicate_id_guard before insert or update on public.franchise_applications for each row execute function public.guard_duplicate_id_sides();
do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in ('request_franchise_field_correction','respond_franchise_field_correction','review_franchise_field_correction','guard_open_field_corrections','guard_duplicate_id_sides') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
-- The erasure worker refuses unfamiliar shared-app foreign keys. These two private
-- tables cascade with the application and introduce no additional document paths.
create or replace function public.start_franchise_erasure(p_application uuid, p_request uuid default null)
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
    and c.conrelid not in ('public.franchise_corrections'::regclass,'public.franchise_funding_verifications'::regclass,'public.franchise_privacy_requests'::regclass,'public.franchise_answer_changes'::regclass,'public.franchise_onboarding_items'::regclass,'public.franchise_onboarding_events'::regclass,'public.franchise_field_requests'::regclass,'public.franchise_field_request_events'::regclass))
  then raise exception 'Review shared-app foreign keys before enabling retention'; end if;

  select coalesce(array_agg(id),'{}') into sessions from public.franchise_upload_sessions where application_id=a.id;
  select coalesce(array_agg(distinct path) filter(where path is not null),'{}') into paths from (
    select value->>'path' path from jsonb_each(a.document_paths)
    union select replacement->>'path' from public.franchise_corrections where application_id=a.id
    union select previous_document->>'path' from public.franchise_corrections where application_id=a.id
    union select evidence_snapshot->>'path' from public.franchise_funding_verifications where application_id=a.id
    union select d.value->>'path' from public.franchise_answer_changes c, lateral jsonb_each(c.evidence) d where c.application_id=a.id
    union select d.value->>'path' from public.franchise_answer_changes c, lateral jsonb_each(c.previous_documents) d where c.application_id=a.id
    union select evidence->>'path' from public.franchise_onboarding_events where application_id=a.id
    union select evidence->>'path' from public.franchise_onboarding_items where application_id=a.id
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
  delete from public.application_email_challenges where draft_id=a.id;
  if p_request is not null then update public.franchise_privacy_requests set state='in_progress' where id=p_request; end if;
  return job;
end $$;
notify pgrst, 'reload schema';
commit;
