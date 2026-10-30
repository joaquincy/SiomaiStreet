-- Run on a test Supabase database AFTER migrations, with a SQL admin connection.
-- Everything, including the deliberately permissive test policy, is rolled back.
begin;
do $$ begin
  if not public.franchise_security_ready() then raise exception 'Storage preflight failed'; end if;
end $$;

insert into storage.objects (bucket_id, name)
values ('franchise-documents', '__security_probe__/synthetic.txt'),
       ('franchise-quarantine', '__security_probe__/synthetic.txt');
-- Prove unrelated permissive policies cannot expose the two protected buckets.
create policy test_application_permissive on storage.objects for all to anon, authenticated
using (true) with check (true);
set local role anon;
do $$ begin
  if exists (select 1 from storage.objects where bucket_id in ('franchise-documents','franchise-quarantine'))
    then raise exception 'Anonymous document access allowed'; end if;
  begin
    insert into storage.objects(bucket_id,name) values ('franchise-quarantine','__security_probe__/unauthorized');
    raise exception 'Anonymous upload allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.franchise_applications;
    raise exception 'Anonymous application access allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  if exists (select 1 from storage.objects where bucket_id in ('franchise-documents','franchise-quarantine'))
    then raise exception 'Ordinary authenticated document access allowed'; end if;
  begin
    insert into storage.objects(bucket_id,name) values ('franchise-documents','__security_probe__/unauthorized');
    raise exception 'Authenticated direct upload allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.consume_application_rate(repeat('a',64),20);
    raise exception 'Client can alter rate limits';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ begin
  if (select count(*) from storage.objects where name = '__security_probe__/synthetic.txt') <> 2
    then raise exception 'Service access failed'; end if;
  if not public.consume_application_rate(repeat('a',64),1) then raise exception 'First rate admission failed'; end if;
  if public.consume_application_rate(repeat('a',64),1) then raise exception 'Rate limit not enforced'; end if;
end $$;
reset role;
rollback;
