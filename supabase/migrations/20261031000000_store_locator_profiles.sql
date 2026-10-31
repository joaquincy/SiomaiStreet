-- Additive public-location metadata for the existing app-owned branches table.
-- Apply to the agreed integration project; no synthetic stores or coordinates seeded.
create table if not exists public.store_locator_profiles (
  branch_id integer primary key references public.branches(branch_id) on delete cascade,
  published boolean not null default false,
  city text not null default '' check (length(city) <= 100),
  region text not null default '' check (length(region) <= 100),
  landmark text not null default '' check (length(landmark) <= 300),
  public_phone text not null default '' check (length(public_phone) <= 40),
  hours_note text not null default '' check (length(hours_note) <= 500),
  holiday_note text not null default '' check (length(holiday_note) <= 500),
  latitude double precision,
  longitude double precision,
  google_place_id text not null default '' check (length(google_place_id) <= 200),
  constraint store_locator_coordinates check (
    (latitude is null and longitude is null) or
    (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
  )
);
alter table public.store_locator_profiles enable row level security;
revoke all on public.store_locator_profiles from anon, authenticated;
grant select, insert, update, delete on public.store_locator_profiles to service_role;
comment on table public.store_locator_profiles is 'Owner-approved public store details. Publish through an authorized backend only. Never store applicant locations here.';
notify pgrst, 'reload schema';
