-- Apply after 20261104020000_application_privacy_retention.sql.
-- Additive private records; no new public database grants or automatic requirements.
begin;
alter table public.franchise_applications add column if not exists answer_revision integer not null default 1;
alter table public.franchise_applications add column if not exists reassessment_required boolean not null default false;

create table public.franchise_answer_changes (
 id uuid primary key, application_id uuid not null references public.franchise_applications(id) on delete cascade,
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'), base_revision integer not null,
 category text not null check(category in ('contact','plan','funding','identity','coApplicant','email')),
 previous_values jsonb not null, proposed_values jsonb not null,
 reason text not null check(length(trim(reason)) between 10 and 1000),
 state text not null check(state in ('pending','accepted','changes_needed')),
 reviewer_id uuid references auth.users(id), review_note text, verification jsonb,
 created_at timestamptz not null default now(), reviewed_at timestamptz
);
create index franchise_changes_application on public.franchise_answer_changes(application_id,created_at desc);
create unique index franchise_changes_pending on public.franchise_answer_changes(application_id,category) where state='pending';
create table public.franchise_onboarding_items (
 id uuid primary key, application_id uuid not null references public.franchise_applications(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160),
 instructions text not null check(length(trim(instructions)) between 1 and 2000),
 purpose text not null check(length(trim(purpose)) between 1 and 1000),
 evidence_mode text not null check(evidence_mode in ('ready','note','file')),
 responsible text not null check(length(trim(responsible)) between 1 and 160),
 contact_name text not null check(length(trim(contact_name)) between 1 and 120),
 contact_email text not null check(length(contact_email) <= 320 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 due_at timestamptz, state text not null default 'not_started' check(state in ('not_started','submitted','needs_correction','complete')),
 revision integer not null default 1, applicant_note text not null default '', reviewer_note text not null default '',
 evidence jsonb, assigned_by uuid not null references auth.users(id), reviewed_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index franchise_onboarding_application on public.franchise_onboarding_items(application_id,created_at);
create table public.franchise_onboarding_events (
 id uuid primary key, application_id uuid not null references public.franchise_applications(id) on delete cascade,
 item_id uuid not null references public.franchise_onboarding_items(id) on delete cascade,
 request_hash text not null, actor_id uuid references auth.users(id),
 kind text not null check(kind in ('assigned','submitted','clarification','reply','reviewed')),
 note text not null check(length(note)<=2000), evidence jsonb, receipt jsonb not null,
 created_at timestamptz not null default now()
);
create index franchise_onboarding_events_item on public.franchise_onboarding_events(application_id,item_id,created_at);

alter table public.franchise_answer_changes enable row level security;
alter table public.franchise_onboarding_items enable row level security;
alter table public.franchise_onboarding_events enable row level security;
revoke all on public.franchise_answer_changes,public.franchise_onboarding_items,public.franchise_onboarding_events from public,anon,authenticated;
grant select on public.franchise_answer_changes,public.franchise_onboarding_items,public.franchise_onboarding_events to service_role;
create trigger franchise_changes_erasure before insert or update on public.franchise_answer_changes for each row execute function public.franchise_erasure_upload_guard();
create trigger franchise_onboarding_erasure before insert or update on public.franchise_onboarding_items for each row execute function public.franchise_erasure_upload_guard();
create trigger franchise_onboarding_event_erasure before insert or update on public.franchise_onboarding_events for each row execute function public.franchise_erasure_upload_guard();

create function public.guard_franchise_answer_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.application_data is distinct from old.application_data or new.document_paths is distinct from old.document_paths or new.status is distinct from old.status then
  new.answer_revision:=old.answer_revision+1;
 else new.answer_revision:=old.answer_revision; end if;
 if new.status='approved' and old.status<>'approved' then
  if exists(select 1 from public.franchise_answer_changes where application_id=new.id and state='pending' and category<>'contact') then raise exception 'Resolve pending application changes before approval'; end if;
  new.reassessment_required:=false;
 end if;
 return new;
end $$;
create trigger franchise_answer_revision before update on public.franchise_applications for each row execute function public.guard_franchise_answer_revision();

create function public.assert_franchise_followup(p_application uuid,p_onboarding boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare a public.franchise_applications;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_application::text,0));
 select * into a from public.franchise_applications where id=p_application for update;
 if a.id is null or a.portal_access_revoked or a.submitted_at+interval '90 days'<=now()
  or exists(select 1 from public.franchise_erasure_jobs where application_id=p_application) then raise exception 'Application access unavailable'; end if;
 if a.status in ('declined','withdrawn') then raise exception 'Application is closed; contact support'; end if;
 if p_onboarding and (a.status<>'approved' or a.reassessment_required) then raise exception 'Onboarding requires approval without pending reassessment'; end if;
end $$;
create function public.submit_franchise_answer_change(p_application uuid,p_id uuid,p_hash text,p_revision integer,p_category text,p_before jsonb,p_proposed jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.franchise_applications; c public.franchise_answer_changes;
begin
 perform public.assert_franchise_followup(p_application);
 select * into c from public.franchise_answer_changes where id=p_id;
 if c.id is not null then
  if c.application_id<>p_application or c.request_hash<>p_hash then raise exception 'Retry does not match the original update'; end if;
  return jsonb_build_object('id',c.id,'state',c.state);
 end if;
 select * into a from public.franchise_applications where id=p_application;
 if a.answer_revision<>p_revision then raise exception 'Application changed; refresh and compare your update'; end if;
 if (select count(*) from public.franchise_answer_changes where application_id=p_application)>=200 then raise exception 'Contact support for further updates'; end if;
 if jsonb_typeof(p_before)<>'object' or jsonb_typeof(p_proposed)<>'object' or p_before=p_proposed then raise exception 'Provide changed answers'; end if;
 insert into public.franchise_answer_changes(id,application_id,request_hash,base_revision,category,previous_values,proposed_values,reason,state)
 values(p_id,p_application,p_hash,p_revision,p_category,p_before,p_proposed,p_reason,case when p_category='contact' then 'accepted' else 'pending' end) returning * into c;
 if p_category='contact' then
  if exists(select 1 from jsonb_object_keys(p_proposed) k where k not in ('primaryPhone','secondaryPhone','preferredContactMethod')) then raise exception 'Only contact fields can be applied automatically'; end if;
  update public.franchise_applications set application_data=application_data||p_proposed,applicant_phone=p_proposed->>'primaryPhone' where id=p_application;
 elsif a.status='approved' then update public.franchise_applications set reassessment_required=true where id=p_application; end if;
 return jsonb_build_object('id',c.id,'state',c.state);
end $$;

create function public.review_franchise_answer_change(p_application uuid,p_change uuid,p_reviewer uuid,p_revision integer,p_decision text,p_note text,p_verification jsonb,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.franchise_applications; c public.franchise_answer_changes;
begin
 if not exists(select 1 from public.franchise_document_reviewers where user_id=p_reviewer and enabled) then raise exception 'Reviewer permission required'; end if;
 -- Staff may finish review after applicant access expiry, but not after erasure/closure.
 perform pg_advisory_xact_lock(hashtextextended(p_application::text,0));
 select * into a from public.franchise_applications where id=p_application for update;
 if a.id is null or a.status in ('declined','withdrawn') or exists(select 1 from public.franchise_erasure_jobs where application_id=p_application) then raise exception 'Application is unavailable'; end if;
 select * into c from public.franchise_answer_changes where id=p_change and application_id=p_application for update;
 if c.id is null then raise exception 'Change not found'; end if;
 if c.state=p_decision and c.reviewer_id=p_reviewer then return jsonb_build_object('id',c.id,'state',c.state); end if;
 if c.state<>'pending' or a.answer_revision<>p_revision then raise exception 'Review changed; refresh before deciding'; end if;
 if p_decision not in ('accepted','changes_needed') or length(trim(coalesce(p_note,''))) not between 1 and 1000 then raise exception 'Provide a review decision and note'; end if;
 if p_decision='accepted' then
  if c.category in ('identity','coApplicant') and (coalesce(p_verification->>'identityChecked','')<>'true' or length(trim(coalesce(p_verification->>'method','')))<10) then raise exception 'Record identity verification before acceptance'; end if;
  if c.category='email' and (coalesce(p_verification->>'newEmailVerified','')<>'true' or coalesce(p_verification->>'authorization','') not in ('existing_verified_channel','staff_verified_identity') or length(trim(coalesce(p_verification->>'method','')))<10) then raise exception 'Verify the new email and authorize through an established channel or staff identity verification'; end if;
  if jsonb_typeof(p_answers)<>'object' then raise exception 'Validated answers required'; end if;
  update public.franchise_applications set application_data=p_answers,
   applicant_name=concat_ws(' ',p_answers->>'firstName',p_answers->>'lastName'),applicant_phone=p_answers->>'primaryPhone',applicant_email=p_answers->>'email',
   target_region=p_answers->>'targetRegion',target_city=p_answers->>'targetCity',selected_package=nullif(p_answers->>'selectedPackage','not-sure'),
   status=case when status='approved' then 'under_review' else status end,
   reassessment_required=reassessment_required or status='approved' where id=p_application;
 end if;
 update public.franchise_answer_changes set state=p_decision,reviewer_id=p_reviewer,review_note=p_note,verification=p_verification,reviewed_at=now() where id=c.id;
 if p_decision='changes_needed' and a.status='approved' and not exists(select 1 from public.franchise_answer_changes where application_id=p_application and state='pending' and category<>'contact') then
  update public.franchise_applications set reassessment_required=false where id=p_application;
 end if;
 return jsonb_build_object('id',c.id,'state',p_decision);
end $$;

create function public.assign_franchise_onboarding(p_application uuid,p_id uuid,p_reviewer uuid,p_details jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.franchise_onboarding_items;
begin
 if not exists(select 1 from public.franchise_document_reviewers where user_id=p_reviewer and enabled) then raise exception 'Reviewer permission required'; end if;
 perform public.assert_franchise_followup(p_application,true);
 select * into i from public.franchise_onboarding_items where id=p_id;
 if found then
  if i.application_id<>p_application or i.assigned_by<>p_reviewer then raise exception 'Requirement ID already used'; end if;
  if exists(select 1 from public.franchise_onboarding_events where id=p_id and request_hash=md5(p_details::text)) then return jsonb_build_object('id',i.id,'state',i.state); end if;
  raise exception 'Requirement ID already used with different details';
 end if;
 if (select count(*) from public.franchise_onboarding_items where application_id=p_application)>=100 then raise exception 'Requirement limit reached'; end if;
 insert into public.franchise_onboarding_items(id,application_id,title,instructions,purpose,evidence_mode,responsible,contact_name,contact_email,due_at,assigned_by)
 values(p_id,p_application,p_details->>'title',p_details->>'instructions',p_details->>'purpose',p_details->>'evidenceMode',p_details->>'responsible',p_details->>'contactName',p_details->>'contactEmail',nullif(p_details->>'dueAt','')::timestamptz,p_reviewer) returning * into i;
 insert into public.franchise_onboarding_events(id,application_id,item_id,request_hash,actor_id,kind,note,receipt)
 values(p_id,p_application,p_id,md5(p_details::text),p_reviewer,'assigned','Requirement assigned',jsonb_build_object('id',i.id,'state',i.state));
 return jsonb_build_object('id',i.id,'state',i.state);
end $$;

create function public.act_franchise_onboarding(p_application uuid,p_item uuid,p_id uuid,p_hash text,p_revision integer,p_action text,p_note text,p_reviewer uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.franchise_onboarding_items; e public.franchise_onboarding_events; result jsonb; next_state text;
begin
 if p_reviewer is not null and not exists(select 1 from public.franchise_document_reviewers where user_id=p_reviewer and enabled) then raise exception 'Reviewer permission required'; end if;
 perform public.assert_franchise_followup(p_application,true);
 select * into e from public.franchise_onboarding_events where id=p_id;
 if found then
  if e.application_id<>p_application or e.item_id<>p_item or e.request_hash<>p_hash or e.actor_id is distinct from p_reviewer then raise exception 'Retry does not match'; end if;
  return e.receipt;
 end if;
 select * into i from public.franchise_onboarding_items where id=p_item and application_id=p_application for update;
 if i.id is null or i.revision<>p_revision then raise exception 'Requirement changed; refresh before continuing'; end if;
 if length(coalesce(p_note,''))>2000 then raise exception 'Note is too long'; end if;
 next_state:=i.state;
 if p_reviewer is null then
  if p_action='submit' then
   if i.state not in ('not_started','needs_correction') or i.evidence_mode='file' then raise exception 'Upload the requested file or refresh this requirement'; end if;
   if i.evidence_mode='note' and length(trim(coalesce(p_note,'')))<10 then raise exception 'Explain the evidence (at least 10 characters)'; end if;
   next_state:='submitted';
  elsif p_action<>'clarification' or length(trim(coalesce(p_note,'')))<10 then raise exception 'Provide a clarification question (at least 10 characters)'; end if;
 else
  if p_action in ('complete','needs_correction') then
   if i.state<>'submitted' or length(trim(coalesce(p_note,'')))<1 then raise exception 'Review a submitted requirement and provide a note'; end if;
   next_state:=p_action;
  elsif p_action<>'reply' or length(trim(coalesce(p_note,'')))<1 then raise exception 'Provide a clarification reply'; end if;
 end if;
 update public.franchise_onboarding_items set state=next_state,revision=revision+1,updated_at=now(),
  applicant_note=case when p_reviewer is null and p_action='submit' then p_note else applicant_note end,
  reviewer_note=case when p_action in ('complete','needs_correction') then p_note else reviewer_note end,
  reviewed_by=case when p_action in ('complete','needs_correction') then p_reviewer else reviewed_by end where id=i.id;
 result:=jsonb_build_object('id',p_id,'itemId',i.id,'state',next_state);
 insert into public.franchise_onboarding_events(id,application_id,item_id,request_hash,actor_id,kind,note,receipt)
 values(p_id,p_application,i.id,p_hash,p_reviewer,case when p_action='submit' then 'submitted' when p_action in ('complete','needs_correction') then 'reviewed' else p_action end,coalesce(p_note,''),result);
 return result;
end $$;

-- Upload sessions use the existing size, lease, signature, scanning and cleanup pipeline.
alter table public.franchise_upload_sessions add column if not exists onboarding_item_id uuid;
alter table public.franchise_upload_sessions add constraint franchise_upload_onboarding_fk foreign key(onboarding_item_id) references public.franchise_onboarding_items(id) on delete cascade;
alter table public.franchise_upload_sessions add column onboarding_revision integer;
alter table public.franchise_upload_sessions drop constraint franchise_upload_sessions_check;
alter table public.franchise_upload_sessions add constraint franchise_upload_purpose check (
 (correction_id is null and onboarding_item_id is null and retry_id is null) or
 (retry_id is not null and ((correction_id is not null and onboarding_item_id is null) or (correction_id is null and onboarding_item_id is not null))));
alter table public.franchise_upload_items drop constraint franchise_upload_items_document_key_check;
alter table public.franchise_upload_items add constraint franchise_upload_items_document_key_check check(document_key in ('govIdFront','govIdBack','proofOfBilling','proofOfFunds','idPhoto','dtiSecCert','businessPermit','resumeCv','characterRef','siteProposal','onboardingEvidence'));

create function public.prepare_franchise_onboarding_upload(p_application uuid,p_item uuid,p_revision integer,p_retry uuid,p_hash text,p_manifest jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.franchise_onboarding_items; s public.franchise_upload_sessions; d jsonb;
begin
 perform public.assert_franchise_followup(p_application,true);
 select * into i from public.franchise_onboarding_items where id=p_item and application_id=p_application for update;
 if i.id is null or i.revision<>p_revision or i.evidence_mode<>'file' or i.state not in ('not_started','needs_correction') then raise exception 'Requirement changed; refresh before uploading'; end if;
 if jsonb_typeof(p_manifest)<>'array' or jsonb_array_length(p_manifest)<>1 or p_manifest->0->>'key'<>'onboardingEvidence' then raise exception 'Choose one supporting document'; end if;
 select * into s from public.franchise_upload_sessions where application_id=p_application and request_hash=p_hash and expires_at>now() limit 1;
 if found then return to_jsonb(s); end if;
 insert into public.franchise_upload_sessions(application_id,request_hash,application_data,retry_id,onboarding_item_id,onboarding_revision)
 values(p_application,p_hash,'{}',p_retry,p_item,p_revision) returning * into s;
 d:=p_manifest->0;
 insert into public.franchise_upload_items(session_id,document_key,name,content_type,size,sha256)
 values(s.id,'onboardingEvidence',d->>'name',d->>'type',(d->>'size')::bigint,d->>'sha256');
 return to_jsonb(s);
end $$;
create function public.finalize_franchise_onboarding_upload(p_session uuid,p_allow_unscanned boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.franchise_upload_sessions; i public.franchise_onboarding_items; d jsonb; e public.franchise_onboarding_events; result jsonb;
begin
 select * into s from public.franchise_upload_sessions where id=p_session;
 if s.id is null or s.onboarding_item_id is null then raise exception 'Upload not found'; end if;
 perform public.assert_franchise_followup(s.application_id,true);
 select * into s from public.franchise_upload_sessions where id=p_session for update;
 select * into e from public.franchise_onboarding_events where id=s.retry_id;
 if found then
  if e.application_id<>s.application_id or e.request_hash<>s.request_hash then raise exception 'Retry does not match'; end if;
  return e.receipt;
 end if;
 select * into i from public.franchise_onboarding_items where id=s.onboarding_item_id for update;
 if s.expires_at<=now() or s.state<>'pending' or i.state not in ('not_started','needs_correction') or i.revision<>s.onboarding_revision then raise exception 'Requirement changed; refresh and retry'; end if;
 select verified_document into d from public.franchise_upload_items where session_id=s.id and document_key='onboardingEvidence' and state='ready';
 if d is null or d->>'path'<>'direct/'||s.id::text||'/onboardingEvidence' or not coalesce((d->'scan'->>'status'='clean' and d->'scan'->>'engine'='ClamAV') or (p_allow_unscanned and d->'scan'->>'status'='skipped' and d->'scan'->>'engine'='none'),false) then raise exception 'Document checks required'; end if;
 result:=jsonb_build_object('id',i.id,'requestId',s.retry_id,'status','received');
 insert into public.franchise_onboarding_events(id,application_id,item_id,request_hash,kind,note,evidence,receipt)
 values(s.retry_id,s.application_id,i.id,s.request_hash,'submitted','Supporting document received',d,result);
 update public.franchise_onboarding_items set evidence=d,state='submitted',revision=revision+1,updated_at=now() where id=i.id;
 update public.franchise_upload_sessions set state='submitted' where id=s.id;
 return result;
end $$;

-- Only our authenticated server invokes these operations; never expose service keys.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('guard_franchise_answer_revision','assert_franchise_followup','submit_franchise_answer_change','review_franchise_answer_change','assign_franchise_onboarding','act_franchise_onboarding','prepare_franchise_onboarding_upload','finalize_franchise_onboarding_upload') loop
 execute 'revoke all on function '||f.signature||' from public,anon,authenticated';
 execute 'grant execute on function '||f.signature||' to service_role';
 end loop;
end $$;
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
    and c.conrelid not in ('public.franchise_corrections'::regclass,'public.franchise_funding_verifications'::regclass,'public.franchise_privacy_requests'::regclass,'public.franchise_answer_changes'::regclass,'public.franchise_onboarding_items'::regclass,'public.franchise_onboarding_events'::regclass))
  then raise exception 'Review shared-app foreign keys before enabling retention'; end if;

  select coalesce(array_agg(id),'{}') into sessions from public.franchise_upload_sessions where application_id=a.id;
  select coalesce(array_agg(distinct path) filter(where path is not null),'{}') into paths from (
    select value->>'path' path from jsonb_each(a.document_paths)
    union select replacement->>'path' from public.franchise_corrections where application_id=a.id
    union select previous_document->>'path' from public.franchise_corrections where application_id=a.id
    union select evidence_snapshot->>'path' from public.franchise_funding_verifications where application_id=a.id
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
  if p_request is not null then update public.franchise_privacy_requests set state='in_progress' where id=p_request; end if;
  return job;
end $$;
create or replace function public.finish_franchise_erasure(p_job uuid,p_lease uuid) returns boolean
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
notify pgrst,'reload schema';
commit;
