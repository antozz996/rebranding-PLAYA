# AI Handoff - Fior d'Acqua VIP Club

> Ultimo aggiornamento: 2026-06-27
> Progetto: `rebranding-PLAYA`
> Produzione frontend: `https://rebranding-playa.vercel.app`
> Repository: `https://github.com/antozz996/rebranding-PLAYA`

Questo documento e il passaggio di consegne completo per qualunque AI o sviluppatore che debba continuare il lavoro. Leggerlo prima di modificare il progetto.

---

## 1. Visione del progetto

Fior d'Acqua VIP Club e un sistema VIP per la piscina Fior d'Acqua dentro il rebranding Playa Luna.

L'obiettivo e dare ai clienti VIP:

- landing editoriale del club;
- login con card code e telefono;
- card digitale personale con foto, livello e benefit;
- prenotazione VIP su postazione precisa se disponibile;
- invio referral/inviti;
- QR di prenotazione dopo la richiesta;
- check-in staff da QR con stato operativo `ARRIVATA`;
- email QR al cliente quando il provider email e configurato.

L'obiettivo per lo staff/admin e avere:

- login staff via Supabase Auth;
- controllo card riservato;
- dashboard clienti;
- creazione/modifica profili VIP;
- upload foto cliente;
- analytics/KPI;
- gestione prenotazioni;
- conferma/rifiuto/riapertura/completamento/no-show;
- gestione piscina;
- editor piantina permanente drag-and-drop;
- override giornalieri delle postazioni.

Stripe e volutamente fuori scope per ora. Deve restare in sospeso fino a decisione dedicata.

---

## 2. Stack tecnico

Frontend:

- HTML statico;
- CSS custom;
- Vanilla JavaScript;
- nessun framework;
- nessun build step obbligatorio;
- deploy su Vercel tramite rewrite da root verso `frontend/`.

Backend:

- Supabase Database/Postgres;
- Supabase Auth per staff/admin;
- RLS su tutte le tabelle operative;
- Supabase Storage privato per foto cliente;
- Supabase Edge Functions per accessi controllati a risorse sensibili;
- client Supabase JS via CDN nel frontend.

Servizi esterni opzionali:

- Resend per invio email QR prenotazione;
- QR Server API per immagine QR (`https://api.qrserver.com/v1/create-qr-code/`);
- Stripe futuro, non implementato.

---

## 3. URL principali

Pubblico:

- Home produzione: `https://rebranding-playa.vercel.app`
- Fior d'Acqua: `https://rebranding-playa.vercel.app/fiordacqua.html`
- VIP landing: `https://rebranding-playa.vercel.app/vip.html`
- Login cliente: `https://rebranding-playa.vercel.app/vip-login.html`
- Card cliente: `https://rebranding-playa.vercel.app/vip-card.html`
- Prenotazione cliente: `https://rebranding-playa.vercel.app/vip-booking.html`
- Referral cliente: `https://rebranding-playa.vercel.app/vip-referral.html`

Staff:

- Login staff: `https://rebranding-playa.vercel.app/vip-staff-login.html`
- Dashboard staff/admin: `https://rebranding-playa.vercel.app/vip-verify.html`

Nota sicurezza:

- `vip-verify.html` e una pagina statica Vercel, quindi il file HTML puo tecnicamente essere richiesto dal browser.
- I contenuti UI sono nascosti finche `vip-staff-guard.js` non conferma `is_staff()`.
- La sicurezza reale dei dati resta in Supabase: RLS, RPC protette e Storage privato.

---

## 4. Credenziali e segreti

Valori pubblici nel frontend:

- `supabaseUrl`;
- `supabaseAnonKey`.

Questi sono nel file:

- `frontend/assets/js/vip-club-config.js`

Non inserire mai nel frontend:

- service role key;
- chiavi Resend;
- chiavi Stripe;
- token GitHub;
- password staff.

Admin noto:

- Email: `afiman96@gmail.com`
- UID Supabase: `6ecd41b0-fbf8-46f6-8180-76c3a4c84bc5`
- Password: impostata e gestita in Supabase Auth, non documentarla qui.

---

## 5. Mappa file frontend VIP

Pagine:

