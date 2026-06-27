# AI Handoff Addendum: Regole di Prenotazione e Personalizzazioni Colori

Questo documento descrive le ultime modifiche apportate al progetto per aggiungere la gestione delle regole di prenotazione dal pannello staff e la personalizzazione cromatica delle postazioni.

---

## 1. Schema Database & Regole (`booking_rules`)

È stata creata la tabella `public.booking_rules` tramite la patch [patch-booking-rules.sql](file:///root/REBRANDING%20PLAYA/supabase/patch-booking-rules.sql).

### Struttura della Tabella:
*   `key` (text, primary key) - Identificativo della regola.
*   `value` (text) - Valore configurato (salvato come stringa, convertito a runtime).
*   `label` (text) - Nome visualizzato nel form.
*   `description` (text) - Descrizione della regola.
*   `updated_at` (timestamptz) - Ultimo aggiornamento.

### Regole Configurate (Seed Default):
1.  `booking_enabled`: Stato globale delle prenotazioni online (true/false).
2.  `max_days_advance`: Numero massimo di giorni di anticipo per cui un cliente può prenotare (es: 30).
3.  `same_day_cutoff_hour`: Ora limite oltre la quale non è consentito prenotare online per il giorno stesso (es: 12 per le 12:00).
4.  `max_guests_per_spot`: Numero massimo di persone totali (adulti + bambini) consentite per singola postazione (es: 4).

### Sicurezza (RLS):
*   `SELECT` consentito a tutti (`anon`, `authenticated`) per consentire al form di prenotazione clienti di validare le regole.
*   `ALL` (Insert/Update/Delete) ristretto unicamente allo staff autenticato (`public.is_staff(auth.uid())`).

---

## 2. Pannello di Gestione Staff

*   **Interfaccia UI**: Aggiunto il sottotab **"Regole prenotazione"** all'interno della sezione *Gestione piscina* in [vip-verify.html](file:///root/REBRANDING%20PLAYA/frontend/vip-verify.html).
*   **Logica JS**: Gestito in [vip-admin-beach.js](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-admin-beach.js):
    *   `loadBookingRules()`: Legge le regole correnti da Supabase e popola i campi del modulo.
    *   `saveBookingRules()`: Effettua l'upsert dei valori modificati su Supabase in tempo reale.
    *   Abilitata la navigazione al sottotab `rules` nella funzione `setPoolTab()`.

---

## 3. Controlli e Validazioni lato Cliente (Booking)

Nel file [vip-booking.js](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-booking.js) sono state implementate le seguenti logiche di controllo basate sulle regole attive:
1.  **Blocco Globale**: Se `booking_enabled` è `false`, viene mostrato un avviso di sospensione e il modulo viene interamente disabilitato.
2.  **Limite Giorni di Anticipo**: L'attributo `max` dell'input data (`dateInput.max`) viene calcolato dinamicamente sommando i giorni di `max_days_advance` alla data odierna.
3.  **Ora Limite Odierna**: Se l'utente seleziona la data di oggi, il sistema verifica l'ora locale attuale. Se supera `same_day_cutoff_hour`, la mappa non viene caricata e viene mostrato un messaggio di errore ("Prenotazioni per oggi chiuse").
4.  **Limite Ospiti**: In fase di invio (`onSubmit`), viene validata la somma `adulti + bambini`. Se supera `max_guests_per_spot`, l'invio viene bloccato con un messaggio d'errore.

---

## 4. Codifica Cromatico-Branding delle Postazioni

Come richiesto dal cliente, i colori delle postazioni sulla mappa (sia lato cliente che staff) sono stati aggiornati per una migliore esperienza utente:

1.  **Postazioni Prenotate (`OCCUPATA`)**:
    *   Assegnazione della classe CSS `.is-booked`.
    *   Colore: **Grigio** (per indicare chiaramente che la postazione non è disponibile).
2.  **Postazioni Disponibili (`DISPONIBILE`)**:
    *   Assegnazione della classe CSS `.is-available`.
    *   Colore: **Verde** premium (per indicare che è selezionabile e prenotabile).
3.  **Aggiornamento Legenda**:
    *   Aggiunto il chip di legenda "Prenotata" (Grigio) in [vip-booking.html](file:///root/REBRANDING%20PLAYA/frontend/vip-booking.html) e [vip-verify.html](file:///root/REBRANDING%20PLAYA/frontend/vip-verify.html).
    *   Stili CSS definiti nel file globale [vip-club.css](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-club.css).
