begin;

-- Create the booking_rules table
create table if not exists public.booking_rules (
  key text primary key,
  value text not null,
  label text not null,
  description text,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.booking_rules enable row level security;
alter table public.booking_rules force row level security;

-- Policies
drop policy if exists booking_rules_select_all on public.booking_rules;
create policy booking_rules_select_all
on public.booking_rules
for select
to anon, authenticated
using (true);

drop policy if exists booking_rules_all_staff on public.booking_rules;
create policy booking_rules_all_staff
on public.booking_rules
for all
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

-- Grant privileges
grant select on public.booking_rules to anon, authenticated;
grant insert, update, delete on public.booking_rules to authenticated;

-- Seed default booking rules
insert into public.booking_rules (key, value, label, description) values
  ('booking_enabled', 'true', 'Prenotazioni Attive', 'Abilita o disabilita globalmente le prenotazioni per i clienti.'),
  ('max_days_advance', '30', 'Anticipo Massimo (Giorni)', 'Numero massimo di giorni di anticipo per cui un cliente può effettuare una prenotazione.'),
  ('same_day_cutoff_hour', '12', 'Ora Limite Odierna', 'Ora oltre la quale non è più consentito prenotare per il giorno stesso (es. 12 per le ore 12:00).'),
  ('max_guests_per_spot', '4', 'Capienza Massima', 'Numero massimo di persone (adulti + bambini) consentite per singola postazione.')
on conflict (key) do nothing;

commit;
