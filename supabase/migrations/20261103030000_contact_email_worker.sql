-- Additive: leaves the admin app's application trigger, jobs and RPC unchanged.
begin;
create or replace function public.claim_contact_notification()
returns setof public.notification_outbox
language plpgsql security definer set search_path = public as $$
declare job notification_outbox;
begin
 update notification_outbox set state='needs_review'
 where kind='inquiry_received' and state in ('pending','sending')
 and (attempts >= 8 or first_attempt_at < now()-interval '23 hours');
 update notification_outbox n set state='suppressed'
 where kind='inquiry_received' and state in ('pending','sending')
 and exists(select 1 from notification_suppressions s where s.recipient=n.recipient);
 select * into job from notification_outbox
 where kind='inquiry_received' and state in ('pending','sending') and next_attempt_at <= now()
 order by created_at for update skip locked limit 1;
 if not found then return; end if;
 return query update notification_outbox set state='sending', lease=gen_random_uuid(),
 attempts=attempts+1, first_attempt_at=coalesce(first_attempt_at,now()),
 next_attempt_at=now()+interval '2 minutes' where id=job.id returning *;
end $$;
revoke all on function public.claim_contact_notification() from public, anon, authenticated;
grant execute on function public.claim_contact_notification() to service_role;
notify pgrst, 'reload schema';
commit;
