begin;

revoke create on schema public from public;
revoke all on schema public from public;
grant usage on schema public to anon, authenticated;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from authenticated;

grant select, insert, update, delete on public.staff_users to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.beach_layouts to authenticated;
grant select, insert, update, delete on public.beach_spots to authenticated;
grant select, insert, update, delete on public.beach_spot_overrides to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.referrals to authenticated;
grant select, insert, update, delete on public.warnings to authenticated;
grant select, insert, update, delete on public.vip_bonuses to authenticated;
grant select on public.client_sessions to authenticated;
grant select on public.login_attempts to authenticated;

alter default privileges in schema public revoke execute on functions from public;
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

alter table public.staff_users enable row level security;
alter table public.staff_users force row level security;

alter table public.clients enable row level security;
alter table public.clients force row level security;

alter table public.beach_layouts enable row level security;
alter table public.beach_layouts force row level security;

alter table public.beach_spots enable row level security;
alter table public.beach_spots force row level security;

alter table public.beach_spot_overrides enable row level security;
alter table public.beach_spot_overrides force row level security;

alter table public.client_sessions enable row level security;
alter table public.client_sessions force row level security;

alter table public.login_attempts enable row level security;
alter table public.login_attempts force row level security;

alter table public.bookings enable row level security;
alter table public.bookings force row level security;

alter table public.referrals enable row level security;
alter table public.referrals force row level security;

alter table public.warnings enable row level security;
alter table public.warnings force row level security;

alter table public.vip_bonuses enable row level security;
alter table public.vip_bonuses force row level security;

drop policy if exists staff_users_select_staff on public.staff_users;
create policy staff_users_select_staff
on public.staff_users
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists staff_users_insert_admin on public.staff_users;
create policy staff_users_insert_admin
on public.staff_users
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists staff_users_update_admin on public.staff_users;
create policy staff_users_update_admin
on public.staff_users
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists staff_users_delete_admin on public.staff_users;
create policy staff_users_delete_admin
on public.staff_users
for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists clients_select_staff on public.clients;
create policy clients_select_staff
on public.clients
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists clients_insert_staff on public.clients;
create policy clients_insert_staff
on public.clients
for insert
to authenticated
with check (public.is_staff(auth.uid()));

drop policy if exists clients_update_staff on public.clients;
create policy clients_update_staff
on public.clients
for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists clients_delete_staff on public.clients;
create policy clients_delete_staff
on public.clients
for delete
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists beach_layouts_select_staff on public.beach_layouts;
create policy beach_layouts_select_staff
on public.beach_layouts
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists beach_layouts_insert_admin on public.beach_layouts;
create policy beach_layouts_insert_admin
on public.beach_layouts
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists beach_layouts_update_admin on public.beach_layouts;
create policy beach_layouts_update_admin
on public.beach_layouts
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists beach_layouts_delete_admin on public.beach_layouts;
create policy beach_layouts_delete_admin
on public.beach_layouts
for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists beach_spots_select_staff on public.beach_spots;
create policy beach_spots_select_staff
on public.beach_spots
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists beach_spots_insert_admin on public.beach_spots;
create policy beach_spots_insert_admin
on public.beach_spots
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists beach_spots_update_admin on public.beach_spots;
create policy beach_spots_update_admin
on public.beach_spots
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists beach_spots_delete_admin on public.beach_spots;
create policy beach_spots_delete_admin
on public.beach_spots
for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists beach_spot_overrides_select_staff on public.beach_spot_overrides;
create policy beach_spot_overrides_select_staff
on public.beach_spot_overrides
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists beach_spot_overrides_insert_staff on public.beach_spot_overrides;
create policy beach_spot_overrides_insert_staff
on public.beach_spot_overrides
for insert
to authenticated
with check (public.is_staff(auth.uid()));

drop policy if exists beach_spot_overrides_update_staff on public.beach_spot_overrides;
create policy beach_spot_overrides_update_staff
on public.beach_spot_overrides
for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists beach_spot_overrides_delete_staff on public.beach_spot_overrides;
create policy beach_spot_overrides_delete_staff
on public.beach_spot_overrides
for delete
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists client_sessions_select_staff on public.client_sessions;
create policy client_sessions_select_staff
on public.client_sessions
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists login_attempts_select_staff on public.login_attempts;
create policy login_attempts_select_staff
on public.login_attempts
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists bookings_select_staff on public.bookings;
create policy bookings_select_staff
on public.bookings
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists bookings_insert_staff on public.bookings;
create policy bookings_insert_staff
on public.bookings
for insert
to authenticated
with check (public.is_staff(auth.uid()));

drop policy if exists bookings_update_staff on public.bookings;
create policy bookings_update_staff
on public.bookings
for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists bookings_delete_staff on public.bookings;
create policy bookings_delete_staff
on public.bookings
for delete
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists referrals_select_staff on public.referrals;
create policy referrals_select_staff
on public.referrals
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists referrals_insert_staff on public.referrals;
create policy referrals_insert_staff
on public.referrals
for insert
to authenticated
with check (public.is_staff(auth.uid()));

drop policy if exists referrals_update_staff on public.referrals;
create policy referrals_update_staff
on public.referrals
for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists referrals_delete_staff on public.referrals;
create policy referrals_delete_staff
on public.referrals
for delete
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists warnings_select_staff on public.warnings;
create policy warnings_select_staff
on public.warnings
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists warnings_insert_staff on public.warnings;
create policy warnings_insert_staff
on public.warnings
for insert
to authenticated
with check (public.is_staff(auth.uid()));

drop policy if exists warnings_update_staff on public.warnings;
create policy warnings_update_staff
on public.warnings
for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists warnings_delete_staff on public.warnings;
create policy warnings_delete_staff
on public.warnings
for delete
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists vip_bonuses_select_staff on public.vip_bonuses;
create policy vip_bonuses_select_staff
on public.vip_bonuses
for select
to authenticated
using (public.is_staff(auth.uid()));

drop policy if exists vip_bonuses_insert_staff on public.vip_bonuses;
create policy vip_bonuses_insert_staff
on public.vip_bonuses
for insert
to authenticated
with check (public.is_staff(auth.uid()));

drop policy if exists vip_bonuses_update_staff on public.vip_bonuses;
create policy vip_bonuses_update_staff
on public.vip_bonuses
for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists vip_bonuses_delete_staff on public.vip_bonuses;
create policy vip_bonuses_delete_staff
on public.vip_bonuses
for delete
to authenticated
using (public.is_staff(auth.uid()));

grant execute on function public.client_login(text, text) to anon, authenticated;
grant execute on function public.get_client_profile(uuid) to anon, authenticated;
grant execute on function public.get_booking_map_for_date(date) to anon, authenticated;
grant execute on function public.create_spot_booking(uuid, date, uuid, int, int, text) to anon, authenticated;
grant execute on function public.admin_get_booking_map_for_date(date) to authenticated;
grant execute on function public.admin_upsert_spot_override(uuid, date, text, integer, integer, text) to authenticated;
grant execute on function public.create_booking_vip(uuid, date, text, int, int, text, text) to anon, authenticated;
grant execute on function public.create_referral_vip(uuid, text, text, text) to anon, authenticated;
grant execute on function public.verify_client_by_staff(text) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

commit;
