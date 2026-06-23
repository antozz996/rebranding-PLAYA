-- Fior d'Acqua VIP Club - SQL test suite
--
-- Prima di eseguire:
-- 1. esegui schema.sql, policies.sql, storage-policies.sql e seed.sql;
-- 2. crea almeno un utente admin reale in Supabase Auth;
-- 3. inserisci il suo UUID in public.staff_users;
-- 4. sostituisci il valore app.test_admin_uuid qui sotto.

select set_config('app.test_admin_uuid', '6ecd41b0-fbf8-46f6-8180-76c3a4c84bc5', false);

create or replace function public.test_assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'ASSERT FAILED: %', p_message;
  end if;
end;
$$;

create or replace function public.test_expect_sqlstate(p_sql text, p_expected_sqlstate text, p_message text)
returns void
language plpgsql
as $$
declare
  v_sqlstate text;
begin
  execute p_sql;
  raise exception 'ASSERT FAILED: % (expected sqlstate %)', p_message, p_expected_sqlstate;
exception
  when others then
    get stacked diagnostics v_sqlstate = returned_sqlstate;
    if v_sqlstate = p_expected_sqlstate then
      return;
    end if;
    raise;
end;
$$;

grant execute on function public.test_assert_true(boolean, text) to anon, authenticated;
grant execute on function public.test_expect_sqlstate(text, text, text) to anon, authenticated;

create or replace function public.test_set_request_claims()
returns void
language plpgsql
as $$
declare
  v_role text := coalesce(current_setting('request.jwt.claim.role', true), 'anon');
  v_sub text := current_setting('request.jwt.claim.sub', true);
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('role', v_role, 'sub', v_sub)::text,
    true
  );
end;
$$;

grant execute on function public.test_set_request_claims() to anon, authenticated;

-- Seed di test idempotente lato database.
delete from public.clients
where card_code in (
  'FDA-2099-900001',
  'FDA-2099-900002',
  'FDA-2099-900003',
  'FDA-2099-900004',
  'FDA-2099-900005'
);

delete from public.clients
where phone_normalized = public.normalize_phone('+39 333 111 0099');

insert into public.clients (
  full_name,
  phone,
  phone_normalized,
  email,
  birth_date,
  status,
  vip_level,
  card_code,
  referral_code,
  privacy_accepted,
  marketing_accepted,
  notes
)
values
  (
    'Cliente VIP Test',
    '+39 333 111 0001',
    public.normalize_phone('+39 333 111 0001'),
    'vip-test@example.com',
    date '1990-01-01',
    'VIP',
    'BLACK',
    'FDA-2099-900001',
    'FDA-VIPTEST-901',
    true,
    false,
    'Test profile VIP'
  ),
  (
    'Cliente Approvato Test',
    '+39 333 111 0002',
    public.normalize_phone('+39 333 111 0002'),
    'approved-test@example.com',
    date '1991-02-02',
    'APPROVATO',
    'GOLD',
    'FDA-2099-900002',
    'FDA-APPROVED-902',
    true,
    false,
    'Test profile approved'
  ),
  (
    'Cliente Osservazione Test',
    '+39 333 111 0003',
    public.normalize_phone('+39 333 111 0003'),
    'watch-test@example.com',
    date '1992-03-03',
    'IN_OSSERVAZIONE',
    'SILVER',
    'FDA-2099-900003',
    'FDA-WATCH-903',
    true,
    false,
    'Test profile in osservazione'
  ),
  (
    'Cliente Sospeso Test',
    '+39 333 111 0004',
    public.normalize_phone('+39 333 111 0004'),
    'suspended-test@example.com',
    date '1993-04-04',
    'SOSPESO',
    'SILVER',
    'FDA-2099-900004',
    'FDA-SUSPEND-904',
    true,
    false,
    'Test profile suspended'
  ),
  (
    'Cliente Da Verificare Test',
    '+39 333 111 0005',
    public.normalize_phone('+39 333 111 0005'),
    'pending-test@example.com',
    date '1994-05-05',
    'DA_VERIFICARE',
    'SILVER',
    'FDA-2099-900005',
    'FDA-PENDING-905',
    true,
    false,
    'Test profile pending review'
  );

-- Nel SQL Editor di Supabase conviene consolidare setup e helper prima
-- dei blocchi con rollback, cosi le funzioni di test non vengono annullate.
commit;

-- 1. Creazione primo admin / riconoscimento staff.
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('app.test_admin_uuid'), true);
select public.test_set_request_claims();

select public.test_assert_true(
  public.is_staff(auth.uid()),
  'L''utente admin configurato deve essere riconosciuto come staff.'
);

