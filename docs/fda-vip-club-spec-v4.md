# Fior d'Acqua VIP Club - Specifica V4

## Stato del documento

Questo documento consolida il master prompt originale e chiude le incongruenze emerse durante l'audit tecnico finale.

Questa V4 e la base approvata per il passaggio successivo:

1. backend Supabase;
2. test sicurezza;
3. frontend admin;
4. frontend cliente;
5. integrazione nel sito statico esistente.

Non genera ancora frontend definitivo.

---

## 1. Obiettivo confermato

Realizzare il sistema `Fior d'Acqua VIP Club` come mini web app integrata in un sito statico, con:

- frontend statico HTML/CSS/Vanilla JS;
- backend dati e sicurezza su Supabase;
- staff autenticato con Supabase Auth;
- clienti non autenticati con Supabase Auth;
- accesso cliente tramite `card_code + telefono`;
- sessione cliente temporanea custom;
- verifica accesso via QR Code;
- gestione clienti, prenotazioni, referral e segnalazioni.

---

## 2. Architettura confermata

- Sito statico deployabile via FTP/cPanel.
- Nessun framework frontend.
- Nessun backend Node.js o PHP obbligatorio su cPanel.
- Uso frontend limitato a `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- Nessuna `service_role key` nel frontend.
- Sicurezza demandata a:
  - schema SQL;
  - grant/revoke;
  - RLS;
  - RPC `security definer`;
  - Supabase Auth per staff;
  - bucket storage privato.

---

## 3. Chiusura incongruenze V4

### 3.1 `vip.html`

`vip.html` entra ufficialmente nell'MVP come landing pubblica del VIP Club.

Contenuti minimi:

- presentazione del programma;
- vantaggi del club;
- spiegazione della card digitale;
- CTA verso `vip-login.html`;
- CTA verso richiesta invito / referral;
- richiamo alla prenotazione normale tramite Spiagge.it.

Regola:

- il VIP Club e un canale parallelo;
- non sostituisce la prenotazione standard del sito.

### 3.2 `admin-settings.html`

`admin-settings.html` non fa parte del core MVP operativo.

Decisione V4:

- la pagina esiste solo come placeholder oppure viene rinviata a fase 2;
- non richiede implementazione completa nel backend MVP.

Funzioni future possibili:

- gestione livelli VIP;
- gestione bonus;
- testi card;
- parametri prenotazione;
- gestione staff avanzata lato admin.

### 3.3 `referrals`

La tabella `referrals` viene corretta con separazione chiara tra note cliente e valutazione staff.

Campi rilevanti:

- `referred_notes text`:
  note inserite dal cliente quando invita un ospite.
- `evaluation text`:
  campo interno staff per valutazioni operative.

### 3.4 `bookings`

La tabella `bookings` non usa piu un solo campo `notes`.

Decisione V4:

- `client_notes text`
- `staff_notes text`

Obiettivo:

- separare le informazioni scritte dal cliente dalle annotazioni interne operative.

### 3.5 `phone_normalized`

La tabella `clients` viene estesa con:

- `phone_normalized text not null`

Uso obbligatorio:

- login cliente;
- ricerche admin;
- controllo duplicati;
- rate limiting;
- confronti server-side.

Regola:

- `phone` resta il numero visuale;
- `phone_normalized` e il formato tecnico usato in logica e controlli.

Assunzione operativa V4:

- in MVP ogni profilo VIP deve avere un telefono univoco a livello logico;
- l'unicita va applicata preferibilmente ai soli profili non archiviati;
- un profilo `ARCHIVIATO` non deve bloccare per sempre il riuso del numero;
- la politica viene implementata nello schema SQL con vincolo coerente a questa regola.

### 3.6 `card_code`

Il formato resta:

`FDA-2026-000001`

Decisione V4:

- la generazione deve essere atomica lato database;
- non puo dipendere da logica frontend;
- deve reggere inserimenti simultanei.

Implementazione attesa nel backend:

- sequence dedicata oppure tabella contatore dedicata;
- funzione SQL che genera il codice in modo sicuro.

### 3.7 `referral_code`

Il formato leggibile resta di tipo:

`FDA-MARIO-124`

Decisione V4:

- il codice deve avere fallback anti-collisione;
- `unique` resta obbligatorio;
- in caso di collisione si usa suffisso numerico incrementale o porzione random controllata.

### 3.8 Pulizia sicurezza

Serve una funzione dedicata:

- `public.cleanup_expired_security_records()`

Compiti:

- eliminare sessioni cliente scadute;
- eliminare `login_attempts` piu vecchi del periodo definito.

Decisione V4:

- retention iniziale login attempts: 30 giorni;
- la funzione puo essere richiamata in `client_login`;
- in futuro potra essere agganciata a cron/manual job.

### 3.9 `vip_bonuses`

La tabella resta nello schema MVP.

Uso V4:

- semplice;
- seed iniziale statico;
- nessuna logica avanzata obbligatoria nella prima iterazione.

In MVP:

- puo restare staff-only a livello dati;
- eventuale esposizione lato cliente puo essere rimandata o gestita in sola lettura.

### 3.10 `sessionStorage`

Conferma V4:

- `sessionStorage` resta la scelta per il token cliente nell'MVP;
- non usare `localStorage`;
- nessun token persistente oltre la sessione del browser.

---

## 4. Struttura pagine MVP chiarita

### Pubbliche / cliente

- `fiordacqua.html`
  sito esistente con sezione VIP Club integrata.
- `vip.html`
  landing pubblica VIP Club.
- `vip-login.html`
  login cliente via card code + telefono.
- `vip-card.html`
  card digitale cliente.
- `vip-booking.html`
  richiesta prenotazione VIP.
- `vip-referral.html`
  invito ospite / referral.
- `vip-verify.html`
  pagina di verifica usata dallo staff tramite QR.

### Admin / staff

- `admin-login.html`
  login staff.
- `admin-dashboard.html`
  dashboard operativa.
- `admin-clienti.html`
  lista clienti.
- `admin-client-new.html`
  creazione cliente.
- `admin-client-detail.html`
  dettaglio cliente.
- `admin-prenotazioni.html`
  gestione prenotazioni.
- `admin-referral.html`
  gestione referral.
- `admin-settings.html`
  placeholder o fase 2, non core MVP.

---

## 5. Schema dati V4

## Tabelle confermate

- `staff_users`
- `clients`
- `client_sessions`
- `login_attempts`
- `bookings`
- `referrals`
- `warnings`
- `vip_bonuses`

## Delta V4 sulle tabelle

### `clients`

Campi aggiuntivi / chiariti:

- `phone_normalized text not null`

Campi gia previsti e confermati:

- `photo_path` visibile solo a staff/verifica;
- `notes` solo staff;
- `card_code unique`;
- `referral_code unique`.

### `bookings`

Sostituire:

- `notes`

con:

- `client_notes text`
- `staff_notes text`

### `referrals`

Aggiungere:

- `referred_notes text`

Mantenere:

- `evaluation text` come campo interno staff.

---

## 6. Sicurezza V4

### Staff

- accesso tramite Supabase Auth;
- ruolo applicativo letto da `public.staff_users`;
- `authenticated` non equivale automaticamente a staff operativo;
- i permessi reali dipendono da `public.is_staff(auth.uid())` e `public.is_admin(auth.uid())`.

### Clienti

- nessun Supabase Auth;
- login con RPC `public.client_login(p_card_code text, p_phone text)`;
- ritorno di token temporaneo;
- token in `sessionStorage`;
- tutte le operazioni cliente passano da RPC;
- nessun accesso diretto alle tabelle.

Regola definitiva stati cliente:

- `DA_VERIFICARE`: login cliente bloccato;
- `APPROVATO`: login consentito, booking e referral consentiti;
- `VIP`: login consentito, booking e referral consentiti;
- `IN_OSSERVAZIONE`: login consentito solo per card/profilo, booking e referral bloccati;
- `SOSPESO`: login bloccato;
- `ARCHIVIATO`: login bloccato.

### RPC obbligatorie confermate

- `public.client_login(...)`
- `public.get_client_profile(...)`
- `public.create_booking_vip(...)`
- `public.create_referral_vip(...)`
- `public.verify_client_by_staff(...)`
- `public.cleanup_expired_security_records()`

### Rate limiting

Confermato:

- blocco temporaneo dopo 5 tentativi falliti in 15 minuti;
- messaggi sempre generici;
- controllo su `phone_normalized` e `card_code`.

---

## 7. Storage e QR

### Storage foto

- bucket `client-photos`
- `private`
- upload, lettura, update, delete solo staff

### QR

Il QR punta a:

`/vip-verify.html?code=FDA-2026-000124`

Non deve mai:

- esporre UUID interni;
- aprire pagine admin direttamente.

Regola pratica V4:

- se staff non autenticato, redirect a login admin;
- il redirect di ritorno deve essere URL-encoded correttamente.

---

## 8. MVP backend da generare dopo questa V4

Nel prossimo step si genera solo il backend:

- `supabase/schema.sql`
- `supabase/policies.sql`
- `supabase/storage-policies.sql`
- `supabase/seed.sql`
- `supabase/tests.sql`
- `docs/setup-supabase.md`
- `docs/test-checklist.md`

Non generare ancora frontend completo.

---

## 9. Ordine di esecuzione confermato

1. chiusura specifica V4;
2. generazione backend Supabase;
3. verifica schema, RLS, RPC, storage;
4. test SQL e test manuali;
5. solo dopo frontend admin;
6. poi frontend cliente;
7. poi integrazione in `fiordacqua.html`.

---

## 10. Note finali operative

### Resta valido

- niente framework;
- niente build obbligatoria;
- niente service role nel frontend;
- nessun uso di `client_id` come autenticazione;
- card cliente senza foto nell'MVP;
- sito statico esistente da non rompere.

### Posizionamento prodotto

Il sistema deve apparire:

- premium;
- professionale;
- affidabile;
- elegante;
- coerente con una struttura family premium come Fior d'Acqua.

### Formula corretta da usare

Non dichiarare il progetto "sicuro al 100%".

Usare:

`Architettura solida, testata e pronta per MVP.`
