# Fior d'Acqua VIP Beach Booking Map Design

## Contesto

Il progetto dispone gia di:

- backend Supabase MVP per clienti VIP, booking e referral
- frontend VIP con login card, card digitale e booking request
- dashboard staff in `frontend/vip-verify.html`
- autenticazione staff browser con Supabase Auth

La nuova evoluzione introduce la gestione delle postazioni spiaggia con:

- disponibilita giornaliera amministrabile dallo staff
- piantina cliente prenotabile su postazione precisa
- compatibilita futura con editor drag-and-drop admin
- compatibilita futura con pagamento Stripe

Il lavoro richiesto adesso riguarda solo il sottoprogetto:

- inventario postazioni
- override giornalieri admin
- piantina prenotabile MVP
- aggancio reale delle booking alle postazioni

Non rientrano in questo step:

- editor drag-and-drop completo
- pagamento Stripe
- motore orario a fasce o per intervalli liberi

## Obiettivo

Consentire allo staff di decidere, giorno per giorno, quali postazioni siano prenotabili e con quale configurazione, e consentire al cliente VIP di prenotare una postazione precisa se disponibile per l'intera giornata.

L'MVP deve:

- usare solo prenotazioni `GIORNATA_INTERA`
- permettere al cliente di scegliere una postazione precisa
- bloccare doppie prenotazioni lato backend
- mantenere storico booking tramite snapshot dei dati della postazione
- restare coerente con il linguaggio premium/editoriale di Fior d'Acqua

## Decisioni Approvate

Le decisioni consolidate sono:

- approccio scelto: `mappa base + override giornalieri`
- la piantina drag-and-drop viene rimandata a una fase successiva
- il cliente prenota una `postazione precisa`, non una zona aggregata
- la disponibilita dell'MVP e solo per `intero giorno`
- la configurazione della postazione deve poter essere modificata dall'admin ogni giorno
- Stripe verra integrato dopo la stabilizzazione della mappa prenotabile

## Direzione Scelta

Tra le opzioni esplorate, la scelta approvata e:

- layout base della spiaggia
- singole postazioni codificate
- override giornalieri per disponibilita e configurazione
- booking cliente legata a una singola postazione

Questa soluzione consente di ottenere subito una mappa prenotabile reale senza dover costruire adesso l'editor visuale completo.

## Architettura Dati

### 1. `beach_layouts`

Tabella per definire il layout base attivo della spiaggia.

Campi previsti:

- `id`
- `name`
- `version`
- `is_active`
- `notes`
- `created_at`
- `updated_at`

Per l'MVP e sufficiente un solo layout attivo, ma la tabella deve gia supportare versioni future.

### 2. `beach_spots`

Tabella delle postazioni base della mappa.

Campi previsti:

- `id`
- `layout_id`
- `spot_code` tipo `A01`
- `label`
- `zone`
- `row_name`
- `sort_order`
- `base_umbrellas`
- `base_sunbeds`
- `base_status`
- `created_at`
- `updated_at`

Campi da predisporre per fase futura, anche se non ancora usati dalla UI MVP:

- `x`
- `y`
- `width`
- `height`
- `rotation`
- `shape`
- `z_index`

### 3. `beach_spot_overrides`

Tabella delle modifiche giornaliere decise dallo staff.

Una riga rappresenta una specifica combinazione:

- `spot_id`
- `service_date`

Campi previsti:

- `id`
- `spot_id`
- `service_date`
- `status`
- `umbrellas`
- `sunbeds`
- `admin_note`
- `created_by`
- `created_at`
- `updated_at`

Valori `status` MVP:

- `DISPONIBILE`
- `BLOCCATA`
- `MANUTENZIONE`
- `RISERVATA`

L'override sostituisce il valore base solo per quella giornata.

### 4. Estensione di `public.bookings`

La tabella `bookings` esistente non va sostituita: va estesa.

Campi da aggiungere:

