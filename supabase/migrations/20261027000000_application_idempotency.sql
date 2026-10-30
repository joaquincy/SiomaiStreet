-- Apply before deploying Phase 1. Existing IDs already have a primary-key constraint.
alter table public.franchise_applications
  add column if not exists request_hash text;
alter table public.franchise_applications
  add constraint franchise_application_request_hash_format
  check (request_hash is null or request_hash ~ '^[0-9a-f]{64}$');
comment on column public.franchise_applications.request_hash is
  'Server SHA-256 of canonical request plus document bytes. Same ID and hash replay the original receipt; changed payload conflicts.';