- `frontend/vip.html`: landing pubblica VIP Club.
- `frontend/vip-login.html`: login cliente con `card_code + telefono`.
- `frontend/vip-card.html`: card digitale cliente.
- `frontend/vip-booking.html`: richiesta prenotazione con mappa e QR pass.
- `frontend/vip-checkin.html`: pagina staff riservata per leggere QR prenotazione, mostrare dati cliente/booking e segnare `ARRIVATA` o `NO_SHOW`.
- `frontend/vip-referral.html`: referral cliente.
- `frontend/vip-staff-login.html`: login staff.
- `frontend/vip-verify.html`: dashboard staff/admin unificata.

Script condivisi:

- `frontend/assets/js/vip-club-config.js`: configurazione Supabase, Edge Function, URL produzione, QR provider.
- `frontend/assets/js/vip-club-core.js`: namespace `window.FDAVip`, helper Supabase, sessioni cliente, URL staff/QR.
- `frontend/assets/js/vip-club.css`: design system VIP.

Script cliente:

- `frontend/assets/js/vip-login.js`: login cliente.
- `frontend/assets/js/vip-card.js`: profilo/card/foto cliente.
- `frontend/assets/js/vip-booking.js`: mappa prenotabile, creazione booking, QR, chiamata email.
- `frontend/assets/js/vip-referral.js`: referral.

Script staff/admin:

- `frontend/assets/js/vip-staff-auth.js`: login staff e verifica ruolo `is_staff()`.
- `frontend/assets/js/vip-staff-guard.js`: guard pagina staff, nasconde dashboard ai non staff.
- `frontend/assets/js/vip-verify.js`: verifica card e gestione tab dashboard.
- `frontend/assets/js/vip-checkin.js`: legge il QR booking, mostra dati cliente/prenotazione e aggiorna status `ARRIVATA`/`NO_SHOW`.
- `frontend/assets/js/vip-admin-dashboard.js`: namespace `window.FDAVipAdmin`, sessione staff/admin, KPI.
- `frontend/assets/js/vip-admin-clients.js`: lista clienti, filtri, bulk update, export CSV.
- `frontend/assets/js/vip-admin-form.js`: form crea/modifica cliente e upload foto.
- `frontend/assets/js/vip-admin-beach.js`: editor piscina, layout permanente, override giornalieri.
- `frontend/assets/js/vip-admin-bookings.js`: lista prenotazioni staff e cambi stato.

---

## 6. Backend Supabase

File SQL:

- `supabase/schema.sql`: tabelle, funzioni, trigger, indici, vincoli.
- `supabase/policies.sql`: grant, revoke, RLS policies, execute grants.
- `supabase/storage-policies.sql`: bucket privato `client-photos`.
- `supabase/seed.sql`: bonus e layout/postazioni iniziali.
- `supabase/tests.sql`: test SQL.
- `supabase/patch-booking-checkin.sql`: patch per database gia creati, aggiunge `ARRIVATA` e aggiorna occupazione postazione.

Edge Functions:

- `supabase/functions/vip-client-photo/index.ts`: restituisce signed URL temporanea per foto cliente, validando token cliente.
- `supabase/functions/vip-booking-email/index.ts`: invia email QR prenotazione, validando token cliente e booking.

Tabelle principali:

- `staff_users`: mappa utenti Supabase Auth a ruolo `staff` o `admin`.
- `clients`: profili VIP.
- `client_sessions`: sessioni cliente custom con token UUID.
- `login_attempts`: rate limit login cliente.
- `bookings`: prenotazioni.
- `referrals`: referral/inviti.
- `warnings`: warning cliente.
- `vip_bonuses`: benefit per livello.
- `beach_layouts`: layout piscina.
- `beach_spots`: postazioni layout permanente.
- `beach_spot_overrides`: override giornalieri.

RPC principali:

- `client_login(p_card_code, p_phone)`: login cliente.
- `get_client_profile(p_token)`: profilo/card cliente.
- `create_spot_booking(...)`: booking con postazione precisa.
- `create_referral_vip(...)`: referral cliente.
- `get_booking_map_for_date(p_booking_date)`: mappa pubblica cliente.
- `admin_get_booking_map_for_date(p_booking_date)`: mappa staff.
- `admin_upsert_spot_override(...)`: override giornaliero staff.
- `verify_client_by_staff(p_card_code)`: verifica card staff.
- `is_staff(p_user_id)`: helper autorizzazione.
- `is_admin(p_user_id)`: helper autorizzazione admin.

---

## 7. Regole sicurezza

Clienti:

- Login custom via `client_login`.
- Token cliente salvato in `sessionStorage`.
- Token valido 24 ore.
- Rate limit su tentativi falliti.
- Il cliente non legge direttamente le tabelle.
- Il cliente usa solo RPC controllate o Edge Functions validate.

