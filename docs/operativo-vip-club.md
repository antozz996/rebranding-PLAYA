# Operativo VIP Club — Fior d'Acqua

> Ultimo aggiornamento: 2026-06-23 18:10
> Autore sessione: Antigravity (continuazione lavoro Codex)
> Branch: `main`
> Remote: `https://github.com/antozz996/rebranding-PLAYA.git`

---

## Stato Generale

**Completamento: ~82%**

Il sistema VIP Club di Fior d'Acqua e un gestionale integrato per clienti VIP della piscina, costruito come sito statico (HTML/CSS/Vanilla JS) con backend Supabase. Non usa framework frontend, non ha build step, e deployabile via FTP/cPanel.

---

## Cosa e stato fatto (completato)

### Backend Supabase (100%)

- [x] Schema SQL completo: 12 tabelle, trigger, indici, vincoli
  - File: `supabase/schema.sql` (1478 righe)
- [x] RLS policies su tutte le tabelle
  - File: `supabase/policies.sql` (350 righe)
- [x] Storage policies per bucket `client-photos`
  - File: `supabase/storage-policies.sql`
- [x] Seed data di test
  - File: `supabase/seed.sql`
- [x] Test SQL automatici
  - File: `supabase/tests.sql`
- [x] RPC functions (security definer):
  - `client_login` — login custom card_code + telefono
  - `get_client_profile` — profilo + bonus VIP
  - `create_booking_vip` — booking generico
  - `create_spot_booking` — booking su postazione specifica con advisory lock
  - `create_referral_vip` — referral invita amico
  - `get_booking_map_for_date` — mappa postazioni (vista pubblica)
  - `admin_get_booking_map_for_date` — mappa admin (dati completi)
  - `admin_upsert_spot_override` — override giornaliero postazioni
  - `verify_client_by_staff` — verifica card rapida
  - `cleanup_expired_security_records` — pulizia sessioni/tentativi

### Frontend Cliente (100%)

- [x] Landing VIP: `frontend/vip.html`
- [x] Login cliente: `frontend/vip-login.html` + `frontend/assets/js/vip-login.js`
- [x] Card digitale: `frontend/vip-card.html` + `frontend/assets/js/vip-card.js`
- [x] Booking con mappa reale: `frontend/vip-booking.html` + `frontend/assets/js/vip-booking.js`
- [x] Referral invita amico: `frontend/vip-referral.html` + `frontend/assets/js/vip-referral.js`

### Frontend Staff (100%)

- [x] Login staff: `frontend/vip-staff-login.html` + `frontend/assets/js/vip-staff-auth.js`
- [x] Pagina unificata admin: `frontend/vip-verify.html` (610 righe)
  - Verifica card rapida: `frontend/assets/js/vip-verify.js`
  - Dashboard KPI (8 metriche): `frontend/assets/js/vip-admin-dashboard.js`
  - Gestione clienti (ricerca + filtri + tabella + bulk): `frontend/assets/js/vip-admin-clients.js`
  - Form CRUD cliente (crea/modifica + upload foto): `frontend/assets/js/vip-admin-form.js`
  - Mappa spiaggia admin (override giornalieri + lista booking): `frontend/assets/js/vip-admin-beach.js`
- [x] Export CSV clienti

### Libreria condivisa

- [x] Config Supabase: `frontend/assets/js/vip-club-config.js`
- [x] Core client: `frontend/assets/js/vip-club-core.js` (namespace `window.FDAVip`)
- [x] CSS design system: `frontend/assets/js/vip-club.css` (1501 righe)

---

## File modificati da Codex (non committati)

Questi file sono stati modificati da Codex nell'ultima sessione e NON sono ancora su GitHub:

### Modificati (tracked)

| File | Righe cambiate | Descrizione |
|------|---------------|-------------|
| `frontend/assets/js/vip-booking.js` | +424 -52 | Booking con mappa reale e selezione spot |
| `frontend/assets/js/vip-club.css` | +350 | Stili mappa spiaggia, spot, legenda, selezione |
| `frontend/vip-booking.html` | +78 | HTML mappa prenotabile con legenda e riepilogo |
| `frontend/vip-verify.html` | +149 | Sezione admin beach gestione giornaliera |
| `skills-lock.json` | +12 | Lock file aggiornato |

