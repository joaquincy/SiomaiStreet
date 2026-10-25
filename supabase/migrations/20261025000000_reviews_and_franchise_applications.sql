-- Siomai Street: reviews and franchise application schema.
-- Apply with `supabase db push` or paste into the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 100),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 1 and 5000),
  photo_path text,
  tags text[] not null default '{}',
  helpful_count integer not null default 0 check (helpful_count >= 0),
  is_verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_published_created_at_idx
  on public.reviews (created_at desc) where status = 'published';
create index if not exists reviews_published_rating_idx
  on public.reviews (rating desc) where status = 'published';
create index if not exists reviews_published_helpful_idx
  on public.reviews (helpful_count desc) where status = 'published';

create table if not exists public.franchise_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null check (char_length(trim(applicant_name)) between 1 and 200),
  applicant_email text not null check (char_length(trim(applicant_email)) <= 320),
  applicant_phone text,
  target_region text,
  target_city text,
  selected_package text check (selected_package is null or selected_package in ('food-cart', 'kiosk', 'casual-dining')),
  -- Full form payload (personal, business, financial, location, declarations, etc.).
  -- Keep sensitive data private; do not expose this column to public clients.
  application_data jsonb not null default '{}'::jsonb check (jsonb_typeof(application_data) = 'object'),
  -- Store Supabase Storage object paths and metadata here, never public file URLs.
  document_paths jsonb not null default '{}'::jsonb check (jsonb_typeof(document_paths) = 'object'),
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'more_information_requested', 'approved', 'declined', 'withdrawn')),
  staff_notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists franchise_applications_status_submitted_idx
  on public.franchise_applications (status, submitted_at desc);
create index if not exists franchise_applications_email_idx
  on public.franchise_applications (lower(applicant_email));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

drop trigger if exists franchise_applications_set_updated_at on public.franchise_applications;
create trigger franchise_applications_set_updated_at
  before update on public.franchise_applications
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;
alter table public.franchise_applications enable row level security;

grant select on public.reviews to anon, authenticated;

-- Anyone can read published reviews. Writes go through the server API only.
drop policy if exists "Anyone can read published reviews" on public.reviews;
create policy "Anyone can read published reviews"
  on public.reviews for select to anon, authenticated
  using (status = 'published');

-- Franchise submissions contain sensitive personal and financial information.
-- No public grants or policies are created. Submissions and staff access use the server API.

-- Create a private bucket for IDs, proof of funds, and other application documents.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'franchise-documents',
  'franchise-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.increment_review_helpful(review_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.reviews
  set helpful_count = helpful_count + 1
  where id = review_id and status = 'published'
  returning helpful_count into updated_count;
  return updated_count;
end;
$$;

revoke all on function public.increment_review_helpful(uuid) from public, anon, authenticated;
grant execute on function public.increment_review_helpful(uuid) to service_role;

-- No anon/authenticated storage policies are created. The server uploads files using
-- the service_role key; never ship that key to the browser. Review photos are public
-- after moderation because published reviews are visible to site visitors.

comment on table public.reviews is 'Customer reviews. New public submissions start pending and require moderation.';
comment on table public.franchise_applications is 'Private franchise applications; public clients can insert only.';
comment on column public.franchise_applications.application_data is 'Complete application form values keyed by the frontend camelCase field names.';
comment on column public.franchise_applications.document_paths is 'Private Storage object paths keyed by document field (e.g. govIdFront).';
