# AI Handoff Addendum: Regole di Prenotazione e Piantina Personalizzata (Circular Markers)

Questo documento descrive le ultime modifiche apportate al progetto per aggiungere la gestione delle regole di prenotazione dal pannello staff e la piantina personalizzata con marker circolari (pallini).

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

## 2. Piantina Personalizzata con Marker Circolari (Pallini)

Per allineare il layout della piscina all'immagine reale fornita dal cliente (piscina a fagiolo con ombrelloni), le postazioni sono state convertite in **pallini circolari colorati**:

1.  **Immagine di Sfondo**:
    *   L'immagine della piantina è stata salvata in [pool-layout-bg.png](file:///root/REBRANDING%20PLAYA/frontend/assets/images/pool-layout-bg.png).
2.  **Stili CSS Canvas** ([vip-club.css](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-club.css)):
    *   Sia `.vip-layout-editor-canvas` (editor permanente staff) che `.vip-booking-map-grid` (mappa prenotazione cliente ed overrides staff) hanno ora dimensioni fisse di `1200x760px` con l'immagine di sfondo caricata in `cover` e centrata.
    *   Aggiunto `overflow-x: auto` alla classe contenitore `.vip-booking-map-wrap` per consentire lo scorrimento orizzontale fluido su dispositivi mobili.
3.  **Marker Circolari (Pallini)**:
    *   Le classi `.vip-beach-spot` e `.vip-layout-spot` sono state ridefinite per essere cerchi perfetti di `44x44px` con testo centrato.
    *   Nelle viste mappa vengono nascosti i dettagli secondari (etichette, note, capienza lettini) all'interno del pulsante (mostrando solo il codice dell'ombrellone es. "A01"), rendendo il layout estremamente pulito e premium.
    *   I dettagli completi continuano ad essere mostrati nel box di riepilogo in basso quando una postazione viene cliccata.
    *   Le maniglie di ridimensionamento e rotazione del layout editor (`.vip-layout-handle`, `.vip-layout-rotate-handle`) sono state nascoste (`display: none`), in modo che lo staff possa solo trascinare e posizionare i cerchi.
4.  **Logica JS**:
    *   Le postazioni vengono posizionate in modo assoluto in base a `x` e `y` salvati nel database.
    *   Questa logica è implementata in:
        *   Staff Layout Editor: [vip-admin-beach.js](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-admin-beach.js) (`renderLayoutCanvas`).
        *   Staff Daily Overrides Map: [vip-admin-beach.js](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-admin-beach.js) (`renderMap`).
        *   Client Booking Map: [vip-booking.js](file:///root/REBRANDING%20PLAYA/frontend/assets/js/vip-booking.js) (`renderMap`).

---

## 3. Codifica Cromatico-Branding dei Pallini

*   **Disponibile (`DISPONIBILE`)**: Pallino **Verde** solido (`#28a745`) con testo bianco.
*   **Prenotato (`OCCUPATA`)**: Pallino **Grigio** solido (`#6c757d`) con testo bianco.
*   **Riservato dallo Staff (`RISERVATA`)**: Pallino **Arancione** solido (`#ffb347`) con testo bianco.
*   **Bloccato / Rifiutato (`BLOCCATA`)**: Pallino **Rosso** solido (`#ef476f`) con testo bianco.
*   **Manutenzione (`MANUTENZIONE`)**: Pallino **Viola** solido (`#5d6ad2`) con testo bianco.
*   **Selezionato**: Pallino ingrandito (`scale(1.15)`) con un alone giallo brillante di evidenziazione.
