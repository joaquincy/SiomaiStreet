-- Run after direct_application_uploads.sql in the existing shared project.
-- Replaces only the finalization function; existing applications are unchanged.
begin;

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
  d := s.application_data;
  if not (docs ?& array['govIdFront','proofOfBilling','proofOfFunds','idPhoto'])
    or (coalesce(d->>'govIdType', '') <> 'Passport' and not (docs ? 'govIdBack')) then
    raise exception 'Required documents missing';
  end if;
  insert into public.franchise_applications(id,request_hash,applicant_name,applicant_email,applicant_phone,target_region,target_city,selected_package,application_data,document_paths,status)
    values(s.application_id,s.request_hash,concat_ws(' ',d->>'firstName',d->>'lastName'),d->>'email',d->>'primaryPhone',d->>'targetRegion',d->>'targetCity',nullif(d->>'selectedPackage','not-sure'),d - 'confirmEmail',docs,'submitted')
    returning * into a;
  update public.franchise_upload_sessions set state = 'submitted' where id = s.id;
  return jsonb_build_object('id',a.id,'submitted_at',a.submitted_at,'request_hash',a.request_hash);
end $$;

revoke all on function public.finalize_franchise_upload(uuid,boolean) from public, anon, authenticated;
grant execute on function public.finalize_franchise_upload(uuid,boolean) to service_role;
commit;
