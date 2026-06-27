document.addEventListener("DOMContentLoaded", function () {
    const statusBox = document.getElementById("vipCheckinStatus");
    const statusPill = document.getElementById("vipCheckinStatusPill");
    const emptyNode = document.getElementById("vipCheckinEmpty");
    const resultNode = document.getElementById("vipCheckinResult");
    const markArrivedButton = document.getElementById("vipCheckinMarkArrived");
    const noShowButton = document.getElementById("vipCheckinNoShow");
    const refreshButton = document.getElementById("vipCheckinRefresh");
    const openBookingsLink = document.getElementById("vipCheckinOpenBookings");
    const openClientLink = document.getElementById("vipCheckinOpenClient");

    const state = {
        bookingId: "",
        booking: null,
        client: null,
        spot: null
    };

    initialize();

    async function initialize() {
        const guardResult = await window.FDAVipStaffGuard.requireStaffPage({
            returnTo: "vip-checkin.html" + window.location.search + window.location.hash
        });

        if (!guardResult.allowed) {
            return;
        }

        state.bookingId = getBookingIdFromUrl();
        bindEvents();

        if (!state.bookingId) {
            renderEmpty("QR non valido.", "Il link non contiene un parametro booking valido.");
            window.FDAVip.showStatus(
                statusBox,
                "Apri questa pagina da un QR prenotazione o da un link generato dal sistema.",
                "error"
            );
            setStatusPill("Non valida", "is-watch");
            return;
        }

        await loadCheckin();
    }

    function bindEvents() {
        if (markArrivedButton) {
            markArrivedButton.addEventListener("click", function () {
                updateBookingStatus("ARRIVATA");
            });
        }

        if (noShowButton) {
            noShowButton.addEventListener("click", function () {
                updateBookingStatus("NO_SHOW");
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener("click", loadCheckin);
        }
    }

    async function loadCheckin() {
        const supabaseClient = window.FDAVip.getSupabaseClient();
        if (!supabaseClient) {
            window.FDAVip.showStatus(statusBox, "Client Supabase non disponibile.", "error");
            return;
        }

        window.FDAVip.hideStatus(statusBox);
        setStatusPill("Caricamento", "");
        renderEmpty("Caricamento prenotazione...", "Stiamo leggendo i dati collegati al QR.");

        try {
            const { data: booking, error: bookingError } = await supabaseClient
                .from("bookings")
                .select("id, client_id, booking_date, time_slot, adults, children, area_preference, spot_id, spot_code_snapshot, client_notes, staff_notes, status, created_at, updated_at")
                .eq("id", state.bookingId)
                .maybeSingle();

            if (bookingError) {
                throw bookingError;
            }

            if (!booking) {
                renderEmpty("Prenotazione non trovata.", "Il QR non corrisponde a una prenotazione presente nel database.");
                setStatusPill("Non trovata", "is-watch");
                return;
            }

            const [client, spot] = await Promise.all([
                loadClient(booking.client_id),
                loadSpot(booking.spot_id)
            ]);

            state.booking = booking;
            state.client = client;
            state.spot = spot;

            renderResult();
            window.FDAVip.showStatus(statusBox, "Prenotazione caricata correttamente.", "success");
        } catch (err) {
            renderEmpty("Errore lettura QR.", "Non riusciamo a caricare questa prenotazione in questo momento.");
            setStatusPill("Errore", "is-watch");
            window.FDAVip.showStatus(statusBox, "Errore nel caricamento del check-in. Riprova tra poco.", "error");
        }
    }

    async function loadClient(clientId) {
        if (!clientId) {
            return null;
        }

        const { data, error } = await window.FDAVip.getSupabaseClient()
            .from("clients")
            .select("id, full_name, phone, email, card_code, vip_level, status")
            .eq("id", clientId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data || null;
    }

    async function loadSpot(spotId) {
        if (!spotId) {
            return null;
        }

        const { data, error } = await window.FDAVip.getSupabaseClient()
            .from("beach_spots")
            .select("id, spot_code, row_name, zone, label")
            .eq("id", spotId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data || null;
    }

    function renderResult() {
        const booking = state.booking || {};
        const client = state.client || {};
        const spot = state.spot || {};
        const statusClass = getStatusClass(booking.status);

        if (emptyNode) {
            emptyNode.hidden = true;
        }
        if (resultNode) {
            resultNode.hidden = false;
        }

        setStatusPill(humanizeBookingStatus(booking.status), statusClass);
        setText("vipCheckinInitials", window.FDAVip.getInitials(client.full_name));
        setText("vipCheckinClientName", client.full_name || "Cliente riservato");
        setText("vipCheckinCardCode", client.card_code || "-");
        setText("vipCheckinPhone", client.phone || "-");
        setText("vipCheckinEmail", client.email || "-");
        setText("vipCheckinLevel", client.vip_level || "-");
        setText("vipCheckinClientStatus", humanizeClientStatus(client.status));
        setText("vipCheckinDate", formatDateLabel(booking.booking_date));
        setText("vipCheckinSpot", buildSpotLabel(booking, spot));
        setText("vipCheckinPeople", buildPeopleLabel(booking));
        setText("vipCheckinClientNotes", booking.client_notes || "Nessuna nota cliente.");
        setText("vipCheckinStaffNotes", booking.staff_notes || "Nessuna nota staff.");

        if (openBookingsLink) {
            openBookingsLink.href = buildBookingsUrl(booking);
        }
        if (openClientLink) {
            openClientLink.href = "vip-verify.html?tab=clients&client=" + encodeURIComponent(client.id || "");
        }

        syncActionState(booking.status);
    }

    function renderEmpty(title, copy) {
        if (resultNode) {
            resultNode.hidden = true;
        }
        if (!emptyNode) {
            return;
        }

        emptyNode.hidden = false;
        emptyNode.innerHTML = [
            "<strong>" + escapeHtml(title || "Nessuna prenotazione caricata.") + "</strong>",
            "<span>" + escapeHtml(copy || "Apri questa pagina da un QR prenotazione.") + "</span>"
        ].join("");
    }

    async function updateBookingStatus(nextStatus) {
        const booking = state.booking || {};
        if (!booking.id) {
            return;
        }

        const actionLabel = nextStatus === "ARRIVATA"
            ? "Segnare questa prenotazione come arrivata?"
            : "Segnare questa prenotazione come no show?";

        if (!window.confirm(actionLabel)) {
            return;
        }

        const supabaseClient = window.FDAVip.getSupabaseClient();
        const nextNotes = appendStaffNote(
            booking.staff_notes,
            nextStatus === "ARRIVATA" ? "Cliente segnato come arrivato da check-in QR." : "Cliente segnato come no show da check-in QR."
        );

        setButtonsDisabled(true);
        window.FDAVip.hideStatus(statusBox);

        try {
            const { error } = await supabaseClient
                .from("bookings")
                .update({
                    status: nextStatus,
                    staff_notes: nextNotes
                })
                .eq("id", booking.id);

            if (error) {
                throw error;
            }

            window.FDAVip.showStatus(
                statusBox,
                nextStatus === "ARRIVATA"
                    ? "Check-in registrato: prenotazione segnata come arrivata."
                    : "Prenotazione segnata come no show.",
                "success"
            );

            await loadCheckin();
        } catch (err) {
            window.FDAVip.showStatus(
                statusBox,
                "Non riusciamo ad aggiornare lo stato della prenotazione. Verifica che la patch SQL sia stata eseguita.",
                "error"
            );
        } finally {
            setButtonsDisabled(false);
            syncActionState(state.booking ? state.booking.status : "");
        }
    }

    function syncActionState(status) {
        const canMarkArrived = status === "RICHIESTA" || status === "CONFERMATA";
        const canNoShow = status === "RICHIESTA" || status === "CONFERMATA" || status === "ARRIVATA";

        setButtonAvailability(markArrivedButton, canMarkArrived);
        setButtonAvailability(noShowButton, canNoShow);
    }

    function setButtonAvailability(button, enabled) {
        if (!button) {
            return;
        }

        button.disabled = !enabled;
        button.setAttribute("aria-disabled", enabled ? "false" : "true");
    }

    function setButtonsDisabled(disabled) {
        [markArrivedButton, noShowButton, refreshButton].forEach(function (button) {
            if (button) {
                button.disabled = disabled;
            }
        });
    }

    function getBookingIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const rawBookingId = String(params.get("booking") || "").trim();
        return isUuid(rawBookingId) ? rawBookingId : "";
    }

    function isUuid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }

    function setStatusPill(label, className) {
        if (!statusPill) {
            return;
        }

        statusPill.className = "vip-status-pill";
        if (className) {
            statusPill.classList.add(className);
        }
        statusPill.textContent = label || "-";
    }

    function getStatusClass(status) {
        if (status === "CONFERMATA" || status === "ARRIVATA" || status === "COMPLETATA") {
            return "is-approved";
        }
        if (status === "RICHIESTA") {
            return "is-watch";
        }
        if (status === "RIFIUTATA" || status === "ANNULLATA" || status === "NO_SHOW") {
            return "is-watch";
        }
        return "is-vip";
    }

    function humanizeBookingStatus(status) {
        const labels = {
            RICHIESTA: "In attesa",
            CONFERMATA: "Confermata",
            ARRIVATA: "Arrivata",
            RIFIUTATA: "Rifiutata",
            ANNULLATA: "Annullata",
            COMPLETATA: "Completata",
            NO_SHOW: "No show"
        };

        return labels[status] || status || "-";
    }

    function humanizeClientStatus(status) {
        const labels = {
            DA_VERIFICARE: "Da verificare",
            APPROVATO: "Approvato",
            VIP: "VIP",
            IN_OSSERVAZIONE: "In osservazione",
            SOSPESO: "Sospeso",
            ARCHIVIATO: "Archiviato"
        };

        return labels[status] || status || "-";
    }

    function buildSpotLabel(booking, spot) {
        const spotCode = spot.spot_code || booking.spot_code_snapshot || "";
        const area = spot.zone || booking.area_preference || "";
        if (!spotCode && !area) {
            return "-";
        }
        return [spotCode, area].filter(Boolean).join(" · ");
    }

    function buildPeopleLabel(booking) {
        return String(Number(booking.adults || 0)) + " adulti, " + String(Number(booking.children || 0)) + " bambini";
    }

    function buildBookingsUrl(booking) {
        const url = new URL("vip-verify.html", window.location.href);
        url.searchParams.set("tab", "bookings");
        url.searchParams.set("booking", booking.id || "");
        if (booking.booking_date) {
            url.searchParams.set("date", booking.booking_date);
        }
        return url.pathname.split("/").pop() + url.search;
    }

    function appendStaffNote(previousNotes, message) {
        const timestamp = new Intl.DateTimeFormat("it-IT", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(new Date());
        const line = "[" + timestamp + "] " + message;
        const cleanPrevious = String(previousNotes || "").trim();
        return cleanPrevious ? cleanPrevious + "\n" + line : line;
    }

    function formatDateLabel(dateValue) {
        const date = new Date(String(dateValue || "") + "T00:00:00");
        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return new Intl.DateTimeFormat("it-IT", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function setText(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = value;
        }
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
});
