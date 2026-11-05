-- Run after 20261104000000_passport_document_requirement.sql.
-- Submission alternatives are for manual review, never automatic approval.
begin;

create or replace function public.assert_franchise_document_policy(d jsonb, docs jsonb)
returns void language plpgsql set search_path = public, pg_temp as $$
declare pending boolean; amount numeric; k text;
begin
  if coalesce(d->>'fundingStatus','') not in ('available','partly-pending','pending') then raise exception 'Choose a funding status'; end if;
  pending := d->>'fundingStatus' in ('partly-pending','pending');
  if coalesce(d->>'totalLiquidCapital','') !~ '^([0-9]+|[0-9]{1,3}(,[0-9]{3})+)(\.[0-9]{1,2})?$' then raise exception 'Invalid available capital'; end if;
  amount := replace(d->>'totalLiquidCapital', ',', '')::numeric;
  if amount > 90071992547409.91 or (d->>'fundingStatus' = 'pending' and amount <> 0)
    or (d->>'fundingStatus' in ('available','partly-pending') and amount <= 0) then raise exception 'Available capital does not match funding status'; end if;
  if pending and char_length(btrim(coalesce(d->>'pendingFundingDetails',''))) not between 1 and 1000 then raise exception 'Explain pending funding'; end if;
  if coalesce(d->>'addressEvidenceType','') not in ('bill-self','bill-household','bill-landlord','lease','address-certificate','other') then raise exception 'Choose an address evidence type'; end if;
  if d->>'addressEvidenceType' in ('bill-household','bill-landlord','other') and char_length(btrim(coalesce(d->>'addressEvidenceDetails',''))) not between 1 and 1000 then raise exception 'Explain the address evidence'; end if;
  if coalesce(d->>'fundsEvidenceType','') not in ('bank-certificate','statement-balance','loan-approval','partner-commitment','pending-evidence','other') then raise exception 'Choose a funding evidence type'; end if;
  if d->>'fundsEvidenceType' = 'other' and char_length(btrim(coalesce(d->>'fundsEvidenceDetails',''))) not between 1 and 1000 then raise exception 'Explain the funding evidence'; end if;
  if d->>'fundsEvidenceType' in ('loan-approval','partner-commitment','pending-evidence') and not pending then raise exception 'A financing offer or commitment is not available cash'; end if;
  if d->>'govIdType' = 'Other' and (char_length(btrim(coalesce(d->>'govIdOtherName',''))) not between 1 and 120 or char_length(btrim(coalesce(d->>'govIdOtherIssuer',''))) not between 1 and 160) then raise exception 'Identify the Other ID and issuing authority'; end if;
  foreach k in array array['govIdFront','proofOfBilling','idPhoto'] loop
    if jsonb_typeof(docs->k) is distinct from 'object' or coalesce(docs->k->>'path','') = '' then raise exception 'Required documents missing'; end if;
  end loop;
  if coalesce(d->>'govIdType','') <> 'Passport' and (jsonb_typeof(docs->'govIdBack') is distinct from 'object' or coalesce(docs->'govIdBack'->>'path','') = '') then raise exception 'Required documents missing'; end if;
  if pending and d->>'fundsEvidenceType' = 'pending-evidence' then
    if docs ? 'proofOfFunds' then raise exception 'Select the funding evidence type for the attached file'; end if;
  elsif jsonb_typeof(docs->'proofOfFunds') is distinct from 'object' or coalesce(docs->'proofOfFunds'->>'path','') = '' then raise exception 'Required documents missing';
  end if;
end $$;

create or replace function public.franchise_funding_context(d jsonb)
returns jsonb language sql immutable set search_path = public, pg_temp as $$
  select jsonb_build_object('fundingStatus', d->'fundingStatus', 'totalLiquidCapital', d->'totalLiquidCapital',
    'investmentSources', d->'investmentSources', 'pendingFundingDetails', d->'pendingFundingDetails',
    'fundsEvidenceType', d->'fundsEvidenceType', 'fundsEvidenceDetails', d->'fundsEvidenceDetails');
$$;

alter table public.franchise_applications add column if not exists funding_verification_required boolean not null default false;
create table if not exists public.franchise_funding_verifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.franchise_applications(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  evidence_snapshot jsonb not null,
  funding_snapshot jsonb not null,
  notes text not null check (char_length(btrim(notes)) between 1 and 1000)
);
create index if not exists franchise_funding_verifications_application_idx on public.franchise_funding_verifications(application_id);
alter table public.franchise_funding_verifications enable row level security;
revoke all on public.franchise_funding_verifications from public, anon, authenticated;
grant select on public.franchise_funding_verifications to service_role;

create or replace function public.guard_franchise_funding_approval()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Once pending funding has been declared, changing the answer cannot bypass review.
  if TG_OP = 'INSERT' then
    new.funding_verification_required := coalesce(new.application_data->>'fundingStatus' in ('pending','partly-pending'), false);
    if new.application_data->>'documentPolicyVersion' = '2026-11-04.1' then
      perform public.assert_franchise_document_policy(new.application_data, new.document_paths);
    end if;
  else
    new.funding_verification_required := old.funding_verification_required
      or coalesce(old.application_data->>'fundingStatus' in ('pending','partly-pending'), false)
      or coalesce(new.application_data->>'fundingStatus' in ('pending','partly-pending'), false);
  end if;
  if new.status = 'approved' and new.funding_verification_required then
    if not exists(select 1 from public.franchise_funding_verifications v
      where v.application_id = new.id and v.evidence_snapshot = new.document_paths->'proofOfFunds'
      and v.funding_snapshot = public.franchise_funding_context(new.application_data))
      or exists(select 1 from public.franchise_corrections c where c.application_id = new.id and c.document_key = 'proofOfFunds' and c.status = 'open') then
      raise exception 'Funding evidence must be received and verified by an authorized reviewer before approval';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists franchise_funding_approval_guard on public.franchise_applications;