### Nuovi (untracked)

| File | Descrizione |
|------|-------------|
| `frontend/assets/js/vip-admin-beach.js` | Logica admin mappa spiaggia (595 righe) |
| `.agents/skills/supabase-postgres-best-practices/` | Skill Supabase Postgres (da agent) |
| `.agents/skills/supabase/` | Skill Supabase (da agent) |
| `Fiordacqua.png` | Immagine (da valutare se committare) |
| `ftftftfftft.pdf` | File temporaneo (NON committare) |

---

## Credenziali e accessi

### Supabase

- **URL**: Presente in `frontend/assets/js/vip-club-config.js`
- **Anon Key**: Presente in `frontend/assets/js/vip-club-config.js`
- **service_role key**: MAI nel frontend

### Staff Admin

- **Email**: `afiman96@gmail.com`
- **UID Supabase**: `6ecd41b0-fbf8-46f6-8180-76c3a4c84bc5`
- **Password**: impostata dall'utente in Supabase Auth
- **Ruolo**: admin (in `staff_users`)

### Cliente Test

- **Card code**: `FDA-2099-900001`
- **Telefono**: `+39 333 111 0001`
- **Stato**: da verificare nel seed

---

## Cosa manca (da fare)

### Priorita alta

- [ ] **Commit e push su GitHub** — codice Codex pronto localmente ma non pushato
- [ ] **Edge Function `vip-client-photo`** — directory `supabase/functions/vip-client-photo/` esiste ma e vuota. La card cliente chiama `supabaseClient.functions.invoke(functionName)` che fallisce. Senza questa function la foto nella card cliente non funziona.
- [ ] **QA responsive** — verificare tutte le pagine VIP su mobile reale
- [ ] **Deploy live** — pubblicare su server di produzione

### Priorita media

- [ ] **Validazione `returnTo`** — in `vip-staff-auth.js` il parametro `returnTo` non e validato contro URL esterni (potenziale open redirect)
- [ ] **Conferma azioni bulk** — `applyBulkActions()` esegue senza dialog di conferma
- [ ] **Paginazione clienti** — attualmente limitata a 200 con `.limit(200)`, nessuna paginazione
- [ ] **Filtro warning server-side** — il filtro per warning e applicato client-side dopo il limit, puo tagliare risultati

### Priorita bassa (roadmap futura)

- [ ] Editor drag-and-drop piantina spiaggia
- [ ] Integrazione pagamenti Stripe
- [ ] Polling/realtime sulla mappa prenotazioni
- [ ] Version pinning su CDN Supabase JS (`@2` non pinned)
- [ ] Spostare `vip-club.css` da `assets/js/` a `assets/css/`
- [ ] Pulizia file temporanei: `ftftftfftft.pdf`, `test_page_temp.html`
- [ ] Rimuovere link `localhost` in `culto.html`
- [ ] Fix CSS duplicati in `damai.html` e `culto.html`
- [ ] Fix widget WhatsApp triplicato in `damai.html`

---

## Architettura — Riferimento rapido

### Autenticazione

- **Staff**: Supabase Auth (email/password), signup disabilitato
- **Clienti**: custom login via RPC `client_login(card_code, phone)` → token UUID 24h in `sessionStorage`
- **Rate limiting**: 5 tentativi falliti in 15 min → blocco temporaneo
- **Messaggi errore**: sempre generici (no information leak)

### Namespace JS globali

| Namespace | File | Ruolo |
|-----------|------|-------|
| `window.FDAVip` | `vip-club-core.js` | Client Supabase, sessione, normalizzazione, UI helpers |
| `window.FDAVipAdmin` | `vip-admin-dashboard.js` | Stato admin, sessione staff, KPI, selezione clienti |

### Custom Events (comunicazione moduli admin)

