# Test Checklist - Fior d'Acqua VIP Club

## Scopo

Questa checklist serve per validare il backend Supabase prima di iniziare il frontend.

Riferimenti:

- [supabase/schema.sql](/root/REBRANDING%20PLAYA/supabase/schema.sql:1)
- [supabase/policies.sql](/root/REBRANDING%20PLAYA/supabase/policies.sql:1)
- [supabase/storage-policies.sql](/root/REBRANDING%20PLAYA/supabase/storage-policies.sql:1)
- [supabase/tests.sql](/root/REBRANDING%20PLAYA/supabase/tests.sql:1)

---

## Pre-check

- Progetto Supabase creato
- Progetto Supabase di test, non produzione
- `schema.sql` eseguito
- `policies.sql` eseguito
- `storage-policies.sql` eseguito
- `seed.sql` eseguito
- Signup pubblico staff disattivato
- Primo utente admin creato in Auth
- Primo utente admin inserito in `public.staff_users`
- Bucket `client-photos` presente e privato

---

## Auth staff

- L'admin riesce a fare login con email/password
- `public.is_staff(auth.uid())` restituisce `true`
- `public.is_admin(auth.uid())` restituisce `true`
- Un utente non presente in `staff_users` non viene trattato come staff

---

## RLS tabelle

- `anon` non puo leggere `public.clients`
- `anon` non puo leggere `public.bookings`
- `anon` non puo leggere `public.referrals`
- `anon` non puo leggere `public.warnings`
- `authenticated` non staff non puo leggere le tabelle operative
- `authenticated` staff puo leggere `clients`
- `authenticated` staff puo leggere `bookings`
- `authenticated` staff puo leggere `referrals`
- `authenticated` staff puo leggere `warnings`

---

## Login cliente

- Login valido con `card_code + telefono`
- Cliente `DA_VERIFICARE` non puo fare login
- Token sessione creato in `client_sessions`
- Sessione con scadenza a 24 ore
- Login errato respinto con messaggio generico
- Dopo 5 tentativi falliti in 15 minuti il login viene bloccato temporaneamente
- `cleanup_expired_security_records()` rimuove sessioni scadute
- `cleanup_expired_security_records()` rimuove `login_attempts` vecchi oltre retention

---

## Profilo cliente

- `get_client_profile()` funziona con token valido
- `get_client_profile()` fallisce con token scaduto
- Cliente `VIP` vede il proprio profilo
- Cliente `APPROVATO` vede il proprio profilo
- Cliente `DA_VERIFICARE` non ottiene profilo operativo
- Cliente `IN_OSSERVAZIONE` puo ancora accedere alla card
- Cliente `SOSPESO` non ottiene profilo operativo
- Cliente `ARCHIVIATO` non ottiene profilo operativo

---

## Booking VIP

- Cliente `VIP` puo creare una richiesta booking
- Cliente `APPROVATO` puo creare una richiesta booking
- Cliente `IN_OSSERVAZIONE` non puo creare booking
- Cliente `SOSPESO` non puo creare booking
- Data nel passato respinta
- `adults < 1` respinto
- `adults > 20` respinto
- `children < 0` respinto
- `children > 20` respinto
- `time_slot` non valido respinto
- La booking creata parte con stato `RICHIESTA`

---

## Referral

- Cliente `VIP` puo creare referral
- Cliente `APPROVATO` puo creare referral
- Cliente `IN_OSSERVAZIONE` non puo creare referral
- Cliente `SOSPESO` non puo creare referral
- Referral creato con stato `IN_VERIFICA`
- `referred_notes` viene salvato correttamente
- `evaluation` resta solo campo staff

---

## Card e verifica staff

- `card_code` generato automaticamente se assente
- `referral_code` generato automaticamente se assente
- `card_code` rispetta formato `FDA-YYYY-000001`
- `referral_code` rispetta formato leggibile con fallback anti-collisione
- `verify_client_by_staff()` funziona per staff autenticato
- `verify_client_by_staff()` fallisce per `anon`
- La RPC di verifica restituisce:
  - `client_id`
  - `full_name`
  - `phone`
  - `card_code`
  - `vip_level`
  - `status`
  - `photo_path`
  - `warnings_count`

---

## Storage foto

- Staff autenticato puo leggere oggetti del bucket `client-photos`
- Staff autenticato puo caricare una foto nel bucket
- Staff autenticato puo aggiornare la foto
- Staff autenticato puo cancellare la foto
- `anon` non puo leggere il bucket
- `anon` non puo caricare nel bucket
- Il bucket e effettivamente `private`

Nota:

- la verifica SQL copre soprattutto accesso e policy;
- upload/update/delete reali vanno confermati anche con test manuale o via client Supabase.

---

## Integrita dati

- `phone_normalized` viene valorizzato correttamente
- Due clienti non archiviati non possono condividere lo stesso `phone_normalized`
- Un numero appartenente a un profilo `ARCHIVIATO` puo essere riutilizzato solo tramite nuova gestione staff
- `created_by` viene valorizzato correttamente quando inserisce lo staff autenticato
- Nessun UUID interno e richiesto lato cliente per il login

---

## Go / No-Go

Passa al frontend solo se:

- Auth staff OK
- RLS OK
- RPC cliente OK
- RPC staff OK
- Storage privato OK
- SQL tests OK
- Nessuna anomalia critica su login, booking o verify

Se uno di questi punti fallisce, fermarsi prima di sviluppare HTML/JS.

---

## Esito Atteso

Nel caso di esecuzione da `SQL Editor` Supabase:

- i test con `test_assert_true()` possono mostrare una colonna vuota: e normale;
- il risultato corretto e assenza di errori rossi durante l'intero run;
- se emerge un errore, va corretto prima di procedere con il frontend.
