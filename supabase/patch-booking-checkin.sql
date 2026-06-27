begin;

-- Allow the operational check-in state used when staff scans a booking QR.
do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.bookings drop constraint %I', v_constraint_name);
  end loop;
end;
$$;

alter table public.bookings
  add constraint bookings_status_chk
  check (status in (
    'RICHIESTA',
    'CONFERMATA',
    'ARRIVATA',
    'RIFIUTATA',
    'ANNULLATA',
    'COMPLETATA',
    'NO_SHOW'
  ));

-- A spot remains occupied even after the customer has arrived.
drop index if exists public.bookings_active_spot_day_idx;

create unique index bookings_active_spot_day_idx
  on public.bookings (spot_id, booking_date)
  where spot_id is not null
    and status in ('RICHIESTA', 'CONFERMATA', 'ARRIVATA');

create or replace function public.get_booking_map_rows(
  p_booking_date date
)
returns table (
  layout_id uuid,
  layout_name text,
  spot_id uuid,
  spot_code text,
  label text,
  zone text,
  row_name text,
  sort_order integer,
  base_status text,
  override_id uuid,
  override_status text,
  umbrellas integer,
  sunbeds integer,
  admin_note text,
  x numeric,
  y numeric,
  width numeric,
  height numeric,
  rotation numeric,
  shape text,
  z_index integer,
  active_booking_id uuid,
  active_booking_status text,
  booking_client_id uuid,
  booking_client_name text,
  final_status text,
  is_bookable boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with active_layout as (
    select bl.id, bl.name
    from public.beach_layouts bl
    where bl.is_active = true
    order by bl.updated_at desc, bl.created_at desc
    limit 1
  )
  select
    al.id as layout_id,
    al.name as layout_name,
    bs.id as spot_id,
    bs.spot_code,
    coalesce(bs.label, bs.spot_code) as label,
    bs.zone,
    bs.row_name,
    bs.sort_order,
    bs.base_status,
    bo.id as override_id,
    bo.status as override_status,
    coalesce(bo.umbrellas, bs.base_umbrellas) as umbrellas,
    coalesce(bo.sunbeds, bs.base_sunbeds) as sunbeds,
    bo.admin_note,
    bs.x,
    bs.y,
    bs.width,
    bs.height,
    bs.rotation,
    bs.shape,
    bs.z_index,
    bk.id as active_booking_id,
    bk.status as active_booking_status,
    bk.client_id as booking_client_id,
    bc.full_name as booking_client_name,
    case
      when bk.id is not null then 'OCCUPATA'
      else coalesce(bo.status, bs.base_status)
    end as final_status,
    (
      bk.id is null
      and coalesce(bo.status, bs.base_status) = 'DISPONIBILE'
    ) as is_bookable
  from active_layout al
  join public.beach_spots bs
    on bs.layout_id = al.id
  left join public.beach_spot_overrides bo
    on bo.spot_id = bs.id
   and bo.service_date = p_booking_date
  left join lateral (
    select b.id, b.status, b.client_id
    from public.bookings b
    where b.spot_id = bs.id
      and b.booking_date = p_booking_date
      and b.status in ('RICHIESTA', 'CONFERMATA', 'ARRIVATA')
    order by b.created_at desc
    limit 1
  ) bk on true
  left join public.clients bc
    on bc.id = bk.client_id
  order by
    bs.row_name asc,
    bs.sort_order asc,
    bs.spot_code asc;
$$;

commit;