| Evento | Emesso da | Consumato da |
|--------|-----------|-------------|
| `fda-vip-admin:selection-changed` | dashboard | clients |
| `fda-vip-admin:editing-client-changed` | dashboard | form |
| `fda-vip-admin:reset-form` | dashboard | form |
| `fda-vip-admin:data-changed` | form, clients | clients, beach, dashboard |

### Stati cliente (lifecycle)

```
DA_VERIFICARE → APPROVATO → VIP
                         → IN_OSSERVAZIONE
                         → SOSPESO → ARCHIVIATO
```

- `DA_VERIFICARE`: no login
- `APPROVATO` / `VIP`: login + card + booking + referral
- `IN_OSSERVAZIONE`: login + card (sola lettura), no booking/referral
- `SOSPESO` / `ARCHIVIATO`: no login

### Booking lifecycle

```
RICHIESTA → CONFERMATA → COMPLETATA
         → RIFIUTATA
         → ANNULLATA
         → NO_SHOW
```

Le booking nascono come `RICHIESTA`, lo staff conferma manualmente.

---

## Mappa dei file VIP

```
frontend/
├── vip.html                        # Landing VIP Club
├── vip-login.html                  # Login cliente
├── vip-card.html                   # Card digitale
├── vip-booking.html                # Prenotazione con mappa (MODIFICATO)
├── vip-referral.html               # Invita amico
├── vip-staff-login.html            # Login staff
├── vip-verify.html                 # Admin unificato (MODIFICATO)
└── assets/
    ├── js/
    │   ├── vip-club-config.js      # URL + anon key Supabase
    │   ├── vip-club-core.js        # FDAVip namespace
    │   ├── vip-club.css            # Design system VIP (MODIFICATO)
    │   ├── vip-login.js            # Logica login
    │   ├── vip-card.js             # Logica card
    │   ├── vip-booking.js          # Logica booking + mappa (MODIFICATO)
    │   ├── vip-referral.js         # Logica referral
    │   ├── vip-staff-auth.js       # Logica auth staff
    │   ├── vip-verify.js           # Logica verifica card
    │   ├── vip-admin-dashboard.js  # FDAVipAdmin namespace + KPI
    │   ├── vip-admin-clients.js    # Gestione lista clienti
    │   ├── vip-admin-form.js       # Form CRUD cliente
    │   └── vip-admin-beach.js      # Admin mappa spiaggia (NUOVO)
    └── logos/
        └── fiordacqua-vip-logo.png # Logo VIP Club

supabase/
├── schema.sql                      # Schema completo (1478 righe)
├── policies.sql                    # RLS policies (350 righe)
├── storage-policies.sql            # Bucket policies
├── seed.sql                        # Dati test
├── tests.sql                       # Test automatici
└── functions/
    └── vip-client-photo/           # VUOTA — da implementare

docs/
├── fda-vip-club-spec-v4.md         # Specifica approvata
├── setup-supabase.md               # Guida setup
├── test-checklist.md               # Checklist QA backend
└── operativo-vip-club.md           # QUESTO FILE
```

---

## Log operazioni sessione corrente (Antigravity, 2026-06-23)

| Ora | Azione |
|-----|--------|
| 18:08 | Ricevuto passaggio da Codex. Verificato stato git: 5 file modificati, 1 nuovo, nessun commit pendente |
| 18:10 | Creato questo file operativo `docs/operativo-vip-club.md` |
| 18:10 | Prossimo step: commit + push su GitHub |

---

## Note per il prossimo agente

1. **Prima di qualsiasi modifica**: leggere questo file per lo stato aggiornato
2. **Il codice di Codex e gia pronto** nei file locali ma NON committato — fare `git add + commit + push` come prima cosa
3. **Il file `ftftftfftft.pdf`** e spazzatura — non committare
4. **Le skill `.agents/`** sono generate dall'agent, valutare se committare
5. **L'immagine `Fiordacqua.png`** in root va spostata in `frontend/assets/` se serve, altrimenti ignorare
6. **Il CSS e dentro `assets/js/`** — funziona ma e confusionario, da spostare in futuro
7. **Supabase e gia configurato e attivo** — non servono operazioni backend per testare il frontend
