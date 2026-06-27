# Frontend VIP Setup

## File Coinvolti

- [frontend/fiordacqua.html](/root/REBRANDING%20PLAYA/frontend/fiordacqua.html:1)
- [frontend/vip.html](/root/REBRANDING%20PLAYA/frontend/vip.html:1)
- [frontend/vip-login.html](/root/REBRANDING%20PLAYA/frontend/vip-login.html:1)
- [frontend/vip-card.html](/root/REBRANDING%20PLAYA/frontend/vip-card.html:1)
- [frontend/vip-booking.html](/root/REBRANDING%20PLAYA/frontend/vip-booking.html:1)
- [frontend/vip-referral.html](/root/REBRANDING%20PLAYA/frontend/vip-referral.html:1)
- [frontend/vip-staff-login.html](/root/REBRANDING%20PLAYA/frontend/vip-staff-login.html:1)
- [frontend/vip-verify.html](/root/REBRANDING%20PLAYA/frontend/vip-verify.html:1)
- [frontend/assets/js/vip-club-config.js](/root/REBRANDING%20PLAYA/frontend/assets/js/vip-club-config.js:1)
- [frontend/assets/js/vip-staff-guard.js](/root/REBRANDING%20PLAYA/frontend/assets/js/vip-staff-guard.js:1)
- [supabase/functions/vip-client-photo/index.ts](/root/REBRANDING%20PLAYA/supabase/functions/vip-client-photo/index.ts:1)
- [supabase/functions/vip-booking-email/index.ts](/root/REBRANDING%20PLAYA/supabase/functions/vip-booking-email/index.ts:1)

## Configurazione Minima

Prima di testare il frontend VIP con Supabase reale, aggiorna:

[frontend/assets/js/vip-club-config.js](/root/REBRANDING%20PLAYA/frontend/assets/js/vip-club-config.js:1)

Sostituisci i placeholder con i valori veri:

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

## Comportamento Atteso

- `fiordacqua.html` mostra il teaser VIP sotto la hero.
- `vip.html` racconta il club in forma editoriale.
- `vip-login.html` usa la RPC `client_login(...)`.
- `vip-card.html` usa la RPC `get_client_profile(...)`.
- `vip-card.html` prova anche a richiamare la Edge Function `vip-client-photo` per ottenere una signed URL breve della foto cliente.
- `vip-booking.html` permette la richiesta di prenotazione su postazione precisa quando disponibile.
- `vip-booking.html` genera un QR pass dopo la richiesta e prova a inviarlo via Edge Function `vip-booking-email`.
- `vip-referral.html` permette l'invito referral dal cliente abilitato.
- `vip-verify.html` e la dashboard staff: verifica card, gestione clienti, gestione piscina, prenotazioni e layout permanente.
- `vip-verify.html` e nascosta da `vip-staff-guard.js` finche `is_staff()` non conferma il ruolo.
- il token cliente viene salvato in `sessionStorage`.

## URL Live

Deploy Vercel attivo:

- `https://rebranding-playa.vercel.app/fiordacqua.html`
- `https://rebranding-playa.vercel.app/vip.html`
- `https://rebranding-playa.vercel.app/vip-login.html`
- `https://rebranding-playa.vercel.app/vip-card.html`
- `https://rebranding-playa.vercel.app/vip-booking.html`
- `https://rebranding-playa.vercel.app/vip-referral.html`
- `https://rebranding-playa.vercel.app/vip-staff-login.html`
- `https://rebranding-playa.vercel.app/vip-verify.html`

## Dashboard Staff

Per usare la dashboard:

1. accedi da `https://rebranding-playa.vercel.app/vip-staff-login.html`
2. apri `https://rebranding-playa.vercel.app/vip-verify.html`
3. usa i tab `Verifica`, `Clienti`, `Gestione piscina`, `Prenotazioni`

Il tab `Gestione piscina` contiene due sottosezioni:

- `Layout permanente`: editor drag-and-drop admin per creare, muovere, ridimensionare, ruotare, duplicare ed eliminare postazioni.
- `Override giornalieri`: gestione stato/capienza della singola giornata.

## Foto Cliente Nella Card

Per mostrare la foto cliente senza rendere pubblico il bucket `client-photos`, deploya la Edge Function:

```bash
supabase functions deploy vip-client-photo
```

La funzione usa le secret di Supabase in ambiente Edge e restituisce al frontend solo una signed URL temporanea.

Se la funzione non e ancora deployata, la card mostra comunque un fallback con iniziali del cliente.

## QR Prenotazione ed Email Cliente

Quando una prenotazione viene creata con `create_spot_booking(...)`, il frontend:

1. mostra un pass prenotazione;
2. genera un QR verso `vip-verify.html?tab=bookings&booking=<BOOKING_ID>&date=<YYYY-MM-DD>`;
3. prova a invocare la Edge Function `vip-booking-email`.

Deploy funzione:

```bash
supabase functions deploy vip-booking-email
```

Secret richieste per invio reale:

```bash
supabase secrets set PUBLIC_SITE_URL=https://rebranding-playa.vercel.app
supabase secrets set RESEND_API_KEY=INSERISCI_CHIAVE_RESEND
supabase secrets set BOOKING_EMAIL_FROM="Fior d'Acqua VIP <vip@tuodominio.it>"
supabase secrets set BOOKING_EMAIL_REPLY_TO=info@tuodominio.it
```

Se Resend o l'email cliente non sono configurati, la funzione risponde `skipped`: il QR resta visibile e la prenotazione resta valida.

## Test Rapido

1. apri `vip-login.html`
2. inserisci `card_code` e telefono di un cliente test
3. verifica redirect su `vip-card.html`
4. controlla stato profilo e bonus mostrati
5. controlla che la foto compaia se `photo_path` e valorizzato
6. prova refresh pagina su `vip-card.html`
7. prova logout con il pulsante `Esci`
8. crea una prenotazione e verifica comparsa QR
9. apri il link QR da browser non staff e verifica che appaia il guard staff
10. accedi staff e verifica che la tab prenotazioni si filtri sulla booking

## Nota Importante

Il frontend non contiene `service_role` e non deve mai contenerla.
