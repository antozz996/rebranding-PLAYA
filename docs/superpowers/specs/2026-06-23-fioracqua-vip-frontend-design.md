# Frontend Design - Fior d'Acqua VIP Club

## Stato

Spec approvata a livello conversazionale il `2026-06-23`, pronta per revisione utente finale prima dell'implementazione.

## Obiettivo

Integrare il `Fior d'Acqua VIP Club` dentro l'esperienza esistente di [fiordacqua.html](/root/REBRANDING%20PLAYA/frontend/fiordacqua.html:1), mantenendo lo stesso linguaggio visivo del brand e collegando il nuovo frontend statico al backend Supabase gia validato.

Il frontend iniziale deve coprire solo il primo nucleo operativo:

- inserimento teaser VIP nella homepage esistente;
- landing pubblica del club;
- login cliente;
- card digitale cliente.

Booking e referral restano fuori da questa prima iterazione.

## Pagine In Scope

- [fiordacqua.html](/root/REBRANDING%20PLAYA/frontend/fiordacqua.html:1)
  pagina principale esistente, da estendere con teaser VIP.
- `vip.html`
  landing pubblica editoriale del VIP Club.
- `vip-login.html`
  accesso cliente via `card_code + telefono`.
- `vip-card.html`
  card digitale / dashboard cliente essenziale.

## Posizionamento Nella Home

Il VIP Club non nasce come minisito separato.

Nasce dentro la pagina principale esistente come:

- strip VIP compatta;
- posizionata subito sotto la hero;
- coerente con il tono attuale di Fior d'Acqua;
- abbastanza visibile da introdurre il club, ma senza rubare la scena alla CTA primaria di prenotazione.

Scelta approvata:

- opzione `A`
- teaser compatto appoggiato sotto la hero.

## Direzione Visiva

La direzione non crea un nuovo brand.

Deve:

- restare nello stile Fior d'Acqua;
- riprendere palette acquatica, tono family-premium e atmosfera estiva;
- aumentare la sensazione di esclusivita in modo leggero ed editoriale;
- evitare look troppo tech, troppo dark o troppo distante dalla home attuale.

Traduzione pratica:

- stessa famiglia estetica della home;
- elementi VIP piu curati, puliti e raffinati;
- copy breve, sicuro e aspirazionale;
- gerarchia semplice, non da dashboard amministrativa.

## Architettura Del Primo Flusso

Flusso pubblico e cliente:

1. utente entra in `fiordacqua.html`;
2. vede il teaser VIP sotto la hero;
3. puo scegliere:
   - `Scopri il VIP Club` -> `vip.html`
   - `Accedi alla card` -> `vip-login.html`
4. dopo login valido:
   - `vip-login.html` -> `vip-card.html`

La CTA esistente `Prenota ora` nella hero:

- resta dedicata a Spiagge.it;
- non viene sostituita;
- non viene confusa con il percorso VIP.

## Comportamento Delle Pagine

## 1. `fiordacqua.html`

Responsabilita:

- introdurre il VIP Club dentro la home esistente;
- offrire due ingressi chiari al flusso VIP;
- non appesantire la pagina.

Contenuto minimo del teaser:

- label o badge VIP;
- titolo corto;
- testo sintetico;
- CTA `Accedi alla card`;
- CTA `Scopri il VIP Club`.

## 2. `vip.html`

Responsabilita:

- spiegare il club in modo editoriale, non tecnico;
- raccontare vantaggi, funzionamento della card digitale e natura riservata del programma;
- portare l'utente al login oppure all'approfondimento.

Contenuti minimi:

- presentazione del programma;
- vantaggi del club;
- spiegazione della card digitale;
- CTA verso `vip-login.html`;
- richiamo discreto al fatto che la prenotazione standard del lido continua a vivere come canale parallelo.

## 3. `vip-login.html`

Responsabilita:

- eseguire il login cliente nel modo piu semplice possibile;
- ridurre attrito e dubbi;
- tradurre il backend in una UX elegante.

Campi:

- `card_code`
- `telefono`

Comportamento:

- invoca `client_login(card_code, phone)`;
- se `success = true`, salva `session_token` in `sessionStorage` e reindirizza a `vip-card.html`;
- se `success = false`, mostra il `message` del backend in modo controllato;
- non espone stack trace, errori SQL o dettagli tecnici.

## 4. `vip-card.html`

Responsabilita:

- mostrare la card digitale cliente;
- mostrare lo stato reale del profilo;
- dare continuita e prestigio all'accesso.

Contenuti minimi:

- nome cliente;
- codice card;
- livello VIP;
- stato profilo;
- bonus disponibili;
- messaggio dedicato in base allo stato.

Fuori scope in questa fase:

- form booking;
- form referral;
- area impostazioni;
- gestione avanzata profilo.

## Regole Di Stato Cliente

Le pagine frontend devono rispettare le regole backend gia validate:

- `VIP`: accesso consentito, card piena visibile.
- `APPROVATO`: accesso consentito, card piena visibile.
- `IN_OSSERVAZIONE`: accesso consentito solo alla card; booking e inviti non attivi.
- `DA_VERIFICARE`: login bloccato.
- `SOSPESO`: login bloccato.
- `ARCHIVIATO`: login bloccato.

Traduzione UX:

- stati bloccati fermati in `vip-login.html`;
- stato `IN_OSSERVAZIONE` gestito con messaggio elegante e non punitivo in `vip-card.html`.

## Integrazione Tecnica

Il frontend resta:

- statico HTML/CSS/Vanilla JS;
- deployabile via FTP/cPanel;
- collegato a Supabase solo con:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

Mai usare nel frontend:

- `service_role`

RPC e comportamento:

- `vip-login.html` usa `client_login(...)`
- `vip-card.html` usa `get_client_profile(...)`

Persistenza sessione:

- token cliente in `sessionStorage`
- nessun uso di `localStorage`

Scadenza o assenza token:

- se il token manca o non e piu valido, `vip-card.html` riporta a `vip-login.html`

## Error Handling

Il tono dei messaggi deve essere coerente con un club premium family-friendly:

- chiaro;
- sobrio;
- rassicurante;
- non tecnico.

Esempi di principio:

- login fallito -> messaggio corto e controllato;
- token scaduto -> invito a rientrare;
- stato limitato -> spiegazione educata, non aggressiva.

## Testing Del Primo Rilascio

Prima iterazione frontend considerata valida solo se risultano veri questi punti:

- teaser VIP visibile e coerente in `fiordacqua.html`;
- `vip.html` raggiungibile e coerente col brand;
- login valido funziona;
- login errato mostra messaggio corretto;
- `DA_VERIFICARE` bloccato;
- `IN_OSSERVAZIONE` entra ma vede solo card/stato;
- token scaduto rimanda al login;
- nessuna chiave sensibile esposta oltre `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## Non Obiettivi Di Questa Fase

Non fanno parte di questa implementazione iniziale:

- `vip-booking.html`
- `vip-referral.html`
- aree admin
- gestione bonus avanzata
- personalizzazioni profonde account cliente

## Decisione Finale

Il primo blocco da implementare e:

1. aggiornamento di `fiordacqua.html` con teaser VIP sotto hero;
2. creazione di `vip.html`;
3. creazione di `vip-login.html`;
4. creazione di `vip-card.html`;
5. integrazione con backend Supabase gia validato.

Questa sequenza minimizza il rischio, mantiene la continuita del brand e permette di testare subito il flusso reale cliente.
