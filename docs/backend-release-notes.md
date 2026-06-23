# Backend Release Notes - Fior d'Acqua VIP Club

## Stato

Backend Supabase consolidato e validato su progetto di test in data `2026-06-22`.

File baseline:

- [supabase/schema.sql](/root/REBRANDING%20PLAYA/supabase/schema.sql:1)
- [supabase/policies.sql](/root/REBRANDING%20PLAYA/supabase/policies.sql:1)
- [supabase/storage-policies.sql](/root/REBRANDING%20PLAYA/supabase/storage-policies.sql:1)
- [supabase/seed.sql](/root/REBRANDING%20PLAYA/supabase/seed.sql:1)
- [supabase/tests.sql](/root/REBRANDING%20PLAYA/supabase/tests.sql:1)

## Correzioni Confermate

- `client_login()` restituisce risposta controllata con `success/message/session_token/expires_at`, senza perdere i login attempt falliti per rollback implicito.
- `DA_VERIFICARE` bloccato al login.
- `IN_OSSERVAZIONE` puo vedere la card ma non puo creare booking o referral.
- `phone_normalized` viene sempre derivato da `phone`.
- `birth_date` obbligatoria per `APPROVATO` e `VIP`.
- Unicita di `phone_normalized` gestita con indice parziale sui profili non `ARCHIVIATO`.
- `prepare_client_record()` non rigenera `card_code` o `referral_code` durante `UPDATE` se i campi arrivano vuoti.
- `verify_client_by_staff()` corretta per eliminare l'ambiguita sul nome `client_id`.
- `tests.sql` adattato al comportamento reale del `SQL Editor` Supabase.

## Ordine Finale Di Esecuzione

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/storage-policies.sql`
4. `supabase/seed.sql`
5. creazione primo admin in Supabase Auth
6. insert admin in `public.staff_users`
7. `supabase/tests.sql`

## Nota Operativa

- usare prima un progetto Supabase di test;
- su `schema.sql`, se compare il warning iniziale di Supabase, scegliere `Run without RLS`;
- prima di eseguire `tests.sql`, sostituire il placeholder `app.test_admin_uuid` con l'UUID reale del proprio admin.

## Soglia Di Passaggio

Si puo iniziare il frontend solo dopo:

- run SQL completo senza errori;
- verifica bucket `client-photos` privato;
- verifica login staff;
- verifica RPC cliente e staff;
- conferma manuale che il primo admin e operativo.
