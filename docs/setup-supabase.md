# Setup Supabase - Fior d'Acqua VIP Club

## Obiettivo

Preparare il backend Supabase per il progetto `Fior d'Acqua VIP Club` senza introdurre backend custom su cPanel.

Questo setup copre:

- database;
- Auth staff;
- RLS;
- RPC;
- storage foto privato;
- mappa postazioni piscina e override giornalieri;
- Edge Functions per foto cliente e QR/email prenotazione;
- test iniziali.

---

## 1. Crea il progetto Supabase

1. Accedi a Supabase.
2. Crea un nuovo progetto.
3. Attendi la fine del provisioning.
4. Apri:
   `Project Settings > API`

Recupera:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Non usare nel frontend:

- `service_role`

---

## 2. Configura Auth per lo staff

Apri:

`Authentication > Providers > Email`

Impostazioni richieste:

- abilita login email/password;
- disattiva `Allow new users to sign up`.

Obiettivo:

- nessuna registrazione pubblica staff;
- gli utenti staff vengono creati manualmente.

---

## 3. Esegui i file SQL in ordine

Ordine consigliato:

1. [supabase/schema.sql](/root/REBRANDING%20PLAYA/supabase/schema.sql:1)
2. [supabase/policies.sql](/root/REBRANDING%20PLAYA/supabase/policies.sql:1)
3. [supabase/storage-policies.sql](/root/REBRANDING%20PLAYA/supabase/storage-policies.sql:1)
4. [supabase/seed.sql](/root/REBRANDING%20PLAYA/supabase/seed.sql:1)

Esegui i file dentro `SQL Editor`.

Nota importante:

- esegui questi file dal `SQL Editor` del progetto Supabase;
- non eseguirli con un ruolo limitato;
- le funzioni `security definer` di questo MVP presuppongono creazione nel contesto owner del database del progetto.
- quando Supabase mostra il warning iniziale su `schema.sql`, usa `Run without RLS`;
- l'RLS viene configurata correttamente subito dopo tramite [supabase/policies.sql](/root/REBRANDING%20PLAYA/supabase/policies.sql:1).

---

## 4. Bootstrap del primo admin

### 4.1 Crea il primo utente admin in Auth

Apri:

`Authentication > Users`

Crea manualmente il primo utente staff/admin con email e password.

### 4.2 Recupera il suo UUID

Apri il dettaglio utente e copia il campo `UUID`.

### 4.3 Inserisci l'utente in `public.staff_users`

Esegui una query come questa:

```sql
insert into public.staff_users (id, full_name, role)
values ('UUID_AUTH_USER', 'Nome Admin', 'admin');
```

Da questo momento:

- Supabase Auth autentica l'utente;
- `public.staff_users` determina il ruolo applicativo.

---

## 5. Verifica il bucket foto

Il file [supabase/storage-policies.sql](/root/REBRANDING%20PLAYA/supabase/storage-policies.sql:1) crea o aggiorna il bucket:

- `client-photos`

Il bucket deve risultare:

- `private`

Uso previsto:

- upload solo staff;
- lettura solo staff;
- nessun accesso anon;
- nessuna foto cliente esposta pubblicamente.

---

## 6. Deploy Edge Functions

Le Edge Functions permettono di usare controlli server-side senza esporre `service_role` nel frontend.

Funzione foto cliente:

```bash
supabase functions deploy vip-client-photo
```

Funzione email QR prenotazione:

```bash
supabase functions deploy vip-booking-email
```

Secret necessarie per `vip-client-photo`:

- `SUPABASE_SERVICE_ROLE_KEY` oppure `SUPABASE_SECRET_KEYS`

Secret necessarie per `vip-booking-email`:

- `SUPABASE_SERVICE_ROLE_KEY` oppure `SUPABASE_SECRET_KEYS`
- `PUBLIC_SITE_URL`
- `RESEND_API_KEY`
- `BOOKING_EMAIL_FROM`
- `BOOKING_EMAIL_REPLY_TO` opzionale

Esempio senza valori reali:

```bash
supabase secrets set PUBLIC_SITE_URL=https://rebranding-playa.vercel.app
supabase secrets set RESEND_API_KEY=INSERISCI_CHIAVE_RESEND
supabase secrets set BOOKING_EMAIL_FROM="Fior d'Acqua VIP <vip@tuodominio.it>"
supabase secrets set BOOKING_EMAIL_REPLY_TO=info@tuodominio.it
```

Se Resend non e ancora configurato, `vip-booking-email` non blocca la prenotazione: restituisce `skipped` e il cliente vede comunque il QR in pagina.

---

## 7. Esegui il seed iniziale

Il file [supabase/seed.sql](/root/REBRANDING%20PLAYA/supabase/seed.sql:1) inserisce bonus base per i livelli VIP.