- `spot_id uuid null references public.beach_spots(id)`
- `spot_code_snapshot text`
- `umbrellas_snapshot integer`
- `sunbeds_snapshot integer`

Regole:

- `booking_date` resta il giorno di servizio della prenotazione
- `time_slot` viene mantenuto per compatibilita, ma per booking mappa sara sempre `GIORNATA_INTERA`
- gli snapshot mantengono memoria storica della configurazione venduta

## Regole di Disponibilita

La disponibilita reale di una postazione dipende da tre strati:

1. stato base della postazione
2. eventuale override giornaliero
3. presenza di booking attive sulla stessa data

Una postazione e prenotabile solo se:

- esiste nel layout attivo
- il suo stato finale del giorno e `DISPONIBILE`
- non esiste una booking attiva con stessa `spot_id` e stessa `booking_date`

### Stati booking che bloccano la postazione

Per il giorno richiesto, la postazione deve essere considerata non disponibile se esiste una booking con stato:

- `RICHIESTA`
- `CONFERMATA`

Non devono invece bloccare una nuova prenotazione:

- `RIFIUTATA`
- `ANNULLATA`
- `NO_SHOW`

`COMPLETATA` e storico di una giornata passata e non influisce su date future.

## Protezione Anti-Collisione

Il frontend non e la fonte di verita per la disponibilita.

La conferma finale deve avvenire solo lato backend attraverso RPC dedicata.

Flusso obbligatorio:

1. il cliente seleziona una postazione in UI
2. il frontend invia `booking_date` e `spot_id`
3. il backend ricontrolla disponibilita in tempo reale
4. il backend inserisce la booking solo se la postazione e ancora libera

Se due utenti provano a prenotare la stessa postazione, solo una richiesta deve riuscire.

La soluzione consigliata e:

- controllo server-side in RPC `create_spot_booking(...)`
- vincolo logico o indice mirato per impedire doppie assegnazioni attive sulla stessa data

## RPC Necessarie

### `get_booking_map_for_date(p_booking_date date)`

Funzione pubblica controllata che restituisce:

- layout attivo
- postazioni
- override del giorno
- stato finale prenotabile/non prenotabile
- configurazione finale del giorno

Questa funzione serve al frontend cliente.

### `admin_get_booking_map_for_date(p_booking_date date)`

Versione staff della mappa, con dati piu completi:

- stato interno
- override
- note staff
- eventuale booking collegata

### `admin_upsert_spot_override(...)`

Funzione staff per creare o aggiornare l'override di una postazione in una data.

Deve supportare:

- stato della postazione
- numero ombrelloni
- numero lettini
- nota staff

### `create_spot_booking(...)`

Funzione cliente per creare una booking su postazione precisa.

Responsabilita:

- validare il cliente
- verificare che il cliente sia in uno stato autorizzato a prenotare
- verificare che la postazione sia libera
- calcolare i dati finali della postazione
- salvare booking + snapshot
- restituire esito chiaro al frontend

## RLS e Sicurezza

Regole di accesso previste:

- `anon` e clienti:
  - nessun accesso diretto alle tabelle mappa
  - uso solo di RPC controllate
- `authenticated` staff:
  - lettura e modifica di layout, postazioni, override e booking secondo policy staff
- `admin`:
  - puo gestire versioni layout future e operazioni strutturali aggiuntive

Le funzioni critiche devono mantenere:

- `security definer`
- `set search_path = public`
- validazioni server-side complete

## UX Cliente

La pagina principale coinvolta e `frontend/vip-booking.html`.

Flusso cliente MVP:

1. selezione della data
2. caricamento della piantina del giorno
3. selezione di una postazione precisa
4. riepilogo configurazione selezionata
5. invio richiesta booking

### Comportamento Piantina Cliente

La piantina MVP non usa ancora coordinate libere trascinabili.

Sara basata su una rappresentazione ordinata per:

- `row_name`
- `sort_order`
- `zone`

