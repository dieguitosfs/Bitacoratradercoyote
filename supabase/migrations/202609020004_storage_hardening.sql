begin;

-- Recreate Storage policies with both path and ownership checks.
drop policy if exists "users upload own trade images" on storage.objects;
drop policy if exists "users read own trade images" on storage.objects;
drop policy if exists "users update own trade images" on storage.objects;
drop policy if exists "users delete own trade images" on storage.objects;

create policy "users upload own trade images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trade-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] = 'trades'
);

create policy "users read own trade images"
on storage.objects for select to authenticated
using (
  bucket_id = 'trade-images'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Trade evidence is append-only from the client. Do not allow browser-side
-- replacement or deletion of evidence after a trade references it.
-- Cleanup/orphan handling will use a trusted server process.

commit;
