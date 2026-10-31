-- Apply after franchise applications and contact inquiries migrations.
create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(),
 recipient text not null, kind text not null, reference text not null,
 created_at timestamptz not null default now(), first_attempt_at timestamptz,
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease uuid, state text not null default 'pending', provider_id text unique,
 delivery_state text, delivery_at timestamptz
);
create index notification_due on public.notification_outbox(next_attempt_at) where state in ('pending','sending');
create table public.notification_events (
 id text primary key, provider_id text not null, kind text not null, occurred_at timestamptz not null
);
create table public.notification_suppressions (recipient text primary key, created_at timestamptz not null default now());
alter table public.notification_outbox enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_suppressions enable row level security;
revoke all on public.notification_outbox, public.notification_events, public.notification_suppressions from anon, authenticated;
grant all on public.notification_outbox, public.notification_events, public.notification_suppressions to service_role;

create function public.queue_customer_notification() returns trigger language plpgsql security definer set search_path = public as $$
begin
 if TG_TABLE_NAME = 'contact_inquiries' then
  insert into notification_outbox(recipient,kind,reference) values(lower(new.email),'inquiry_received','SS-INQ-'||upper(new.id::text));
 elsif TG_OP = 'INSERT' then
  insert into notification_outbox(recipient,kind,reference) values(lower(new.applicant_email),'application_received',new.id::text);
 elsif new.status is distinct from old.status then
  insert into notification_outbox(recipient,kind,reference) values(lower(new.applicant_email),'application_updated',new.id::text);
 end if;
 return new;
end $$;
create trigger contact_email after insert on public.contact_inquiries for each row execute function public.queue_customer_notification();
create trigger application_email after insert or update of status on public.franchise_applications for each row execute function public.queue_customer_notification();

create function public.claim_notification() returns setof public.notification_outbox language plpgsql security definer set search_path = public as $$
declare job notification_outbox;
begin
 -- Stop ambiguous retries before Resend's 24-hour idempotency window expires.
 update notification_outbox set state='needs_review' where state in ('pending','sending') and (attempts >= 8 or first_attempt_at < now()-interval '23 hours');
 update notification_outbox n set state='suppressed' where state in ('pending','sending') and exists(select 1 from notification_suppressions s where s.recipient=n.recipient);
 select * into job from notification_outbox where state in ('pending','sending') and next_attempt_at <= now() order by created_at for update skip locked limit 1;
 if not found then return; end if;
 return query update notification_outbox set state='sending', lease=gen_random_uuid(), attempts=attempts+1, first_attempt_at=coalesce(first_attempt_at,now()), next_attempt_at=now()+interval '2 minutes' where id=job.id returning *;
end $$;

create function public.record_notification_event(event_id text, email_id text, event_kind text, event_time timestamptz) returns void language plpgsql security definer set search_path = public as $$
begin
 insert into notification_events values(event_id,email_id,event_kind,event_time) on conflict do nothing;
 update notification_outbox set delivery_state=event_kind,delivery_at=event_time where provider_id=email_id and (delivery_at is null or delivery_at<=event_time) and coalesce(delivery_state,'') not in ('email.bounced','email.complained');
 if event_kind in ('email.bounced','email.complained') then
  insert into notification_suppressions(recipient) select recipient from notification_outbox where provider_id=email_id on conflict do nothing;
 end if;
end $$;
revoke all on function public.queue_customer_notification(), public.claim_notification(), public.record_notification_event(text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.claim_notification(), public.record_notification_event(text,text,text,timestamptz) to service_role;
notify pgrst, 'reload schema';