Ogni postazione deve mostrare:

- codice
- stato visuale
- configurazione del giorno
- stato selezionato/disabilitato

Stati visuali minimi:

- disponibile
- occupata
- bloccata
- manutenzione
- selezionata

La UX deve restare coerente con il tono premium/editoriale di Fior d'Acqua, ma senza sacrificare la chiarezza operativa.

## UX Admin

La gestione staff verra integrata nella dashboard gia esistente in `frontend/vip-verify.html`, evitando una nuova pagina separata in questa fase.

### Blocchi Admin Nuovi

- selettore data operativa
- vista piantina staff del giorno
- pannello lista postazioni
- editor rapido della singola postazione
- elenco booking del giorno collegati alla mappa

### Azioni Admin Minime

Per ogni postazione e data, lo staff deve poter:

- impostare `DISPONIBILE`
- impostare `BLOCCATA`
- impostare `MANUTENZIONE`
- impostare `RISERVATA`
- modificare numero ombrelloni
- modificare numero lettini
- aggiungere nota staff

La stessa area deve mostrare se la postazione e gia collegata a una booking.

## Compatibilita con Fase 2

La fase 2 introdurra un editor admin drag-and-drop per modificare visivamente la mappa.

Per evitare refactor distruttivi, l'MVP deve gia essere compatibile con:

- coordinate assolute
- dimensioni personalizzate della postazione
- layering
- tipologie future diverse da ombrellone standard

Per questo i campi geometrici devono esistere o essere previsti nello schema gia da ora, anche se la UI iniziale non li usa pienamente.

## Compatibilita con Fase 3 Stripe

La fase Stripe verra introdotta solo dopo stabilizzazione di mappa e disponibilita.

Per prepararla correttamente:

- la booking deve gia avere un riferimento certo alla postazione
- gli snapshot della postazione devono esistere
- il flusso di prenotazione deve avere un punto unico server-side che poi potra evolvere in:
  - `hold`
  - `checkout`
  - `pagamento completato`

L'MVP attuale non deve implementare pagamenti, ma non deve neppure impedire questa evoluzione.

## Test Minimi Richiesti

### Backend

- mappa del giorno restituita correttamente con layout + override
- override giornaliero applicato solo alla data corretta
- booking su postazione disponibile creata correttamente
- tentativo doppia prenotazione bloccato
- booking `ANNULLATA` non blocca la disponibilita
- booking `RICHIESTA` e `CONFERMATA` bloccano la disponibilita

### Frontend Cliente

- il cliente vede solo postazioni prenotabili come selezionabili
- una postazione non disponibile non puo essere cliccata come prenotabile
- il riepilogo mostra codice e configurazione della postazione scelta

### Frontend Staff

- lo staff puo cambiare stato giornaliero di una postazione
- lo staff puo modificare lettini e ombrelloni del giorno
- lo staff vede la relazione tra postazione e booking
- una modifica admin si riflette nella mappa cliente dopo reload

## Ordine di Implementazione

L'ordine approvato per il sottoprogetto e:

1. estensione schema Supabase
2. RPC mappa/disponibilita/prenotazione
3. sezione admin disponibilita giornaliera
4. piantina cliente prenotabile
5. collegamento booking reale a postazione
6. test collisioni e disponibilita
7. Stripe in fase successiva
8. editor drag-and-drop in fase successiva

## Deliverable Attesi

Il sottoprogetto dovra produrre:

- aggiornamento backend Supabase
- nuove migration SQL
- test SQL aggiornati
- estensione dashboard staff
- estensione `vip-booking.html`
- piantina cliente responsive
- documentazione operativa minima

## Fuori Scope

Per evitare ambiguita, in questo step non sono inclusi:

- pagamento Stripe
- editor visuale drag-and-drop
- prezzi dinamici complessi
- multi-slot orari
- motore avanzato di ottimizzazione automatica delle assegnazioni
