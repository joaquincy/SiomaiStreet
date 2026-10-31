-- Private support queues. This adds to the existing project, not a new database.
begin;
create table if not exists public.contact_inquiries (
  id uuid primary key,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  channel text not null check (channel in ('customer','franchise')),
  topic text not null,
  name text not null check (length(name) between 1 and 100),
  email text not null check (length(email) between 3 and 254),
  branch text not null default '' check (length(branch) <= 150),
  order_reference text not null default '' check (length(order_reference) <= 80),
  message text not null check (length(message) between 20 and 2000),
  privacy_notice_version text not null,
  assigned_queue text not null check (assigned_queue ~ '^[a-z0-9_-]{1,64}$'),
  status text not null default 'new' check (status in ('new','in_progress','resolved','closed')),
  received_at timestamptz not null default now(),
  constraint contact_topic_channel check (
    (channel='customer' and topic in ('food','order','feedback','other')) or
    (channel='franchise' and topic in ('packages','requirements','location','other'))
  ),
  constraint contact_conditional_fields check (
    (channel='customer' or branch='') and ((channel='customer' and topic='order') or order_reference='')
  )
);
create index if not exists contact_queue_status_received_idx on public.contact_inquiries(assigned_queue,status,received_at);
alter table public.contact_inquiries enable row level security;
revoke all on public.contact_inquiries from public, anon, authenticated;
drop policy if exists contact_server_only on public.contact_inquiries;
create policy contact_server_only on public.contact_inquiries as restrictive
  for all to anon, authenticated using (false) with check (false);
grant select, insert, update, delete on public.contact_inquiries to service_role;
comment on table public.contact_inquiries is 'Private support messages. Staff access must be authorized by the app backend. No public lookup or direct client writes. Owner must approve a retention schedule before enabling intake.';
notify pgrst, 'reload schema';
commit;
