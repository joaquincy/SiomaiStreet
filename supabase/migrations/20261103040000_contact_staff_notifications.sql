-- Apply after 20261103030000_contact_email_worker.sql.
-- New inquiries only: no automatic forwarding of historical messages.
begin;
alter table public.notification_outbox add column if not exists staff_payload jsonb;
create unique index if not exists notification_staff_reference_unique
 on public.notification_outbox(kind, reference) where kind='inquiry_staff';

create or replace function public.queue_staff_contact_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
 insert into notification_outbox(recipient,kind,reference,staff_payload)
 values ('jushbisakol@gmail.com','inquiry_staff','SS-INQ-'||upper(new.id::text),
   jsonb_build_object('name',new.name,'email',new.email,'channel',new.channel,
    'topic',new.topic,'branch',new.branch,'order_reference',new.order_reference,'message',new.message))
 on conflict (kind, reference) where kind='inquiry_staff' do nothing;
 return new;
end $$;
revoke all on function public.queue_staff_contact_notification() from public, anon, authenticated;
drop trigger if exists contact_staff_email on public.contact_inquiries;
create trigger contact_staff_email after insert on public.contact_inquiries
 for each row execute function public.queue_staff_contact_notification();

create or replace function public.claim_contact_notification()
returns setof public.notification_outbox
language plpgsql security definer set search_path = public as $$
declare job notification_outbox;
begin
 update notification_outbox set state='needs_review'
 where kind in ('inquiry_received','inquiry_staff') and state in ('pending','sending')
 and next_attempt_at <= now()
 and (attempts >= 8 or first_attempt_at < now()-interval '23 hours');
 update notification_outbox n set state='suppressed'
 where kind in ('inquiry_received','inquiry_staff') and state in ('pending','sending')
 and next_attempt_at <= now()
 and exists(select 1 from notification_suppressions s where s.recipient=n.recipient);
 select * into job from notification_outbox
 where kind in ('inquiry_received','inquiry_staff') and state in ('pending','sending') and next_attempt_at <= now()
 order by created_at, id for update skip locked limit 1;
 if not found then return; end if;
 return query update notification_outbox set state='sending', lease=gen_random_uuid(),
 attempts=attempts+1, first_attempt_at=coalesce(first_attempt_at,now()),
 next_attempt_at=now()+interval '2 minutes' where id=job.id returning *;
end $$;
revoke all on function public.claim_contact_notification() from public, anon, authenticated;
grant execute on function public.claim_contact_notification() to service_role;
comment on column public.notification_outbox.staff_payload is 'Private immutable email snapshot for staff retries; include in inquiry erasure and retention procedures. Never expose via client API.';
notify pgrst, 'reload schema';
commit;
