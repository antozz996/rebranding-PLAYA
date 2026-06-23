# Frontend VIP Setup

## File Coinvolti

- [frontend/fiordacqua.html](/root/REBRANDING%20PLAYA/frontend/fiordacqua.html:1)
- [frontend/vip.html](/root/REBRANDING%20PLAYA/frontend/vip.html:1)
- [frontend/vip-login.html](/root/REBRANDING%20PLAYA/frontend/vip-login.html:1)
- [frontend/vip-card.html](/root/REBRANDING%20PLAYA/frontend/vip-card.html:1)
- [frontend/assets/js/vip-club-config.js](/root/REBRANDING%20PLAYA/frontend/assets/js/vip-club-config.js:1)
- [supabase/functions/vip-client-photo/index.ts](/root/REBRANDING%20PLAYA/supabase/functions/vip-client-photo/index.ts:1)

## Configurazione Minima

Prima di testare il frontend VIP con Supabase reale, aggiorna:

[frontend/assets/js/vip-club-config.js](/root/REBRANDING%20PLAYA/frontend/assets/js/vip-club-config.js:1)

Sostituisci i placeholder con i valori veri:

```js
window.FDA_VIP_CONFIG = window.FDA_VIP_CONFIG || {
  supabaseUrl: "https://TUO-PROGETTO.supabase.co",
  supabaseAnonKey: "TUO_SUPABASE_ANON_KEY",
  storageKey: "fda_vip_session_token",
  photoFunctionName: "vip-client-photo"
};
```

## Comportamento Atteso

- `fiordacqua.html` mostra il teaser VIP sotto la hero.
- `vip.html` racconta il club in forma editoriale.
- `vip-login.html` usa la RPC `client_login(...)`.
- `vip-card.html` usa la RPC `get_client_profile(...)`.
- `vip-card.html` prova anche a richiamare la Edge Function `vip-client-photo` per ottenere una signed URL breve della foto cliente.
- il token cliente viene salvato in `sessionStorage`.

## Foto Cliente Nella Card

Per mostrare la foto cliente senza rendere pubblico il bucket `client-photos`, deploya la Edge Function:

```bash
supabase functions deploy vip-client-photo
```

La funzione usa le secret di Supabase in ambiente Edge e restituisce al frontend solo una signed URL temporanea.

Se la funzione non e ancora deployata, la card mostra comunque un fallback con iniziali del cliente.

## Test Rapido

1. apri `vip-login.html`
2. inserisci `card_code` e telefono di un cliente test
3. verifica redirect su `vip-card.html`
4. controlla stato profilo e bonus mostrati
5. controlla che la foto compaia se `photo_path` e valorizzato
6. prova refresh pagina su `vip-card.html`
7. prova logout con il pulsante `Esci`

## Nota Importante

Il frontend non contiene `service_role` e non deve mai contenerla.
