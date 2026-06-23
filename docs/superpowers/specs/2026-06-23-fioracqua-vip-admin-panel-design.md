# Fior d'Acqua VIP Admin Dashboard Design

## Contesto

Il progetto dispone gia di:

- flusso cliente VIP con login card
- card digitale cliente
- richiesta booking VIP
- referral ospite
- verifica card staff tramite `verify_client_by_staff(...)`
- autenticazione staff browser con Supabase Auth
- pagina `vip-verify.html` gia avviata come strumento staff

La nuova evoluzione approvata estende `frontend/vip-verify.html` da semplice tool di verifica a dashboard staff completa, mantenendo una singola pagina ma con struttura modulare.

## Obiettivo

Trasformare `vip-verify.html` in una mini CRM dashboard per lo staff VIP, capace di coprire in un solo flusso:

- verifica card rapida
- overview KPI e analytics
- ricerca cliente con qualsiasi dato
- elenco completo clienti
- creazione nuovo profilo/card
- modifica profilo esistente
- gestione foto cliente
- azioni massive sui clienti
- export CSV

## Decisioni Approvate

Le decisioni consolidate sono:

- una sola pagina: `vip-verify.html`
- struttura modulare, non pagina “monolite” caotica
- dashboard completa: operativo + commerciale + controllo
- ricerca clienti libera da qualsiasi dato utile
- form unico che supporta sia `creazione` sia `modifica`
- elenco completo clienti presente nella dashboard
- azioni massive incluse nell'MVP staff
- azioni massive approvate:
  - cambio stato
  - note staff rapide
  - export CSV

Non viene creata una pagina admin separata.

## Direzione Scelta

Tra le opzioni esplorate, la scelta approvata e:

- stessa pagina `vip-verify.html`
- verifica card nella parte alta
- dashboard admin completa sotto, organizzata a blocchi netti

Questa soluzione permette di rispettare la richiesta “tutto in una pagina” senza sacrificare chiarezza e scalabilita.

## Architettura UX

### Blocco 1. Header Staff

Il blocco superiore della pagina deve mostrare il contesto operativo.

Elementi:

- stato sessione staff
- utente staff attivo
- accesso a `vip-staff-login.html`
- logout staff
- eventuale scorciatoia alle azioni principali

Scopo:

- evitare errori di permesso poco chiari
- rendere evidente in quale contesto operativo si trova lo staff

### Blocco 2. KPI Dashboard

Subito sotto l'header deve comparire una fascia KPI sintetica.

Le metriche approvate devono coprire tre famiglie:

#### Operativo

- clienti totali
- clienti attivi
- ultimi profili creati
- ultime modifiche

#### Commerciale

- booking richiesti
- booking confermati
- referral generati
- referral approvati

#### Controllo

- warning attivi
- clienti in osservazione
- clienti sospesi
- profili incompleti o da verificare

La visualizzazione deve essere leggibile a colpo d'occhio, senza sembrare una dashboard finanziaria o un pannello freddo.

### Blocco 3. Quick Actions

La dashboard deve offrire subito azioni operative ad alta frequenza.

Azioni previste:

- `Nuovo profilo`
- `Reset form`
- `Export CSV`
- `Cambio stato rapido` sui selezionati
- `Nota staff rapida` sui selezionati

Scopo:

- rendere il pannello utile anche in giornate operative veloci
- evitare di costringere lo staff ad aprire piu viste

### Blocco 4. Verifica Card

La verifica card resta una funzione primaria e non viene rimossa.

Funzioni:

- input `card_code`
- supporto querystring `?code=...`
- invocazione di `verify_client_by_staff(...)`
- visualizzazione di:
  - nome
  - telefono
  - livello VIP
  - stato profilo
  - numero warning
  - foto cliente se disponibile

Questa sezione deve restare sempre accessibile e leggibile anche se il resto della dashboard cresce.

### Blocco 5. Workspace Admin

Questa e la sezione di lavoro principale per creare e modificare profili.

La struttura approvata e:

- ricerca cliente
- risultati cliccabili
- form unico create/edit
- gestione foto
- riepilogo output

#### Ricerca Cliente

Un solo input di ricerca deve accettare:

- nome
- telefono
- `card_code`
- `referral_code`
- email

I risultati devono apparire come elenco o mini-tabella cliccabile.

Selezionando un cliente:

- il form si popola
- la UI passa in modalita `modifica`
- l'anteprima card e il riepilogo si aggiornano

#### Form Unico Create/Edit

Il form serve entrambe le modalita:

- `Nuovo profilo`
- `Modifica profilo`

La modalita attiva deve essere evidente in UI.

Campi approvati:

- `full_name`
- `phone`
- `email`
- `birth_date`
- `vip_level`
- `status`
- `privacy_accepted`
- `marketing_accepted`
- `notes`
- `photo`

Comportamento:

- in creazione i campi partono vuoti
- in modifica i campi vengono precaricati
- il submit cambia etichetta:
  - `Crea profilo`
  - `Aggiorna profilo`
- deve esistere un `Reset` veloce per tornare alla creazione

#### Gestione Foto

La foto fa parte del workflow admin nello stesso pannello.

Funzioni previste:

- upload nuova foto
- sostituzione foto esistente
- anteprima immediata
- aggiornamento `photo_path`

Vincoli:

- bucket `client-photos` resta privato
- upload e lettura possibili solo in sessione staff valida

#### Output Operativo

Accanto o sotto il form deve esistere un riepilogo immediato.

Contenuti:

- `card_code`
- `referral_code`
- esito salvataggio
- anteprima sintetica card