select public.test_assert_true(
  public.is_admin(auth.uid()),
  'L''utente admin configurato deve essere riconosciuto come admin.'
);
rollback;

-- 2. Accesso diretto anon a clients: deve essere negato.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  'select count(*) from public.clients'::text,
  '42501'::text,
  'Anon non deve leggere public.clients direttamente.'::text
);
rollback;

-- 3. Accesso diretto staff a clients: deve funzionare.
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('app.test_admin_uuid'), true);
select public.test_set_request_claims();

select public.test_assert_true(
  (select count(*) from public.clients where card_code like 'FDA-2099-%') = 5,
  'Lo staff deve poter leggere i clienti di test.'
);
rollback;

-- 4. Login cliente valido.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

with login_ok as (
  select *
  from public.client_login('FDA-2099-900001', '+39 333 111 0001')
)
select set_config('app.test_vip_token', (select session_token::text from login_ok where success = true), false);

select public.test_assert_true(
  current_setting('app.test_vip_token', true) is not null,
  'Il login cliente valido deve generare un token.'
);
commit;

-- 5. Creazione session token.
select public.test_assert_true(
  exists (
    select 1
    from public.client_sessions
    where token::text = current_setting('app.test_vip_token', true)
  ),
  'La sessione cliente deve essere stata salvata in client_sessions.'
);

-- 6. Get profile con token valido.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.get_client_profile(current_setting('app.test_vip_token')::uuid) p
    where p.card_code = 'FDA-2099-900001'
      and p.status = 'VIP'
  ),
  'get_client_profile deve restituire il profilo corretto per un token valido.'
);
rollback;

-- 7. Get profile con token scaduto.
delete from public.client_sessions
where token = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

insert into public.client_sessions (client_id, token, expires_at)
select id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, now() - interval '1 hour'
from public.clients
where card_code = 'FDA-2099-900001';

begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  $$select * from public.get_client_profile('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)$$::text,
  'P0001'::text,
  'Un token scaduto deve fallire su get_client_profile.'::text
);
rollback;

-- 8. Login cliente errato.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.client_login('FDA-2099-900001', '+39 333 999 9999') l
    where l.success = false
      and l.session_token is null
  ),
  'Il login con telefono errato deve fallire in modo controllato.'
);
rollback;

-- 9. Login cliente DA_VERIFICARE bloccato.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.client_login('FDA-2099-900005', '+39 333 111 0005') l
    where l.success = false
      and l.session_token is null
  ),
  'Un cliente DA_VERIFICARE non deve poter accedere alla card.'
);
rollback;

-- 10. Blocco dopo 5 tentativi falliti.
delete from public.login_attempts
where card_code = 'FDA-2099-900002';

insert into public.login_attempts (phone, phone_normalized, card_code, success, attempted_at)
values
  ('+39 333 111 0002', public.normalize_phone('+39 333 111 0002'), 'FDA-2099-900002', false, now() - interval '1 minute'),
  ('+39 333 111 0002', public.normalize_phone('+39 333 111 0002'), 'FDA-2099-900002', false, now() - interval '2 minutes'),
  ('+39 333 111 0002', public.normalize_phone('+39 333 111 0002'), 'FDA-2099-900002', false, now() - interval '3 minutes'),
  ('+39 333 111 0002', public.normalize_phone('+39 333 111 0002'), 'FDA-2099-900002', false, now() - interval '4 minutes'),
  ('+39 333 111 0002', public.normalize_phone('+39 333 111 0002'), 'FDA-2099-900002', false, now() - interval '5 minutes');

begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.client_login('FDA-2099-900002', '+39 333 111 0002') l
    where l.success = false
      and l.session_token is null
  ),
  'Dopo 5 tentativi falliti il login deve essere temporaneamente bloccato.'
);
rollback;

delete from public.login_attempts
where card_code = 'FDA-2099-900002';

-- 11. Booking con cliente VIP.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.create_booking_vip(
      current_setting('app.test_vip_token')::uuid,
      current_date + 1,
      'GIORNATA_INTERA',
      2,
      1,
      'Solarium centrale',
      'Test booking VIP'
    ) b
    where b.status = 'RICHIESTA'
  ),
  'Un cliente VIP deve poter creare una booking richiesta.'
);
rollback;

-- 12. Token cliente in osservazione.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

with login_watch as (
  select *
  from public.client_login('FDA-2099-900003', '+39 333 111 0003')
)
select set_config('app.test_watch_token', (select session_token::text from login_watch where success = true), false);
commit;

-- 13. Booking con cliente IN_OSSERVAZIONE.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  format(
    $$select * from public.create_booking_vip('%s'::uuid, current_date + 1, 'MATTINA', 2, 0, 'Test', 'Watch booking')$$,
    current_setting('app.test_watch_token')
  )::text,
  'P0001'::text,
  'Un cliente IN_OSSERVAZIONE non deve poter prenotare.'::text
);
rollback;

