-- Run after application_security. Safe whether or not rate_limit_feedback ran.
-- Existing hourly keys/counters/expiries survive; new burst keys are separate.
begin;
create or replace function public.consume_rate_policies(p_policies jsonb)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare
  p jsonb; k text; maximum integer; seconds integer; count_now integer;
  deadline timestamptz; instant timestamptz; result jsonb := '[]'::jsonb;
  rejected boolean := false; new_keys integer;
begin
  if p_policies is null or jsonb_typeof(p_policies) <> 'array' then raise exception 'Invalid rate policies'; end if;
  if jsonb_array_length(p_policies) not between 1 and 3 then raise exception 'Invalid rate policies'; end if;
  for p in select value from jsonb_array_elements(p_policies) loop
    if jsonb_typeof(p) <> 'object' or coalesce(p->>'key_hash','') !~ '^[a-f0-9]{64}$'
      or coalesce(p->>'max_requests','') !~ '^[0-9]{1,3}$'
      or coalesce(p->>'window_seconds','') not in ('300','3600') then raise exception 'Invalid rate policies'; end if;
    if (p->>'max_requests')::integer not between 1 and 100 then raise exception 'Invalid rate policies'; end if;
  end loop;
  if (select count(distinct value->>'key_hash') from jsonb_array_elements(p_policies)) <> jsonb_array_length(p_policies)
    then raise exception 'Duplicate rate policy'; end if;

  -- Same lock as legacy RPCs: an older deployment cannot race these counters.
  perform pg_advisory_xact_lock(810291);
  instant := clock_timestamp();
  delete from public.application_rate_windows where expires_at <= instant;
  select count(*) into new_keys from jsonb_array_elements(p_policies) as entry(value)
    where not exists(select 1 from public.application_rate_windows w where w.key_hash = entry.value->>'key_hash');
  if (select count(*) from public.application_rate_windows) + new_keys > 10000
    then return jsonb_build_object('unavailable',true); end if;

  -- Inspect every window before writing. A denied burst never consumes the
  -- hourly allowance, and a denied hour never consumes a fresh burst window.
  for p in select value from jsonb_array_elements(p_policies) loop
    k := p->>'key_hash'; maximum := (p->>'max_requests')::integer; seconds := (p->>'window_seconds')::integer;
    select requests,expires_at into count_now,deadline from public.application_rate_windows where key_hash=k;
    count_now := coalesce(count_now,0); deadline := coalesce(deadline,instant + make_interval(secs => seconds));
    if count_now >= maximum then rejected := true; end if;
    result := result || jsonb_build_array(jsonb_build_object('key_hash',k,'limit',maximum,
      'allowed',count_now < maximum,'remaining',greatest(0,maximum-count_now),
      'resetAfter',greatest(1,ceil(extract(epoch from deadline-instant)))::integer,'windowSeconds',seconds));
  end loop;
  if rejected then return jsonb_build_object('allowed',false,'policies',result); end if;

  for p in select value from jsonb_array_elements(p_policies) loop
    k := p->>'key_hash'; seconds := (p->>'window_seconds')::integer;
    insert into public.application_rate_windows as w(key_hash,requests,expires_at)
      values(k,1,instant + make_interval(secs => seconds))
      on conflict on constraint application_rate_windows_pkey do update set requests=w.requests+1;
  end loop;
  select jsonb_agg(value || jsonb_build_object('remaining',(value->>'remaining')::integer-1)) into result
    from jsonb_array_elements(result);
  return jsonb_build_object('allowed',true,'policies',result);
end;
$$;
revoke all on function public.consume_rate_policies(jsonb) from public,anon,authenticated;
grant execute on function public.consume_rate_policies(jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
