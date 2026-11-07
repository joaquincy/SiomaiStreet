-- Application-style idempotency for customer review submissions.
-- Protects against duplicate reviews when a response is lost and the browser retries.

begin;

alter table public.reviews
  add column if not exists submission_id uuid,
  add column if not exists request_hash text
    check (request_hash is null or request_hash ~ '^[0-9a-f]{64}$');

alter table public.reviews
  drop constraint if exists reviews_submission_hash_pair_check,
  add constraint reviews_submission_hash_pair_check
    check ((submission_id is null) = (request_hash is null));

alter table public.reviews
  drop constraint if exists reviews_submission_id_key,
  add constraint reviews_submission_id_key unique (submission_id);

create unique index if not exists reviews_submission_id_uidx
  on public.reviews (submission_id)
  where submission_id is not null;

notify pgrst, 'reload schema';

commit;