Staff:

- Login via Supabase Auth email/password.
- L'essere `authenticated` non basta.
- L'utente deve essere presente in `public.staff_users`.
- Ruoli applicativi: `staff`, `admin`.
- `vip-staff-auth.js` rifiuta account Supabase non staff.
- `vip-staff-guard.js` blocca la UI staff se `is_staff()` e falso.
- RLS protegge tabelle e storage.

Admin:

- Solo `admin` puo salvare layout permanente piscina.
- Staff non admin puo visualizzare e lavorare sugli override/prenotazioni dove previsto.

SEO:

- `vip-staff-login.html` e `vip-verify.html` hanno header Vercel `X-Robots-Tag: noindex, nofollow, noarchive`.
- `frontend/robots.txt` disallow su pagine staff.

---

## 8. Stati cliente

Lifecycle:

```text
DA_VERIFICARE -> APPROVATO -> VIP
                         -> IN_OSSERVAZIONE
                         -> SOSPESO -> ARCHIVIATO
```

Regole:

- `DA_VERIFICARE`: login bloccato.
- `APPROVATO`: card, booking, referral.
- `VIP`: card, booking, referral.
- `IN_OSSERVAZIONE`: solo card, no booking/referral.
- `SOSPESO`: login bloccato.
- `ARCHIVIATO`: login bloccato.

Telefono:

- `phone` e visuale.
- `phone_normalized` e usato per login, ricerca, deduplica.
- Unicita logica sui profili non `ARCHIVIATO`.

Codici:

- `card_code`: formato tipo `FDA-2026-000001`, generazione atomica DB.
- `referral_code`: leggibile con fallback anti-collisione.
- In update, se `card_code` o `referral_code` arrivano vuoti, il DB preserva i valori vecchi.

---

## 9. Booking e QR

Flusso cliente:

1. Cliente apre `vip-booking.html`.
2. Il frontend legge il profilo con `get_client_profile`.
3. Solo `APPROVATO` e `VIP` possono prenotare.
4. Cliente sceglie data.
5. Frontend chiama `get_booking_map_for_date`.
6. Cliente seleziona postazione disponibile.
7. Frontend chiama `create_spot_booking`.
8. La booking nasce con stato `RICHIESTA`.
9. Il frontend mostra il pass QR.
10. Il frontend prova a inviare email via `vip-booking-email`.

QR:

- Il QR contiene un link staff del tipo:

```text
https://rebranding-playa.vercel.app/vip-checkin.html?booking=<BOOKING_ID>&date=<YYYY-MM-DD>
```

- Se aperto da staff autenticato, apre il check-in della prenotazione e mostra dati cliente, card, telefono, stato, postazione, note e azioni operative.
- Se aperto da non staff, mostra il guard e richiede login staff.

Email:

- Funzione: `supabase/functions/vip-booking-email/index.ts`
- Provider previsto: Resend.
- Se il provider non e configurato, la funzione restituisce `skipped` e la prenotazione resta valida.
- Se il cliente non ha email, la funzione restituisce `skipped`.

Variabili Edge Function necessarie:

```text
SUPABASE_SERVICE_ROLE_KEY oppure SUPABASE_SECRET_KEYS
RESEND_API_KEY
BOOKING_EMAIL_FROM
BOOKING_EMAIL_REPLY_TO opzionale
PUBLIC_SITE_URL=https://rebranding-playa.vercel.app
```

---

## 10. Prenotazioni staff

Tab dashboard:

- `Verifica`: controllo card.
- `Clienti`: CRM clienti e form profilo.
- `Gestione piscina`: layout permanente e override giornalieri.
- `Prenotazioni`: elenco richieste e prenotazioni.

Booking status:

```text
RICHIESTA -> CONFERMATA -> ARRIVATA -> COMPLETATA
         -> RIFIUTATA
         -> ANNULLATA
         -> NO_SHOW
```

Azioni staff nella tab `Prenotazioni`:

- `Conferma`: `RICHIESTA` -> `CONFERMATA`.
- `Arrivata`: `RICHIESTA`/`CONFERMATA` -> `ARRIVATA`.
- `Rifiuta`: libera la postazione perche lo status esce dagli attivi.
- `Riapri`: riporta a `RICHIESTA`.
- `Completa`: chiude positivamente.
- `No show`: chiude come mancata presentazione.
- `Salva nota`: aggiorna `staff_notes`.
- `Apri cliente`: porta al profilo cliente.
- `Gestione piscina`: porta agli override giornalieri.