-- 14. Booking con cliente SOSPESO.
delete from public.client_sessions
where token = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

insert into public.client_sessions (client_id, token, expires_at)
select id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, now() + interval '24 hours'
from public.clients
where card_code = 'FDA-2099-900004';

begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  $$select * from public.create_booking_vip('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, current_date + 1, 'MATTINA', 2, 0, 'Test', 'Suspended booking')$$::text,
  'P0001'::text,
  'Un cliente SOSPESO non deve poter prenotare.'::text
);
rollback;

-- 15. Booking con data passata.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  format(
    $$select * from public.create_booking_vip('%s'::uuid, current_date - 1, 'MATTINA', 2, 0, 'Test', 'Past booking')$$,
    current_setting('app.test_vip_token')
  )::text,
  'P0001'::text,
  'Una booking con data passata deve fallire.'::text
);
rollback;

-- 16. Booking con numero adulti non valido.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  format(
    $$select * from public.create_booking_vip('%s'::uuid, current_date + 1, 'MATTINA', 0, 0, 'Test', 'Invalid adults')$$,
    current_setting('app.test_vip_token')
  )::text,
  'P0001'::text,
  'Una booking con adulti fuori range deve fallire.'::text
);
rollback;

-- 17. Referral con cliente VIP.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.create_referral_vip(
      current_setting('app.test_vip_token')::uuid,
      'Ospite Referral Test',
      '+39 333 444 5555',
      'Profilo presentato dal cliente VIP'
    ) r
    where r.status = 'IN_VERIFICA'
  ),
  'Un cliente VIP deve poter creare un referral.'
);
rollback;

-- 18. Referral con cliente IN_OSSERVAZIONE.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  format(
    $$select * from public.create_referral_vip('%s'::uuid, 'Ospite Non Ammesso', '+39 300 000 0000', 'Watch referral')$$,
    current_setting('app.test_watch_token')
  )::text,
  'P0001'::text,
  'Un cliente IN_OSSERVAZIONE non deve poter creare referral.'::text
);
rollback;

-- 19. Verify card da staff.
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('app.test_admin_uuid'), true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.verify_client_by_staff('FDA-2099-900001') v
    where v.card_code = 'FDA-2099-900001'
      and v.status = 'VIP'
  ),
  'Lo staff deve poter verificare una card via RPC.'
);
rollback;

-- 20. Verify card da anon.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  $$select * from public.verify_client_by_staff('FDA-2099-900001')$$::text,
  '42501'::text,
  'Anon non deve poter usare verify_client_by_staff.'::text
);
rollback;

-- 21. Storage foto da anon: accesso negato.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_assert_true(
  (select count(*) from storage.objects where bucket_id = 'client-photos') = 0,
  'Anon non deve vedere oggetti del bucket client-photos.'
);
rollback;

-- 22. Storage foto da staff: lettura consentita anche se il bucket e vuoto.
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('app.test_admin_uuid'), true);
select public.test_set_request_claims();

select public.test_assert_true(
  (select count(*) from storage.objects where bucket_id = 'client-photos') >= 0,
  'Lo staff deve poter leggere gli oggetti del bucket client-photos.'
);
rollback;

-- 23. Seed mappa: spot test presenti.
select set_config(
  'app.test_map_spot_a01',
  coalesce((select bs.id::text from public.beach_spots bs where bs.spot_code = 'A01' limit 1), ''),
  false
);

select set_config(
  'app.test_map_spot_a02',
  coalesce((select bs.id::text from public.beach_spots bs where bs.spot_code = 'A02' limit 1), ''),
  false
);

select public.test_assert_true(
  current_setting('app.test_map_spot_a01', true) is not null
  and current_setting('app.test_map_spot_a01', true) <> '',
  'Il seed deve contenere la postazione A01.'
);

select public.test_assert_true(
  current_setting('app.test_map_spot_a02', true) is not null
  and current_setting('app.test_map_spot_a02', true) <> '',
  'Il seed deve contenere la postazione A02.'
);

delete from public.bookings
where spot_id in (
  current_setting('app.test_map_spot_a01')::uuid,
  current_setting('app.test_map_spot_a02')::uuid
)
  and booking_date in (current_date + 2, current_date + 3);

delete from public.beach_spot_overrides
where spot_id = current_setting('app.test_map_spot_a02')::uuid
  and service_date = current_date + 3;

-- 24. Accesso diretto anon a beach_spots: deve essere negato.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  'select count(*) from public.beach_spots'::text,
  '42501'::text,
  'Anon non deve leggere public.beach_spots direttamente.'::text
);
rollback;

