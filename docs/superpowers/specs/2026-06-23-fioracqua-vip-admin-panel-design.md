# Fior d'Acqua VIP Admin Panel Design

## Contesto

Il progetto dispone gia di:

- flusso cliente VIP con login card
- card digitale cliente
- richiesta booking VIP
- referral ospite
- verifica card staff tramite `verify_client_by_staff(...)`
- autenticazione staff browser con Supabase Auth

La nuova evoluzione riguarda l'estensione di `frontend/vip-verify.html` in una pagina staff unica che includa sia la verifica card sia l'operativita admin per creare e modificare profili cliente VIP.

## Obiettivo

Trasformare `vip-verify.html` in un pannello staff completo ma ancora coerente con l'MVP, capace di:

- verificare rapidamente una card
- cercare un cliente con qualsiasi dato disponibile
- creare un nuovo profilo cliente
- modificare un profilo esistente
- caricare o sostituire la foto cliente
- mostrare i codici generati e un'anteprima card

## Decisione Approvata

La struttura approvata e:

- stessa pagina `vip-verify.html`
- blocco verifica card nella parte alta
- blocco admin integrato nella parte bassa
- form unico che funziona sia in creazione sia in modifica
- ricerca libera da qualsiasi dato utile
- gestione foto nello stesso flusso admin

Non viene creata una pagina admin separata.

## Architettura UX

### Blocco 1. Accesso Staff

La pagina continua a dipendere da una sessione staff Supabase Auth nel browser.

Elementi previsti:

- stato sessione corrente
- link rapido a `vip-staff-login.html`
- pulsante logout staff

### Blocco 2. Verifica Card

Resta nella parte alta della pagina ed e pensato per il controllo rapido operativo.

Funzioni:

- input `card_code`
- lettura via RPC `verify_client_by_staff(...)`
- visualizzazione di:
  - nome
  - telefono
  - livello VIP
  - stato profilo
  - numero warning
  - foto cliente se disponibile

### Blocco 3. Ricerca Cliente

Subito sotto la verifica card viene introdotto un pannello di ricerca libera.

Comportamento:

- un solo input di ricerca
- la ricerca puo partire da:
  - nome
  - telefono
  - card code
  - referral code
- i risultati vengono mostrati come lista rapida cliccabile
- selezionando un cliente, il form admin si popola in modalita modifica

Per l'MVP non e richiesta una tabella completa con paginazione.

### Blocco 4. Form Admin Unico

Il form deve servire due modalita:

- `creazione`
- `modifica`

La modalita attiva deve essere esplicita nella UI.

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
- il submit cambia etichetta e logica:
  - `Crea profilo`
  - `Aggiorna profilo`
- deve esistere un pulsante `Reset` per tornare rapidamente alla modalita creazione

### Blocco 5. Gestione Foto

La foto cliente fa parte del form operativo.

Funzioni previste:

- upload nuova foto
- sostituzione foto esistente
- anteprima immediata
- collegamento a `photo_path`

Vincoli:

- bucket `client-photos` resta privato
- upload e lettura restano possibili solo con sessione staff valida

### Blocco 6. Output Operativo

Accanto o sotto il form viene mostrato un pannello di risposta admin.

Contenuti:

- `card_code`
- `referral_code`
- esito salvataggio
- anteprima sintetica della card cliente

Questo pannello serve a dare conferma immediata allo staff dopo creazione o modifica.

## Data Flow

### Verifica

1. Lo staff inserisce `card_code`
2. Il frontend invoca `verify_client_by_staff(...)`
3. Il risultato alimenta il blocco verifica

### Ricerca

1. Lo staff scrive un valore libero
2. Il frontend interroga una funzione o query staff dedicata
3. I risultati vengono mostrati come elenco
4. La selezione di un risultato popola il form

### Creazione

1. Lo staff compila il form
2. Il frontend invia i dati al backend staff
3. Il database genera automaticamente:
   - `card_code`
   - `referral_code`
4. Il frontend mostra esito e anteprima

### Modifica

1. Lo staff seleziona un cliente dai risultati
2. Il form passa in modalita modifica
3. Lo staff aggiorna i campi
4. Il frontend invia i dati al backend staff
5. La card non deve rigenerare accidentalmente i codici

### Foto

1. Lo staff seleziona file immagine
2. Il frontend carica su bucket `client-photos`
3. Il path finale viene salvato nel cliente
4. La preview viene aggiornata nel pannello admin

## Backend Necessario

Per questa fase frontend servono endpoint staff coerenti con l'architettura esistente.

Minimo necessario:

- funzione ricerca clienti staff
- funzione creazione cliente staff
- funzione aggiornamento cliente staff
- supporto upload foto staff via Storage

Se alcune funzioni non esistono ancora, l'implementazione frontend dovra introdurre placeholder controllati oppure procedere insieme al relativo backend staff.

## Gestione Errori

La pagina deve evitare errori generici e usare messaggi specifici.

Casi minimi:

- nessuna sessione staff attiva
- permessi insufficienti
- cliente non trovato
- validazione campi mancante
- upload foto fallito
- salvataggio profilo fallito

## Vincoli MVP

Fuori da questo step:

- storico modifiche
- gestione bonus avanzata
- tabella completa clienti con filtri complessi
- gestione ruoli staff dall'interfaccia

## File Coinvolti

- `frontend/vip-verify.html`
- `frontend/assets/js/vip-verify.js`
- `frontend/assets/js/vip-club.css`
- eventuali nuovi file JS dedicati al blocco admin
- eventuali funzioni backend staff necessarie

## Raccomandazione Implementativa

La soluzione migliore per il prossimo step e:

- mantenere `vip-verify.html` come shell unica
- estrarre in JS separato la logica admin per non gonfiare troppo `vip-verify.js`
- implementare prima il layout e gli stati UI
- poi collegare ricerca, create, update e foto in modo incrementale

## Esito

Design approvato per procedere con:

- verifica card staff in alto
- pannello admin integrato sotto
- ricerca libera
- form unico create/edit
- foto cliente inclusa
