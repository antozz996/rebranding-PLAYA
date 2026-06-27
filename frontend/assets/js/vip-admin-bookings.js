document.addEventListener("DOMContentLoaded", function () {
    const dashboard = window.FDAVipAdmin;
    const statusBox = document.getElementById("vipBookingsStatus");
    const dateInput = document.getElementById("vipBookingsDate");
    const statusSelect = document.getElementById("vipBookingsFilterStatus");
    const searchInput = document.getElementById("vipBookingsSearch");
    const refreshButton = document.getElementById("vipBookingsRefresh");
    const resetButton = document.getElementById("vipBookingsReset");
    const listNode = document.getElementById("vipBookingsList");
    const dayPill = document.getElementById("vipBookingsDayPill");
    const totalCountNode = document.getElementById("vipBookingsTotalCount");
    const pendingCountNode = document.getElementById("vipBookingsPendingCount");
    const confirmedCountNode = document.getElementById("vipBookingsConfirmedCount");
    const withSpotCountNode = document.getElementById("vipBookingsWithSpotCount");

    const state = {
        rows: [],
        date: "",
        status: "",
        search: ""
    };
    const deepLink = getDeepLinkFilters();

    if (!dashboard || !listNode || !dateInput || !statusSelect) {
        return;
    }

    bindEvents();
    initializeDate(deepLink.date);
    if (deepLink.bookingId && searchInput) {
        searchInput.value = deepLink.bookingId;
    }
    loadBookings();

    function bindEvents() {
        dateInput.addEventListener("change", loadBookings);
        statusSelect.addEventListener("change", loadBookings);

        if (searchInput) {
            searchInput.addEventListener("input", debounce(loadBookings, 220));
        }

        if (refreshButton) {
            refreshButton.addEventListener("click", loadBookings);
        }

        if (resetButton) {
            resetButton.addEventListener("click", function () {
                initializeDate();
                statusSelect.value = "";
                if (searchInput) {
                    searchInput.value = "";
                }
                loadBookings();
            });
        }
    }

    function initializeDate(preferredDate) {
        const today = formatDateForInput(new Date());
        const dateValue = isValidDateInput(preferredDate) ? preferredDate : today;
        state.date = dateValue;
        if (dateInput) {
            dateInput.min = today;
            dateInput.value = dateValue;
        }
    }

    async function loadBookings() {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            renderEmpty("Questa vista e disponibile solo per staff autenticato.");
            return;
        }

        const bookingDate = String(dateInput.value || "").trim();
        const bookingStatus = String(statusSelect.value || "").trim();
        const searchQuery = String(searchInput ? searchInput.value : "").trim().toLowerCase();

        state.date = bookingDate;
        state.status = bookingStatus;
        state.search = searchQuery;

        if (!bookingDate) {
            renderEmpty("Seleziona una data per vedere le prenotazioni.");
            window.FDAVip.hideStatus(statusBox);
            return;
        }

        if (dayPill) {
            dayPill.textContent = isToday(bookingDate) ? "Oggi" : formatShortDate(bookingDate);
        }

        window.FDAVip.hideStatus(statusBox);
        listNode.innerHTML = "<div class='vip-admin-empty-inline'>Caricamento prenotazioni in corso...</div>";

        try {
            let query = supabaseClient
                .from("bookings")
                .select("id, client_id, booking_date, time_slot, adults, children, area_preference, spot_id, spot_code_snapshot, client_notes, staff_notes, status, created_at")
                .eq("booking_date", bookingDate)
                .order("created_at", { ascending: false });

            if (bookingStatus) {
                query = query.eq("status", bookingStatus);
            }

            const { data, error } = await query;
            if (error) {
                throw error;
            }

            const rawRows = Array.isArray(data) ? data : [];
            const clientLookup = await loadClientsLookup(rawRows.map(function (row) {
                return row.client_id;
            }));
            const spotLookup = await loadSpotLookup(rawRows.map(function (row) {
                return row.spot_id;
            }));

            state.rows = rawRows.map(function (row) {
                return Object.assign({}, row, {
                    client: clientLookup[row.client_id] || null,
                    spot: spotLookup[row.spot_id] || null
                });
            });

            const filteredRows = applySearchFilter(state.rows, searchQuery);
            renderSummary(filteredRows);
            renderList(filteredRows);

            window.FDAVip.showStatus(
                statusBox,
                filteredRows.length
                    ? "Prenotazioni caricate correttamente."
                    : "Nessuna prenotazione corrisponde ai filtri selezionati.",
                "success"
            );
        } catch (err) {
            state.rows = [];
            renderSummary([]);
            renderEmpty("Non riusciamo a leggere le prenotazioni in questo momento.");
            window.FDAVip.showStatus(
                statusBox,
                "Errore nel caricamento delle prenotazioni. Riprova tra poco.",
                "error"
            );
        }
    }

    async function loadClientsLookup(clientIds) {
        const supabaseClient = dashboard.getSupabaseClient();
        const ids = Array.from(new Set((clientIds || []).filter(Boolean)));

        if (!supabaseClient || !ids.length) {
            return {};
        }

        const { data, error } = await supabaseClient
            .from("clients")
            .select("id, full_name, phone, card_code, vip_level, status, photo_path")
            .in("id", ids);

        if (error) {
            throw error;
        }

        return (data || []).reduce(function (acc, client) {
            acc[client.id] = client;
            return acc;
        }, {});
    }

    async function loadSpotLookup(spotIds) {
        const supabaseClient = dashboard.getSupabaseClient();
        const ids = Array.from(new Set((spotIds || []).filter(Boolean)));

        if (!supabaseClient || !ids.length) {
            return {};
        }

        const { data, error } = await supabaseClient
            .from("beach_spots")
            .select("id, spot_code, row_name, zone, label")
            .in("id", ids);

        if (error) {
            throw error;
        }

        return (data || []).reduce(function (acc, spot) {
            acc[spot.id] = spot;
            return acc;
        }, {});
    }

    function applySearchFilter(rows, queryText) {
        if (!queryText) {
            return rows.slice();
        }

        return rows.filter(function (row) {
            const parts = [
                row.id,
                row.client ? row.client.full_name : "",
                row.client ? row.client.phone : "",
                row.client ? row.client.card_code : "",
                row.spot ? row.spot.spot_code : "",
                row.spot_code_snapshot,
                row.area_preference,
                row.client_notes,
                row.staff_notes,
                row.status,
                row.time_slot
            ];

            return parts.join(" ").toLowerCase().includes(queryText);
        });
    }

    function renderSummary(rows) {
        const pending = rows.filter(function (row) {
            return row.status === "RICHIESTA";
        }).length;
        const confirmed = rows.filter(function (row) {
            return row.status === "CONFERMATA";
        }).length;
        const withSpot = rows.filter(function (row) {
            return Boolean(row.spot_id);
        }).length;

        setText(totalCountNode, String(rows.length));
        setText(pendingCountNode, String(pending));
        setText(confirmedCountNode, String(confirmed));
        setText(withSpotCountNode, String(withSpot));
    }

    function renderList(rows) {
        listNode.innerHTML = "";

        if (!rows.length) {
            renderEmpty("Nessuna prenotazione corrisponde ai filtri selezionati.");
            return;
        }

        rows.forEach(function (row) {
            const client = row.client || {};
            const spot = row.spot || {};
            const item = document.createElement("article");
            item.className = "vip-booking-admin-item";

            const actions = buildActionMarkup(row, client);
            const currentStaffNotes = dashboard.escapeHtml(row.staff_notes || "");

            item.innerHTML = [
                "<div class='vip-booking-admin-topline'>",
                "  <div class='vip-booking-admin-titleblock'>",
                "    <strong>" + dashboard.escapeHtml(client.full_name || "Cliente riservato") + "</strong>",
                "    <span>" + dashboard.escapeHtml(formatBookingLabel(row)) + "</span>",
                "  </div>",
                "  <div class='vip-status-pill " + getStatusClass(row.status) + "'>" + dashboard.escapeHtml(humanizeBookingStatus(row.status)) + "</div>",
                "</div>",
                "<div class='vip-booking-admin-meta'>",
                "  <span><strong>Card:</strong> " + dashboard.escapeHtml(client.card_code || "-") + "</span>",
                "  <span><strong>Telefono:</strong> " + dashboard.escapeHtml(client.phone || "-") + "</span>",
                "  <span><strong>Postazione:</strong> " + dashboard.escapeHtml(spot.spot_code || row.spot_code_snapshot || "Nessuna") + "</span>",
                "  <span><strong>Area:</strong> " + dashboard.escapeHtml(row.area_preference || spot.zone || "-") + "</span>",
                "  <span><strong>Adulti:</strong> " + dashboard.escapeHtml(String(row.adults || 0)) + "</span>",
                "  <span><strong>Bambini:</strong> " + dashboard.escapeHtml(String(row.children || 0)) + "</span>",
                "</div>",
                "<div class='vip-booking-admin-notes'>",
                "  <div><strong>Note cliente</strong><p>" + dashboard.escapeHtml(row.client_notes || "Nessuna nota cliente.") + "</p></div>",
                "  <div><strong>Note staff correnti</strong><p>" + dashboard.escapeHtml(row.staff_notes || "Nessuna nota staff.") + "</p></div>",
                "</div>",
                "<div class='vip-booking-admin-editor-grid'>",
                "  <div class='vip-field vip-booking-admin-editor-field'>",
                "    <label for='vipBookingStaffNote-" + row.id + "'>Aggiorna nota staff</label>",
                "    <textarea id='vipBookingStaffNote-" + row.id + "' class='vip-booking-admin-textarea' placeholder='Conferma, rifiuto, esigenze operative, variazioni giornata...'>" + currentStaffNotes + "</textarea>",
                "  </div>",
                "  <div class='vip-booking-admin-editor-panel'>",
                "    <strong>Azioni operative</strong>",
                "    <span>Conferma, rifiuta, riapri o chiudi la pratica mantenendo lo storico note nello stesso blocco.</span>",
                "    <div class='vip-actions vip-actions-compact vip-booking-admin-inline-actions'>",
                "      <button type='button' class='vip-booking-admin-action is-neutral' data-action='save-notes'>Salva nota</button>",
                (row.spot_id || row.spot_code_snapshot
                    ? "      <button type='button' class='vip-booking-admin-action' data-action='open-pool'>Gestione piscina</button>"
                    : ""),
                "    </div>",
                "  </div>",
                "</div>",
                "<div class='vip-booking-admin-footer'>",
                "  <small>" + dashboard.escapeHtml(formatDateLabel(row.booking_date) + " · " + formatShortTime(row.created_at)) + "</small>",
                "  <div class='vip-actions vip-actions-compact vip-booking-admin-actions-wrap'>" + actions.join("") + "</div>",
                "</div>"
            ].join("");

            const noteTextarea = item.querySelector(".vip-booking-admin-textarea");
            const openClientButton = item.querySelector("[data-action='open-client']");
            const confirmButton = item.querySelector("[data-action='confirm-booking']");
            const rejectButton = item.querySelector("[data-action='reject-booking']");
            const unlockButton = item.querySelector("[data-action='unlock-booking']");
            const reopenButton = item.querySelector("[data-action='reopen-booking']");
            const completeButton = item.querySelector("[data-action='complete-booking']");
            const noShowButton = item.querySelector("[data-action='no-show-booking']");
            const saveNotesButton = item.querySelector("[data-action='save-notes']");
            const openPoolButton = item.querySelector("[data-action='open-pool']");

            if (confirmButton) {
                confirmButton.addEventListener("click", function () {
                    requestStatusChange(row, "CONFERMATA", noteTextarea);
                });
            }

            if (rejectButton) {
                rejectButton.addEventListener("click", function () {
                    requestStatusChange(row, "RIFIUTATA", noteTextarea);
                });
            }

            if (unlockButton) {
                unlockButton.addEventListener("click", function () {
                    requestStatusChange(row, "RICHIESTA", noteTextarea);
                });
            }

            if (reopenButton) {
                reopenButton.addEventListener("click", function () {
                    requestStatusChange(row, "RICHIESTA", noteTextarea);
                });
            }

            if (completeButton) {
                completeButton.addEventListener("click", function () {
                    requestStatusChange(row, "COMPLETATA", noteTextarea);
                });
            }

            if (noShowButton) {
                noShowButton.addEventListener("click", function () {
                    requestStatusChange(row, "NO_SHOW", noteTextarea);
                });
            }

            if (openClientButton && client.id) {
                openClientButton.addEventListener("click", function () {
                    dashboard.setEditingClient(client);
                    window.dispatchEvent(new CustomEvent("fda-vip-admin:activate-tab", {
                        detail: { tab: "clients" }
                    }));
                });
            }

            if (saveNotesButton) {
                saveNotesButton.addEventListener("click", function () {
                    saveBookingNotes(row, noteTextarea);
                });
            }

            if (openPoolButton) {
                openPoolButton.addEventListener("click", function () {
                    window.dispatchEvent(new CustomEvent("fda-vip-admin:activate-tab", {
                        detail: { tab: "pool" }
                    }));
                    window.dispatchEvent(new CustomEvent("fda-vip-admin:activate-pool-subtab", {
                        detail: { tab: "overrides" }
                    }));
                });
            }

            listNode.appendChild(item);
        });
    }

    async function requestStatusChange(row, nextStatus, noteTextarea) {
        const confirmationMessage = buildStatusConfirmationMessage(row, nextStatus);
        if (!window.confirm(confirmationMessage)) {
            return;
        }

        const nextNotes = noteTextarea ? String(noteTextarea.value || "").trim() : String(row.staff_notes || "").trim();
        await updateBookingStatus(row, nextStatus, nextNotes);
    }

    async function saveBookingNotes(row, noteTextarea) {
        const nextNotes = noteTextarea ? String(noteTextarea.value || "").trim() : "";

        if (nextNotes === String(row.staff_notes || "").trim()) {
            window.FDAVip.showStatus(statusBox, "Nessuna modifica rilevata nelle note staff.", "success");
            return;
        }

        await updateBookingStatus(row, row.status, nextNotes, true);
    }

    async function updateBookingStatus(row, nextStatus, nextNotes, keepStatusMessage) {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        window.FDAVip.hideStatus(statusBox);

        try {
            const payload = {
                status: nextStatus,
                staff_notes: nextNotes || null
            };
            const { error } = await supabaseClient
                .from("bookings")
                .update(payload)
                .eq("id", row.id);

            if (error) {
                throw error;
            }

            window.FDAVip.showStatus(
                statusBox,
                keepStatusMessage ? "Note staff aggiornate correttamente." : buildStatusFeedback(nextStatus),
                "success"
            );

            await loadBookings();
            window.dispatchEvent(new CustomEvent("fda-vip-admin:data-changed"));
        } catch (err) {
            window.FDAVip.showStatus(
                statusBox,
                "Non riusciamo ad aggiornare lo stato della prenotazione in questo momento.",
                "error"
            );
        }
    }

    function renderEmpty(message) {
        listNode.innerHTML = "<div class='vip-admin-empty-inline'>" + dashboard.escapeHtml(message) + "</div>";
    }

    function formatBookingLabel(row) {
        const timeSlotLabels = {
            MATTINA: "Mattina",
            POMERIGGIO: "Pomeriggio",
            GIORNATA_INTERA: "Giornata intera"
        };

        return [
            formatDateLabel(row.booking_date),
            timeSlotLabels[row.time_slot] || row.time_slot || "-",
            humanizeBookingStatus(row.status)
        ].join(" · ");
    }

    function getStatusClass(status) {
        if (status === "CONFERMATA") {
            return "is-approved";
        }
        if (status === "RICHIESTA") {
            return "is-watch";
        }
        if (status === "COMPLETATA") {
            return "is-approved";
        }
        if (status === "RIFIUTATA" || status === "ANNULLATA" || status === "NO_SHOW") {
            return "is-watch";
        }
        return "is-vip";
    }

    function buildStatusFeedback(status) {
        if (status === "CONFERMATA") {
            return "Prenotazione confermata correttamente.";
        }
        if (status === "RIFIUTATA") {
            return "Prenotazione rifiutata e postazione liberata.";
        }
        if (status === "RICHIESTA") {
            return "Prenotazione riportata in attesa.";
        }
        if (status === "COMPLETATA") {
            return "Prenotazione marcata come completata.";
        }
        if (status === "NO_SHOW") {
            return "Prenotazione segnata come no show.";
        }
        return "Stato prenotazione aggiornato.";
    }

    function buildActionMarkup(row, client) {
        const actions = [];

        if (row.status === "RICHIESTA") {
            actions.push(
                "<button type='button' class='vip-booking-admin-action is-primary' data-action='confirm-booking'>Conferma</button>",
                "<button type='button' class='vip-booking-admin-action is-danger' data-action='reject-booking'>Rifiuta</button>"
            );
        } else if (row.status === "CONFERMATA") {
            actions.push(
                "<button type='button' class='vip-booking-admin-action is-primary' data-action='complete-booking'>Completa</button>",
                "<button type='button' class='vip-booking-admin-action is-neutral' data-action='unlock-booking'>Riapri</button>",
                "<button type='button' class='vip-booking-admin-action is-neutral' data-action='no-show-booking'>No show</button>",
                "<button type='button' class='vip-booking-admin-action is-danger' data-action='reject-booking'>Rifiuta</button>"
            );
        } else if (row.status === "RIFIUTATA" || row.status === "ANNULLATA" || row.status === "NO_SHOW") {
            actions.push(
                "<button type='button' class='vip-booking-admin-action is-neutral' data-action='reopen-booking'>Riporta in attesa</button>"
            );
        } else if (row.status === "COMPLETATA") {
            actions.push(
                "<button type='button' class='vip-booking-admin-action is-neutral' data-action='reopen-booking'>Riapri pratica</button>"
            );
        }

        if (client.id) {
            actions.push(
                "<button type='button' class='vip-booking-admin-action' data-action='open-client'>Apri cliente</button>"
            );
        }

        return actions;
    }

    function buildStatusConfirmationMessage(row, nextStatus) {
        const clientName = row.client && row.client.full_name ? row.client.full_name : "questo cliente";
        const actions = {
            CONFERMATA: "Confermare la prenotazione di ",
            RIFIUTATA: "Rifiutare la prenotazione di ",
            RICHIESTA: "Riportare in attesa la prenotazione di ",
            COMPLETATA: "Segnare come completata la prenotazione di ",
            NO_SHOW: "Segnare come no show la prenotazione di "
        };

        return (actions[nextStatus] || "Aggiornare la prenotazione di ") + clientName + "?";
    }

    function getDeepLinkFilters() {
        const params = new URLSearchParams(window.location.search);
        return {
            bookingId: String(params.get("booking") || "").trim(),
            date: String(params.get("date") || "").trim()
        };
    }

    function isValidDateInput(value) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
    }

    function humanizeBookingStatus(status) {
        const labels = {
            RICHIESTA: "In attesa",
            CONFERMATA: "Confermata",
            RIFIUTATA: "Rifiutata",
            ANNULLATA: "Annullata",
            COMPLETATA: "Completata",
            NO_SHOW: "No show"
        };

        return labels[status] || status || "-";
    }

    function formatDateForInput(date) {
        const reference = date instanceof Date ? date : new Date(date);
        return [
            reference.getFullYear(),
            String(reference.getMonth() + 1).padStart(2, "0"),
            String(reference.getDate()).padStart(2, "0")
        ].join("-");
    }

    function formatDateLabel(dateValue) {
        const date = new Date(dateValue + "T00:00:00");
        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return new Intl.DateTimeFormat("it-IT", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function formatShortDate(dateValue) {
        const date = new Date(dateValue + "T00:00:00");
        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return new Intl.DateTimeFormat("it-IT", {
            day: "2-digit",
            month: "2-digit"
        }).format(date);
    }

    function formatShortTime(dateValue) {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return new Intl.DateTimeFormat("it-IT", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function isToday(dateValue) {
        return formatDateForInput(new Date()) === String(dateValue || "");
    }

    function setText(node, value) {
        if (node) {
            node.textContent = value;
        }
    }

    function debounce(fn, delay) {
        let timer = null;
        return function () {
            const args = arguments;
            const context = this;
            clearTimeout(timer);
            timer = window.setTimeout(function () {
                fn.apply(context, args);
            }, delay);
        };
    }
});
