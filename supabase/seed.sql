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

commit;
