-- Apply once to the existing shared project before deploying the new Helpful endpoint.
-- Anonymous browser vote tokens are hashed; no IP, name or email is stored here.
begin;
create table if not exists public.review_helpful_votes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  voter_hash text not null check (voter_hash ~ '^[0-9a-f]{64}$'),
  primary key (review_id, voter_hash)
);
alter table public.review_helpful_votes enable row level security;
revoke all on public.review_helpful_votes from public, anon, authenticated;
grant select, insert, delete on public.review_helpful_votes to service_role;

create or replace function public.record_review_helpful(p_review_id uuid, p_voter_hash text)
returns integer language plpgsql security definer set search_path = '' as $$
declare current_count integer; inserted integer;
begin
  if p_voter_hash is null or p_voter_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid vote token';
  end if;
  -- Lock this review so concurrent retries and different voters update atomically.
  select helpful_count into current_count from public.reviews
    where id = p_review_id and status = 'published' for update;
  if not found then return null; end if;
  insert into public.review_helpful_votes (review_id, voter_hash)
    values (p_review_id, p_voter_hash) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    update public.reviews set helpful_count = helpful_count + 1
      where id = p_review_id returning helpful_count into current_count;
  end if;
  return current_count;
end;
$$;
revoke all on function public.record_review_helpful(uuid, text) from public, anon, authenticated;
grant execute on function public.record_review_helpful(uuid, text) to service_role;
-- Disable the old non-idempotent write path. Existing totals are preserved.
do $$
begin
  if to_regprocedure('public.increment_review_helpful(uuid)') is not null then
    execute 'revoke all on function public.increment_review_helpful(uuid) from public, anon, authenticated, service_role';
  end if;
end;
$$;
commit;