-- 25. Mappa cliente pubblica disponibile via RPC.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.get_booking_map_for_date(current_date + 2) m
    where m.spot_code = 'A01'
      and m.final_status = 'DISPONIBILE'
      and m.is_bookable = true
  ),
  'La mappa cliente deve esporre la postazione A01 come disponibile.'
);
rollback;

-- 26. Mappa staff disponibile via RPC autenticata.
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('app.test_admin_uuid'), true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.admin_get_booking_map_for_date(current_date + 2) m
    where m.spot_code = 'A01'
      and m.base_status = 'DISPONIBILE'
  ),
  'Lo staff deve poter leggere la mappa giornaliera via RPC admin.'
);
rollback;

-- 27. Override giornaliero staff.
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('app.test_admin_uuid'), true);
select public.test_set_request_claims();

select public.test_assert_true(
  exists (
    select 1
    from public.admin_upsert_spot_override(
      current_setting('app.test_map_spot_a02')::uuid,
      current_date + 3,
      'BLOCCATA',
      1,
      4,
      'Spot bloccata per test'
    ) o
    where o.action = 'UPSERTED'
      and o.status = 'BLOCCATA'
  ),
  'Lo staff deve poter creare un override giornaliero della postazione.'
);
commit;

-- 28. Booking spot disponibile.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

with spot_booking as (
  select *
  from public.create_spot_booking(
    current_setting('app.test_vip_token')::uuid,
    current_date + 2,
    current_setting('app.test_map_spot_a01')::uuid,
    2,
    1,
    'Prenotazione spot test'
  )
)
select set_config('app.test_spot_booking_id', (select booking_id::text from spot_booking), false);
commit;

select public.test_assert_true(
  exists (
    select 1
    from public.bookings b
    where b.id = current_setting('app.test_spot_booking_id')::uuid
      and b.spot_id = current_setting('app.test_map_spot_a01')::uuid
      and b.spot_code_snapshot = 'A01'
      and b.umbrellas_snapshot = 1
      and b.sunbeds_snapshot = 2
      and b.time_slot = 'GIORNATA_INTERA'
      and b.status = 'RICHIESTA'
  ),
  'La booking spot deve salvare spot_id e snapshot della configurazione.'
);

-- 29. Doppia prenotazione stessa postazione: bloccata.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  format(
    $$select * from public.create_spot_booking('%s'::uuid, current_date + 2, '%s'::uuid, 2, 0, 'Collision test')$$,
    current_setting('app.test_vip_token'),
    current_setting('app.test_map_spot_a01')
  )::text,
  'P0001'::text,
  'La stessa postazione non deve essere prenotabile due volte nella stessa data.'::text
);
rollback;

-- 30. Booking su spot bloccata da override.
begin;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
select public.test_set_request_claims();

select public.test_expect_sqlstate(
  format(
    $$select * from public.create_spot_booking('%s'::uuid, current_date + 3, '%s'::uuid, 2, 0, 'Blocked spot test')$$,
    current_setting('app.test_vip_token'),
    current_setting('app.test_map_spot_a02')
  )::text,
  'P0001'::text,
  'Una postazione bloccata da override non deve essere prenotabile.'::text
);
rollback;

-- 31. Cleanup records.
insert into public.login_attempts (phone, phone_normalized, card_code, success, attempted_at)
values ('+39 333 000 0000', public.normalize_phone('+39 333 000 0000'), 'FDA-OLD-000', false, now() - interval '31 days');

select public.test_assert_true(
  exists (
    select 1
    from public.cleanup_expired_security_records() c
    where c.deleted_login_attempts >= 1
  ),
  'cleanup_expired_security_records deve ripulire i vecchi login_attempts.'
);

-- 32. Generazione card code automatica.
insert into public.clients (
  full_name,
  phone,
  phone_normalized,
  birth_date,
  status,
  vip_level,
  privacy_accepted
)
values (
  'Cliente Auto Code Test',
  '+39 333 111 0099',
  public.normalize_phone('+39 333 111 0099'),
  date '1989-09-09',
  'DA_VERIFICARE',
  'SILVER',
  true
);

select public.test_assert_true(
  exists (
    select 1
    from public.clients
    where phone_normalized = public.normalize_phone('+39 333 111 0099')
      and card_code like 'FDA-%'
      and referral_code like 'FDA-%'
  ),
  'La creazione cliente deve generare automaticamente card_code e referral_code.'
);

drop function if exists public.test_assert_true(boolean, text);
drop function if exists public.test_expect_sqlstate(text, text, text);
drop function if exists public.test_set_request_claims();