create trigger franchise_funding_approval_guard before insert or update on public.franchise_applications
  for each row execute function public.guard_franchise_funding_approval();

create or replace function public.record_franchise_funding_verification(p_application uuid, p_reviewer uuid, p_notes text, p_allow_unscanned boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.franchise_applications; v public.franchise_funding_verifications; evidence jsonb; context jsonb;
begin
  if not exists(select 1 from public.franchise_document_reviewers where user_id = p_reviewer and enabled) then raise exception 'Reviewer permission required'; end if;
  if p_notes is null or char_length(btrim(p_notes)) not between 1 and 1000 then raise exception 'Provide a verification note (1 to 1000 characters)'; end if;
  select * into a from public.franchise_applications where id = p_application for update;
  if not found or a.status not in ('submitted','under_review','more_information_requested') then raise exception 'Application is not open for review'; end if;
  if exists(select 1 from public.franchise_corrections where application_id = a.id and document_key = 'proofOfFunds' and status = 'open') then raise exception 'Wait for the requested funding evidence'; end if;
  evidence := a.document_paths->'proofOfFunds'; context := public.franchise_funding_context(a.application_data);
  if jsonb_typeof(evidence) is distinct from 'object' or coalesce(evidence->>'path','') = ''
    or not coalesce(((evidence->'scan'->>'status' = 'clean' and evidence->'scan'->>'engine' = 'ClamAV')
      or (p_allow_unscanned and evidence->'scan'->>'status' = 'skipped' and evidence->'scan'->>'engine' = 'none')), false) then raise exception 'Funding evidence is unavailable or failed document checks'; end if;
  if coalesce(evidence->'scan'->>'status','') not in ('clean','skipped') then raise exception 'Funding evidence is unavailable or failed document checks'; end if;
  select * into v from public.franchise_funding_verifications where application_id = a.id and reviewer_id = p_reviewer
    and evidence_snapshot = evidence and funding_snapshot = context and notes = btrim(p_notes) limit 1;
  if not found then
    if (select count(*) from public.franchise_funding_verifications where application_id = a.id) >= 100 then raise exception 'Verification history limit reached'; end if;
    insert into public.franchise_funding_verifications(application_id, reviewer_id, evidence_snapshot, funding_snapshot, notes)
      values(a.id,p_reviewer,evidence,context,btrim(p_notes)) returning * into v;
  end if;
  return jsonb_build_object('id',v.id,'applicationId',a.id,'reviewedAt',v.reviewed_at,'status','verified');
end $$;

-- Same transaction, scan, correction and retry safeguards as the preceding migration.
create or replace function public.finalize_franchise_upload(p_session uuid, p_allow_unscanned boolean default false)
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
    if c.status = 'received' and c.request_id = s.retry_id and c.request_hash = s.request_hash then return jsonb_build_object('id',c.id,'requestId',s.retry_id,'status','received'); end if;
    if c.status <> 'open' or a.status <> 'more_information_requested' then raise exception 'Correction request is no longer open'; end if;
  elsif a.id is not null then
    if a.request_hash <> s.request_hash then raise exception 'Application already submitted with different answers'; end if;
    return jsonb_build_object('id',a.id,'submitted_at',a.submitted_at,'request_hash',a.request_hash);
  end if;
  if s.expires_at <= now() or s.state <> 'pending' then raise exception 'Upload session expired'; end if;
  if not exists(select 1 from public.franchise_upload_items where session_id = s.id)
    or exists(select 1 from public.franchise_upload_items where session_id = s.id and
      (state <> 'ready' or verified_document is null or coalesce(verified_document->'scan'->>'status','') not in ('clean', case when p_allow_unscanned then 'skipped' else 'clean' end))) then raise exception 'Documents are not ready'; end if;
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
  d := s.application_data;
  perform public.assert_franchise_document_policy(d, docs);
  d := jsonb_set(d, '{documentPolicyVersion}', '"2026-11-04.1"'::jsonb);
  insert into public.franchise_applications(id,request_hash,applicant_name,applicant_email,applicant_phone,target_region,target_city,selected_package,application_data,document_paths,status)
    values(s.application_id,s.request_hash,concat_ws(' ',d->>'firstName',d->>'lastName'),d->>'email',d->>'primaryPhone',d->>'targetRegion',d->>'targetCity',nullif(d->>'selectedPackage','not-sure'),d - 'confirmEmail',docs,'submitted') returning * into a;
  update public.franchise_upload_sessions set state = 'submitted' where id = s.id;
  return jsonb_build_object('id',a.id,'submitted_at',a.submitted_at,'request_hash',a.request_hash);
end $$;

revoke all on function public.assert_franchise_document_policy(jsonb,jsonb), public.franchise_funding_context(jsonb), public.guard_franchise_funding_approval(), public.record_franchise_funding_verification(uuid,uuid,text,boolean), public.finalize_franchise_upload(uuid,boolean) from public, anon, authenticated;
grant execute on function public.record_franchise_funding_verification(uuid,uuid,text,boolean), public.finalize_franchise_upload(uuid,boolean) to service_role;
notify pgrst, 'reload schema';
commit;
