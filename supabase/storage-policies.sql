begin;

insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists client_photos_select_staff on storage.objects;
create policy client_photos_select_staff
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-photos'
  and public.is_staff(auth.uid())
);

drop policy if exists client_photos_insert_staff on storage.objects;
create policy client_photos_insert_staff
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-photos'
  and public.is_staff(auth.uid())
);

drop policy if exists client_photos_update_staff on storage.objects;
create policy client_photos_update_staff
on storage.objects
for update
to authenticated
using (
  bucket_id = 'client-photos'
  and public.is_staff(auth.uid())
)
with check (
  bucket_id = 'client-photos'
  and public.is_staff(auth.uid())
);

drop policy if exists client_photos_delete_staff on storage.objects;
create policy client_photos_delete_staff
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'client-photos'
  and public.is_staff(auth.uid())
);

commit;
