-- Siomai Street: document corrections portal.
-- Lets reviewers request re-uploads and applicants submit corrected documents.
-- Run after 20261026000000_application_security.sql.

begin;

-- Allow revoking an applicant's access to the correction portal.
alter table public.franchise_applications
  add column if not exists portal_access_revoked boolean not null default false;

-- Track individual document correction requests.
create table if not exists public.franchise_corrections (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.franchise_applications(id),
  document_key   text not null check (document_key in (
    'govIdFront', 'govIdBack', 'proofOfBilling', 'proofOfFunds', 'idPhoto',
    'dtiSecCert', 'businessPermit', 'resumeCv', 'characterRef', 'siteProposal'
  )),
  reason         text not null check (char_length(trim(reason)) between 1 and 2000),
  reviewer_id    text not null check (char_length(trim(reviewer_id)) between 1 and 200),
  status         text not null default 'open' check (status in ('open', 'received', 'cancelled')),
  created_at     timestamptz not null default now(),
  received_at    timestamptz,
  request_id     uuid,
  request_hash   text,
  replacement    jsonb,
  previous_document jsonb
);

-- Only one open correction per document per application.
create unique index if not exists franchise_corrections_one_open
  on public.franchise_corrections (application_id, document_key) where status = 'open';

alter table public.franchise_corrections enable row level security;
revoke all on public.franchise_corrections from public, anon, authenticated;
grant all on public.franchise_corrections to service_role;

-- Reviewer requests a document correction from the applicant.
create or replace function public.request_franchise_document(
  application_id uuid, document_key text, reason text, reviewer_id text
) returns uuid language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare result uuid; current_status text;
begin
  select a.status into current_status
    from public.franchise_applications a where a.id = application_id for update;

  if current_status is null
     or current_status not in ('submitted', 'under_review', 'more_information_requested')
  then raise exception 'Application is not open for review'; end if;

  if (select count(*) from public.franchise_corrections c
      where c.application_id = application_id) >= 100
  then raise exception 'Review history limit reached'; end if;

  insert into public.franchise_corrections (application_id, document_key, reason, reviewer_id)
    values (application_id, document_key, reason, reviewer_id)
    returning id into result;

  update public.franchise_applications a
    set status = 'more_information_requested'
    where a.id = application_id;

  return result;
end $$;

-- Applicant uploads a corrected document.
-- Accepts scan status 'clean' (ClamAV) or 'skipped' (when DOCUMENT_SCAN=off).
create or replace function public.receive_franchise_document(
  application_id uuid, correction_id uuid, retry_id uuid, file_hash text, metadata jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare correction public.franchise_corrections; app public.franchise_applications;
begin
  select * into app
    from public.franchise_applications a where a.id = application_id for update;
  select * into correction
    from public.franchise_corrections c
    where c.id = correction_id and c.application_id = application_id for update;

  if app.id is null or correction.id is null
     or app.portal_access_revoked
     or app.submitted_at + interval '90 days' <= now()
  then raise exception 'Access unavailable'; end if;

  -- Idempotent: same retry_id + hash returns the existing receipt.
  if correction.status = 'received'
     and correction.request_id = retry_id
     and correction.request_hash = file_hash
  then
    return jsonb_build_object(
      'id', correction.id, 'requestId', retry_id,
      'status', 'received', 'path', correction.replacement->>'path');
  end if;

  if correction.status <> 'open' or app.status <> 'more_information_requested'
  then raise exception 'Replacement request is not open'; end if;

  if retry_id is null or file_hash is null
     or file_hash !~ '^[a-f0-9]{64}$' or metadata is null
     or (metadata->'scan'->>'status' not in ('clean', 'skipped'))
     or (metadata->'scan'->>'engine' not in ('ClamAV', 'none'))
     or metadata->>'path' is null
     or metadata->>'path' not like application_id::text || '/corrections/%'
  then raise exception 'Invalid replacement metadata'; end if;

  update public.franchise_corrections c set
    status = 'received', received_at = now(),
    request_id = retry_id, request_hash = file_hash,
    replacement = metadata,
    previous_document = app.document_paths->correction.document_key
  where c.id = correction_id;

  update public.franchise_applications a set
    document_paths = jsonb_set(a.document_paths, array[correction.document_key], metadata),
    status = case
      when exists (select 1 from public.franchise_corrections c
                   where c.application_id = application_id and c.status = 'open')
      then 'more_information_requested' else 'under_review' end
  where a.id = application_id;

  return jsonb_build_object(
    'id', correction.id, 'requestId', retry_id,
    'status', 'received', 'path', metadata->>'path');
end $$;

revoke all on function public.request_franchise_document(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.receive_franchise_document(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.request_franchise_document(uuid, text, text, text) to service_role;
grant execute on function public.receive_franchise_document(uuid, uuid, uuid, text, jsonb) to service_role;

notify pgrst, 'reload schema';

commit;