Inoltre prepara un layout piscina MVP con:

- layout `Fior d'Acqua Main Layout`
- postazioni seed tipo `A01`, `A02`, `B01`, `B02`

Non crea:

- clienti reali;
- staff reali;
- sessioni reali.

Serve come popolamento minimo dell'MVP, utile anche per testare la futura piantina prenotabile.

---

## 8. Prepara il file test

Apri [supabase/tests.sql](/root/REBRANDING%20PLAYA/supabase/tests.sql:1).

Prima di eseguirlo:

1. sostituisci `app.test_admin_uuid` con l'UUID reale del tuo admin Auth;
2. verifica che quell'UUID sia gia presente in `public.staff_users` con ruolo `admin`.

Poi esegui il file nello `SQL Editor`.

Nota pratica emersa dal test reale:

- `tests.sql` usa helper SQL di appoggio e blocchi `begin/rollback`;
- esegui il file completo in un unico run, non a pezzi, salvo debugging mirato.

---

## 9. Cosa deve funzionare prima del frontend

Prima di passare alle pagine HTML/JS, conferma:

- login staff via Supabase Auth;
- riconoscimento `is_staff()` e `is_admin()`;
- login cliente via `client_login(...)`;
- token cliente 24h in `client_sessions`;
- `get_client_profile(...)`;
- blocco clienti `DA_VERIFICARE`;
- blocco clienti `SOSPESO` e `ARCHIVIATO`;
- blocco booking/referral per `IN_OSSERVAZIONE`;
- `verify_client_by_staff(...)`;
- `get_booking_map_for_date(...)`;
- `admin_get_booking_map_for_date(...)`;
- `admin_upsert_spot_override(...)`;
- `create_spot_booking(...)`;
- `vip-client-photo` deployata o fallback foto accettato;
- `vip-booking-email` deployata o comportamento `skipped` accettato finche manca Resend;
- accesso anon diretto alle tabelle negato;
- storage `client-photos` non pubblico.

---

## 10. Configurazione frontend

Il file [frontend/assets/js/vip-club-config.js](/root/REBRANDING%20PLAYA/frontend/assets/js/vip-club-config.js:1) deve usare solo valori pubblici:

```js
window.FDA_VIP_CONFIG = window.FDA_VIP_CONFIG || {
  supabaseUrl: "https://TUO-PROGETTO.supabase.co",
  supabaseAnonKey: "TUO_SUPABASE_ANON_KEY",
  storageKey: "fda_vip_session_token",
  photoFunctionName: "vip-client-photo",
  bookingEmailFunctionName: "vip-booking-email",
  publicSiteUrl: "https://rebranding-playa.vercel.app",
  qrProviderUrl: "https://api.qrserver.com/v1/create-qr-code/"
};
```

Mai inserire:

- `service_role`

Nota operativa per il futuro frontend:

- `client_login(...)` ora restituisce una risposta controllata con:
  - `success`
  - `message`
  - `session_token`
  - `expires_at`
- il frontend dovra quindi gestire login fallito senza aspettarsi necessariamente un errore SQL.

---

## 11. Note operative

- `phone_normalized` e il riferimento tecnico per login e controlli.
- L'unicita del telefono e gestita sui profili non archiviati.
- `card_code` viene generato in modo atomico lato database.
- `referral_code` ha fallback anti-collisione.
- `prepare_client_record()` genera `card_code` e `referral_code` solo in `INSERT`; in `UPDATE`, se i campi arrivano vuoti, conserva i valori esistenti.
- La funzione `cleanup_expired_security_records()` ripulisce sessioni scadute e login attempts piu vecchi di 30 giorni.
- `verify_client_by_staff()` e stata corretta per evitare ambiguita sul nome `client_id` nel conteggio warning.
- Le nuove tabelle `beach_layouts`, `beach_spots` e `beach_spot_overrides` estendono il backend senza rompere le booking esistenti.
- `bookings` ora puo collegarsi a una postazione precisa tramite `spot_id` e snapshot (`spot_code_snapshot`, `umbrellas_snapshot`, `sunbeds_snapshot`).
- `create_spot_booking(...)` usa sempre `GIORNATA_INTERA` e blocca collisioni sulla stessa postazione e data.
- La mappa cliente usa solo RPC pubbliche controllate; le tabelle strutturali della piscina restano leggibili direttamente solo allo staff.
- `vip-verify.html` e una pagina statica ma viene oscurata lato UI da `vip-staff-guard.js`; la sicurezza dati resta in RLS/RPC.
- Le pagine staff sono `noindex` in Vercel e disallow in `robots.txt`.

---

## 12. Formula corretta

Stato atteso dopo il setup:

`Architettura solida, testata e pronta per MVP.`