Questo blocco deve dare allo staff la sensazione di “profilo pronto” senza costringerlo a cambiare vista.

### Blocco 6. Elenco Completo Clienti

La dashboard deve includere una tabella clienti completa, non solo risultati rapidi di ricerca.

Funzioni approvate:

- ricerca libera
- filtri
- ordinamento
- selezione multipla
- click su riga per aprire in modifica

#### Filtri minimi

- stato
- livello VIP
- presenza warning
- ha foto / non ha foto
- data creazione

#### Ordinamenti minimi

- piu recenti
- nome
- livello VIP
- stato

#### Uso

- consultazione avanzata
- selezione clienti
- attivazione azioni massive

Per questa fase non e obbligatoria la paginazione avanzata, ma la tabella va progettata in modo compatibile con un successivo upgrade.

### Blocco 7. Azioni Massive

Le azioni massive approvate per l'MVP sono:

- cambio stato
- nota staff rapida
- export CSV

Comportamento:

- si attivano su clienti selezionati dalla tabella
- devono mostrare chiaramente il numero di record coinvolti
- devono chiedere conferma almeno per cambio stato multiplo

### Blocco 8. Analitiche

Le analitiche devono essere presenti ma organizzate per famiglie, non mescolate.

#### Operativo

- totale clienti
- nuovi profili
- ultime card create
- ultime modifiche

#### Commerciale

- booking richiesti
- booking confermati
- referral generati
- referral approvati

#### Controllo

- warning attivi
- clienti in osservazione
- clienti sospesi
- profili non completi o da verificare

La dashboard deve quindi essere “completa” ma gerarchica: prima KPI, poi tabella e workspace, poi analitiche di supporto.

## Data Flow

### Verifica Card

1. Lo staff inserisce `card_code`
2. Il frontend invoca `verify_client_by_staff(...)`
3. Il risultato alimenta il blocco verifica

### Ricerca Cliente

1. Lo staff inserisce una query libera
2. Il frontend invoca una funzione staff dedicata
3. Il backend restituisce risultati sintetici
4. Lo staff seleziona un cliente
5. Il form passa in modalita modifica

### Creazione Profilo

1. Lo staff compila il form
2. Il frontend invia i dati al backend staff
3. Il database genera automaticamente:
   - `card_code`
   - `referral_code`
4. Il frontend aggiorna riepilogo e anteprima

### Modifica Profilo

1. Lo staff seleziona il cliente
2. Aggiorna il form
3. Il frontend invia i dati al backend staff
4. I codici esistenti non devono rigenerarsi accidentalmente

### Foto Cliente

1. Lo staff seleziona il file
2. Il frontend carica su bucket `client-photos`
3. Il path viene salvato nel cliente
4. Preview e card si aggiornano

### Azioni Massive

1. Lo staff seleziona piu clienti
2. Sceglie l'azione:
   - stato
   - nota
   - export
3. Il frontend invia la richiesta bulk al backend
4. La tabella e i KPI si aggiornano

### Analytics

1. Al caricamento pagina il frontend richiede KPI e dati sintetici
2. Eventuali azioni create/update/bulk aggiornano i blocchi

## Backend Necessario

Per sostenere questa dashboard servono endpoint staff dedicati.

### Minimo necessario

- `verify_client_by_staff(...)` esistente
- `search_clients_by_staff(...)`
- `list_clients_by_staff(...)`
- `create_client_by_staff(...)`
- `update_client_by_staff(...)`
- `bulk_update_clients_by_staff(...)`
- `get_admin_dashboard_stats(...)`

### Export CSV

Due strategie compatibili:

- export client-side da dataset gia filtrato
- funzione backend staff che restituisce dati CSV-ready

Per l'MVP va bene anche la prima, se il dataset della vista e gia completo e controllato.

## Gestione Errori

La dashboard deve evitare errori generici.

Casi minimi:

- nessuna sessione staff attiva
- permessi insufficienti
- cliente non trovato
- ricerca vuota senza risultati
- validazione campi mancante
- upload foto fallito
- salvataggio profilo fallito
- bulk update fallito
- export non disponibile

## Vincoli MVP

Fuori per questa fase:

- storico modifiche
- audit log completo
- gestione bonus avanzata da dashboard
- ruoli staff configurabili dalla UI
- workflow approval multi-step

## File Coinvolti

### Frontend

- `frontend/vip-verify.html`
- `frontend/assets/js/vip-verify.js`
- `frontend/assets/js/vip-club.css`
- `frontend/assets/js/vip-admin-dashboard.js`
- `frontend/assets/js/vip-admin-clients.js`
- `frontend/assets/js/vip-admin-form.js`
- `frontend/assets/js/vip-admin-bulk.js`

### Backend

- nuove funzioni staff nel backend Supabase
- supporto storage foto staff

## Raccomandazione Implementativa

L'implementazione migliore e:

1. mantenere `vip-verify.html` come shell unica
2. separare il JS per dominio funzionale
3. costruire prima layout e stati UI
4. integrare poi:
   - KPI
   - ricerca clienti
   - form create/edit
   - foto
   - tabella completa
   - azioni massive
   - analytics

Questo ordine evita che `vip-verify.js` diventi ingestibile e permette una crescita ordinata della dashboard.

## Esito

Design approvato per procedere con:

- dashboard staff unica in `vip-verify.html`
- verifica card
- KPI e analytics
- ricerca clienti libera
- elenco completo clienti
- form unico create/edit
- gestione foto
- azioni massive:
  - cambio stato
  - note rapide
  - export CSV