La postazione e considerata occupata se esiste booking `RICHIESTA`, `CONFERMATA` o `ARRIVATA` sulla stessa data/postazione.

---

## 11. Gestione piscina

Layout permanente:

- Tab: `Gestione piscina` -> `Layout permanente`.
- Solo admin salva.
- Funzioni UI: crea, duplica, elimina, drag, resize, rotazione, modifica campi.
- Salvataggio su `beach_spots`.

Override giornalieri:

- Tab: `Gestione piscina` -> `Override giornalieri`.
- Staff puo impostare stato/capienza/note su singola data.
- Tabella: `beach_spot_overrides`.

Stati postazione:

- `DISPONIBILE`
- `BLOCCATA`
- `MANUTENZIONE`
- `RISERVATA`
- `OCCUPATA` e calcolato quando esiste booking attiva.

---

## 12. Deploy

Frontend Vercel:

- Config: `vercel.json`.
- Root produzione: `https://rebranding-playa.vercel.app`.
- Rewrite principali mappano `/pagina.html` verso `/frontend/pagina.html`.

Comandi tipici:

```bash
vercel --prod
```

Supabase Edge Functions:

```bash
supabase functions deploy vip-client-photo
supabase functions deploy vip-booking-email
```

Impostazione segreti Edge Function:

```bash
supabase secrets set PUBLIC_SITE_URL=https://rebranding-playa.vercel.app
supabase secrets set RESEND_API_KEY=INSERISCI_CHIAVE_RESEND
supabase secrets set BOOKING_EMAIL_FROM="Fior d'Acqua VIP <vip@tuodominio.it>"
supabase secrets set BOOKING_EMAIL_REPLY_TO=info@tuodominio.it
```

Non scrivere i valori reali delle secret nei file del repository.

---

## 13. Checklist test manuale

Cliente:

- Login con card/telefono valido.
- Login `DA_VERIFICARE` bloccato.
- Card mostra nome, livello, stato, benefit.
- Card mostra foto se caricata.
- `IN_OSSERVAZIONE` vede card ma non prenota.
- Booking mostra piantina.
- Booking blocca postazioni occupate/bloccate.
- Booking crea richiesta `RICHIESTA`.
- Dopo booking appare QR.
- QR link porta a `vip-checkin.html?booking=...&date=...`.
- Email mostra messaggio corretto: inviata, skipped o non configurata.

Staff:

- Account non staff non entra in dashboard.
- Account staff entra in `vip-verify.html`.
- Verifica card funziona.
- Dashboard clienti carica.
- Creazione cliente funziona.
- Modifica cliente funziona.
- Upload foto funziona.
- Tab prenotazioni carica.
- Conferma/rifiuto/riapertura funzionano.
- Tab gestione piscina carica.
- Override giornaliero funziona.

Admin:

- `is_admin()` true per admin.
- Layout permanente editabile.
- Salvataggio layout permanente funziona.
- Staff non admin vede layout ma non salva.

---

## 14. Cosa manca

Da fare prima di considerare il progetto completo al 100%:

- deploy e test reale `vip-booking-email` con Resend;
- QA mobile reale completo;
- eventuale pin versione CDN `@supabase/supabase-js`;
- paginazione clienti oltre 200 record;
- Stripe/pagamenti;
- eventuale QR provider self-hosted se non si vuole dipendere da `api.qrserver.com`;
- dominio definitivo e canonical finali se diverso da Vercel.

---

## 15. Regole per future AI

Prima di modificare:

- leggere questo file;
- leggere `docs/operativo-vip-club.md`;
- controllare `git status --short`;
- non committare `.venv`, PDF temporanei, backup o token;
- non usare service role nel frontend;
- non disattivare RLS per "risolvere" errori;
- non rendere pubblico il bucket `client-photos`;
- non trasformare `vip-verify.html` in pagina cliente;
- mantenere Stripe fuori scope finche richiesto esplicitamente.

Quando si cambia Supabase:

- aggiornare SQL file o creare migrazione coerente;
- verificare `security definer` e `set search_path = public`;
- aggiornare docs;
- testare RLS/RPC.

Quando si cambia frontend:

- mantenere stile premium editoriale Fior d'Acqua;
- evitare duplicazioni tra tab;
- proteggere ogni vista staff con `vip-staff-guard.js`;
- verificare mobile;
- verificare route Vercel.
