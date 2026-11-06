-- Apply after 20261105000000_followup_evidence_and_staff_access.sql.
begin;
create table if not exists public.application_email_challenges (
  id uuid primary key,
  draft_id uuid not null unique,
  email_hash text not null check (email_hash ~ '^[a-f0-9]{64}$'),
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  attempts integer not null default 0 check (attempts between 0 and 5),
  verified_until timestamptz,
  provider_id text
);
alter table public.application_email_challenges enable row level security;
revoke all on public.application_email_challenges from public, anon, authenticated;
grant all on public.application_email_challenges to service_role;
create index if not exists application_email_expiry_idx on public.application_email_challenges (expires_at);

create or replace function public.start_application_email(p_draft uuid, p_id uuid, p_email_hash text, p_code_hash text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare old public.application_email_challenges; expiry timestamptz := now() + interval '10 minutes';
begin
  perform pg_advisory_xact_lock(hashtextextended(p_draft::text, 0));
  select * into old from public.application_email_challenges where draft_id=p_draft for update;
  if found and old.created_at > now() - interval '60 seconds' then
    return jsonb_build_object('started', false, 'retryAfter', greatest(1, ceil(extract(epoch from old.created_at + interval '60 seconds' - now()))));
  end if;
  delete from public.application_email_challenges where draft_id=p_draft;
  insert into public.application_email_challenges(id,draft_id,email_hash,code_hash,expires_at) values(p_id,p_draft,p_email_hash,p_code_hash,expiry);
  return jsonb_build_object('started',true,'expiresAt',expiry);
end $$;
create or replace function public.confirm_application_email(p_draft uuid,p_id uuid,p_email_hash text,p_code_hash text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare c public.application_email_challenges;
begin
  select * into c from public.application_email_challenges where id=p_id and draft_id=p_draft and email_hash=p_email_hash for update;
  if not found then return jsonb_build_object('confirmed',false); end if;
  -- A consumed code cannot create another proof. Lost responses require a new code.
  if c.verified_until is not null or c.expires_at<=now() or c.attempts>=5 then return jsonb_build_object('confirmed',false,'locked',c.attempts>=5); end if;
  update public.application_email_challenges set attempts=attempts+1 where id=p_id;
  if c.code_hash<>p_code_hash then return jsonb_build_object('confirmed',false,'locked',c.attempts+1>=5); end if;
  update public.application_email_challenges set verified_until=now()+interval '24 hours' where id=p_id;
  return jsonb_build_object('confirmed',true);
end $$;
create or replace function public.cleanup_application_email_challenges()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare deleted integer;
begin
  delete from public.application_email_challenges where id in (
    select id from public.application_email_challenges where greatest(expires_at,coalesce(verified_until,expires_at)) < now() order by expires_at limit 500
  );
  get diagnostics deleted = row_count;
  return deleted;
end $$;
revoke all on function public.start_application_email(uuid,uuid,text,text), public.confirm_application_email(uuid,uuid,text,text), public.cleanup_application_email_challenges() from public,anon,authenticated;
grant execute on function public.start_application_email(uuid,uuid,text,text), public.confirm_application_email(uuid,uuid,text,text), public.cleanup_application_email_challenges() to service_role;
create or replace function public.refresh_upload_email_confirmation(p_session uuid,p_stamp jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.franchise_upload_sessions set application_data=jsonb_set(application_data,'{emailVerification}',p_stamp)
  where id=p_session and expires_at>now() and correction_id is null and onboarding_item_id is null and answer_change_id is null;
end $$;
revoke all on function public.refresh_upload_email_confirmation(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.refresh_upload_email_confirmation(uuid,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
