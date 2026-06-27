# AI Handoff Addendum: Regole di Prenotazione e Piantina Personalizzata (Absolute Positioning)

Questo documento descrive le ultime modifiche apportate al progetto per aggiungere la gestione delle regole di prenotazione dal pannello staff e la piantina personalizzata a posizionamento assoluto.

---

## 1. Schema Database & Regole (`booking_rules`)

È stata creata la tabella `public.booking_rules` tramite la patch [patch-booking-rules.sql](file:///root/REBRANDING%20PLAYA/supabase/patch-booking-rules.sql).

### Struttura della Tabella:
*   `key` (text, primary key) - Identificativo della regola.
*   `value` (text) - Valore configurato.
*   `label` (text) - Nome visualizzato nel form.
*   `description` (text) - Descrizione della regola.

### Regole Configurate (Seed Default):
1.  `booking_enabled`: Stato globale delle prenotazioni online (true/false).
2.  `max_days_advance`: Numero massimo di giorni di anticipo per cui un cliente può prenotare (es: 30).
3.  `same_day_cutoff_hour`: Ora limite oltre la quale non è consentito prenotare online per il giorno stesso (es: 12 per le 12:00).
4.  `max_guests_per_spot`: Numero massimo di persone totali (adulti + bambini) consentite per singola postazione (es: 4).

---

## 2. Piantina Personalizzata con Posizionamento Assoluto

Per allineare il layout della piscina all'immagine reale fornita dal cliente (piscina a fagiolo/curva con ombrelloni), è stato implementato il posizionamento assoluto in tutte le viste:

1.  **Immagine di Sfondo**:
    *   L'immagine della piantina è stata salvata in [pool-layout-bg.png](file:///root/REBRANDING%20PLAYA/frontend/assets/images/pool-layout-bg.png).
2.  **Stili CSS Canvas** ([vip-club.css](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-club.css)):
    *   Sia `.vip-layout-editor-canvas` (editor permanente staff) che `.vip-booking-map-grid` (mappa prenotazione cliente ed overrides staff) hanno ora dimensioni fisse di `1200x760px` con l'immagine di sfondo caricata in `cover` e centrata.
    *   Aggiunto `overflow-x: auto` alla classe contenitore `.vip-booking-map-wrap` per consentire lo scorrimento orizzontale fluido su dispositivi mobili senza compromettere il design.
3.  **Rendering dei Bottoni**:
    *   Invece di raggruppare per righe flex, le postazioni vengono disegnate sulla mappa come bottoni posizionati in modo assoluto tramite le proprietà `x`, `y`, `width`, `height` e `rotation` registrate nel database.
    *   Questa logica è stata implementata in:
        *   Staff Layout Editor: [vip-admin-beach.js](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-admin-beach.js) (`renderLayoutCanvas`).
        *   Staff Daily Overrides Map: [vip-admin-beach.js](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-admin-beach.js) (`renderMap`).
        *   Client Booking Map: [vip-booking.js](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-booking.js) (`renderMap`).

---

## 3. Codifica Cromatico-Branding delle Postazioni

I colori delle postazioni sulla mappa (sia lato cliente che staff) sono stati aggiornati:
*   **Postazioni prenotate (`OCCUPATA`)**: diventano di colore **Grigio** (classe `.is-booked`).
*   **Postazioni disponibili (`DISPONIBILE`)**: diventano di colore **Verde** premium (classe `.is-available`).
*   Aggiunto il chip di legenda "Prenotata" (Grigio) in [vip-booking.html](file:///root/REBRANDING%20PLAYA/frontend/vip-booking.html) e [vip-verify.html](file:///root/REBRANDING%20PLAYA/frontend/vip-verify.html).
