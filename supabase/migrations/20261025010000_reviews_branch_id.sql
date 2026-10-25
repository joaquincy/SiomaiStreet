-- Link reviews to the existing branch table. Existing reviews remain valid and unassigned.
alter table public.reviews
  add column if not exists branch_id integer references public.branches(branch_id) on delete set null;

create index if not exists reviews_branch_published_created_at_idx
  on public.reviews (branch_id, created_at desc)
  where status = 'published';

-- Make the new column and relationship visible to PostgREST immediately.
notify pgrst, 'reload schema';
