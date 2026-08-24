-- ============================================================
-- PIECES BY P  |  Photo storage
-- Run once per Supabase project, after schema.sql.
-- Creates the bucket product photos are uploaded into from the
-- admin, and locks writes to the logged-in owner.
--
-- The bucket is PUBLIC for reading: storefront photos need to load
-- for anonymous shoppers. Only Polly (authenticated) can upload,
-- replace, or delete.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do update set public = true;

-- Anyone can view photos (they appear on the public storefront).
drop policy if exists "public view photos" on storage.objects;
create policy "public view photos"
  on storage.objects for select
  using (bucket_id = 'product-photos');

-- Only the owner can add, change, or remove them.
drop policy if exists "owner upload photos" on storage.objects;
create policy "owner upload photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos');

drop policy if exists "owner update photos" on storage.objects;
create policy "owner update photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-photos');

drop policy if exists "owner delete photos" on storage.objects;
create policy "owner delete photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos');
