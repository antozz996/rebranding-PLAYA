begin;

insert into public.vip_bonuses (title, description, vip_level, active)
select *
from (
  values
    ('Prenotazione prioritaria', 'Accesso prioritario alle richieste di prenotazione VIP.', 'SILVER', true),
    ('Area riservata', 'Preferenza per aree dedicate in base alla disponibilita.', 'GOLD', true),
    ('Drink omaggio', 'Benefit omaggio collegato all''esperienza VIP.', 'GOLD', true),
    ('Inviti eventi speciali', 'Accesso a giornate o appuntamenti selezionati.', 'BLACK', true),
    ('Compleanno VIP', 'Esperienza dedicata per ricorrenze e occasioni speciali.', 'BLACK', true)
) as seed(title, description, vip_level, active)
where not exists (
  select 1
  from public.vip_bonuses vb
  where vb.title = seed.title
    and vb.vip_level = seed.vip_level
);

insert into public.beach_layouts (name, version, is_active, notes)
select
  'Fior d''Acqua Main Layout',
  1,
  not exists (
    select 1
    from public.beach_layouts bl_active
    where bl_active.is_active = true
  ),
  'Layout base MVP per prenotazione postazioni Fior d''Acqua.'
where not exists (
  select 1
  from public.beach_layouts bl
  where bl.name = 'Fior d''Acqua Main Layout'
    and bl.version = 1
);

with target_layout as (
  select bl.id
  from public.beach_layouts bl
  where bl.name = 'Fior d''Acqua Main Layout'
    and bl.version = 1
  limit 1
)
insert into public.beach_spots (
  layout_id,
  spot_code,
  label,
  zone,
  row_name,
  sort_order,
  base_umbrellas,
  base_sunbeds,
  base_status
)
select
  tl.id,
  seed.spot_code,
  seed.label,
  seed.zone,
  seed.row_name,
  seed.sort_order,
  seed.base_umbrellas,
  seed.base_sunbeds,
  seed.base_status
from target_layout tl
cross join (
  values
    ('A01', 'Prima fila 01', 'PRIMA_FILA', 'A', 1, 1, 2, 'DISPONIBILE'),
    ('A02', 'Prima fila 02', 'PRIMA_FILA', 'A', 2, 1, 2, 'DISPONIBILE'),
    ('A03', 'Prima fila 03', 'PRIMA_FILA', 'A', 3, 1, 2, 'DISPONIBILE'),
    ('A04', 'Prima fila 04', 'PRIMA_FILA', 'A', 4, 1, 2, 'DISPONIBILE'),
    ('B01', 'Zona relax 01', 'RELAX', 'B', 1, 1, 2, 'DISPONIBILE'),
    ('B02', 'Zona relax 02', 'RELAX', 'B', 2, 1, 2, 'DISPONIBILE'),
    ('B03', 'Zona relax 03', 'RELAX', 'B', 3, 1, 2, 'DISPONIBILE'),
    ('B04', 'Zona relax 04', 'RELAX', 'B', 4, 1, 2, 'DISPONIBILE')
) as seed(spot_code, label, zone, row_name, sort_order, base_umbrellas, base_sunbeds, base_status)
where not exists (
  select 1
  from public.beach_spots bs
  where bs.layout_id = tl.id
    and bs.spot_code = seed.spot_code
);

commit;
