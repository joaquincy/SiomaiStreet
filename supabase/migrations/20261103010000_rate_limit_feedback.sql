-- Preserves existing hourly counters and expiry times. Apply before deploying.
begin;
create or replace function public.consume_application_rate_status(key_hash text, max_requests integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_count integer; window_end timestamptz;
begin
  if key_hash is null or key_hash !~ '^[a-f0-9]{64}$'
    or max_requests is null or max_requests not between 1 and 100 then
    raise exception 'Invalid rate policy';
  end if;
  perform pg_advisory_xact_lock(810291);
  delete from public.application_rate_windows where expires_at <= now();
  if not exists(select 1 from public.application_rate_windows w where w.key_hash = consume_application_rate_status.key_hash)
    and (select count(*) from public.application_rate_windows) >= 10000 then
    return jsonb_build_object('unavailable', true);
  end if;
  insert into public.application_rate_windows as w(key_hash,requests,expires_at)
    values(consume_application_rate_status.key_hash,1,now() + interval '1 hour')
    on conflict on constraint application_rate_windows_pkey
    do update set requests = least(w.requests + 1,101)
    returning requests,expires_at into current_count,window_end;
  return jsonb_build_object('allowed',current_count <= max_requests,
    'remaining',greatest(0,max_requests-current_count),
    'resetAfter',greatest(1,ceil(extract(epoch from window_end-now())))::integer,
    'windowSeconds',3600);
end;
$$;
revoke all on function public.consume_application_rate_status(text,integer) from public,anon,authenticated;
grant execute on function public.consume_application_rate_status(text,integer) to service_role;
notify pgrst, 'reload schema';
commit;
