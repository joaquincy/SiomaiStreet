-- Test database only, after all migrations. Run with ON_ERROR_STOP enabled.
-- Synthetic metadata only: this does not prove real scanner/storage integration.
begin;
do $$
declare app_id uuid:=gen_random_uuid(); correction_id uuid; retry_id uuid:=gen_random_uuid(); receipt jsonb; replay jsonb;
begin
  insert into public.franchise_applications(id,applicant_name,applicant_email,request_hash)
  values(app_id,'Synthetic correction test','synthetic@example.invalid',repeat('a',64));
  correction_id:=public.request_franchise_document(app_id,'govIdFront','Synthetic test: replace blurred front.','synthetic-reviewer');
  if (select status from public.franchise_applications where id=app_id) <> 'more_information_requested' then raise exception 'Request status not set'; end if;
  receipt:=public.receive_franchise_document(app_id,correction_id,retry_id,repeat('b',64),jsonb_build_object('path',app_id||'/corrections/synthetic/govIdFront','scan',jsonb_build_object('status','clean','engine','ClamAV')));
  replay:=public.receive_franchise_document(app_id,correction_id,retry_id,repeat('b',64),'{}'::jsonb);
  if receipt <> replay then raise exception 'Idempotent receipt mismatch'; end if;
  if (select status from public.franchise_applications where id=app_id) <> 'under_review' then raise exception 'Review status not restored'; end if;
  if (select count(*) from public.franchise_corrections where application_id=app_id and status='received') <> 1 then raise exception 'Duplicate or missing replacement'; end if;
end $$;
do $$ begin
  if has_function_privilege('anon','public.request_franchise_document(uuid,text,text,text)','EXECUTE') or
     has_function_privilege('authenticated','public.receive_franchise_document(uuid,uuid,uuid,text,jsonb)','EXECUTE') or
     has_table_privilege('authenticated','public.franchise_corrections','SELECT') then raise exception 'Unprivileged access granted'; end if;
end $$;
rollback;
