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

    if (!dashboard || !listNode || !dateInput || !statusSelect) {
        return;
    }

    bindEvents();
    initializeDate();
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

    function initializeDate() {
        const today = formatDateForInput(new Date());
        state.date = today;
        if (dateInput) {
            dateInput.min = today;
            dateInput.value = today;
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

            const actions = [];
            if (row.status === "RICHIESTA") {
                actions.push(
                    "<button type='button' class='vip-booking-admin-action is-primary' data-action='confirm-booking'>Conferma</button>"
                );
                actions.push(
                    "<button type='button' class='vip-booking-admin-action is-danger' data-action='reject-booking'>Rifiuta</button>"
                );
            } else if (row.status === "CONFERMATA") {
                actions.push(
                    "<button type='button' class='vip-booking-admin-action is-neutral' data-action='unlock-booking'>Sblocca</button>"
                );
                actions.push(
                    "<button type='button' class='vip-booking-admin-action is-danger' data-action='reject-booking'>Rifiuta</button>"
                );
            } else if (row.status === "RIFIUTATA" || row.status === "ANNULLATA") {
                actions.push(
                    "<button type='button' class='vip-booking-admin-action is-neutral' data-action='reopen-booking'>Riporta in pending</button>"
                );
            }

            if (client.id) {
                actions.push(
                    "<button type='button' class='vip-booking-admin-action' data-action='open-client'>Apri cliente</button>"
                );
            }

            item.innerHTML = [
                "<div class='vip-booking-admin-topline'>",
                "  <div class='vip-booking-admin-titleblock'>",
                "    <strong>" + dashboard.escapeHtml(client.full_name || "Cliente riservato") + "</strong>",
                "    <span>" + dashboard.escapeHtml(formatBookingLabel(row)) + "</span>",
                "  </div>",
                "  <div class='vip-status-pill " + getStatusClass(row.status) + "'>" + dashboard.escapeHtml(row.status || "-") + "</div>",
                "</div>",
                "<div class='vip-booking-admin-meta'>",
                "  <span><strong>Card:</strong> " + dashboard.escapeHtml(client.card_code || "-") + "</span>",
                "  <span><strong>Telefono:</strong> " + dashboard.escapeHtml(client.phone || "-") + "</span>",
                "  <span><strong>Spot:</strong> " + dashboard.escapeHtml(spot.spot_code || row.spot_code_snapshot || "Nessuno") + "</span>",
                "  <span><strong>Area:</strong> " + dashboard.escapeHtml(row.area_preference || spot.zone || "-") + "</span>",
                "  <span><strong>Adulti:</strong> " + dashboard.escapeHtml(String(row.adults || 0)) + "</span>",
                "  <span><strong>Bambini:</strong> " + dashboard.escapeHtml(String(row.children || 0)) + "</span>",
                "</div>",
                "<div class='vip-booking-admin-notes'>",
                "  <div><strong>Note cliente</strong><p>" + dashboard.escapeHtml(row.client_notes || "Nessuna nota cliente.") + "</p></div>",
                "  <div><strong>Note staff</strong><p>" + dashboard.escapeHtml(row.staff_notes || "Nessuna nota staff.") + "</p></div>",
                "</div>",
                "<div class='vip-booking-admin-footer'>",
                "  <small>" + dashboard.escapeHtml(formatDateLabel(row.booking_date) + " · " + formatShortTime(row.created_at)) + "</small>",
                "  <div class='vip-actions vip-actions-compact'>" + actions.join("") + "</div>",
                "</div>"
            ].join("");

            const openClientButton = item.querySelector("[data-action='open-client']");
            const confirmButton = item.querySelector("[data-action='confirm-booking']");
            const rejectButton = item.querySelector("[data-action='reject-booking']");
            const unlockButton = item.querySelector("[data-action='unlock-booking']");
            const reopenButton = item.querySelector("[data-action='reopen-booking']");

            if (confirmButton) {
                confirmButton.addEventListener("click", function () {
                    updateBookingStatus(row, "CONFERMATA");
                });
            }

            if (rejectButton) {
                rejectButton.addEventListener("click", function () {
                    updateBookingStatus(row, "RIFIUTATA");
                });
            }

            if (unlockButton) {
                unlockButton.addEventListener("click", function () {
                    updateBookingStatus(row, "RICHIESTA");
                });
            }

            if (reopenButton) {
                reopenButton.addEventListener("click", function () {
                    updateBookingStatus(row, "RICHIESTA");
                });
            }

            if (openClientButton && client.id) {
                openClientButton.addEventListener("click", function () {
                    dashboard.setEditingClient(client);
                    const clientsTab = document.querySelector("[data-vip-tab-target='clients']");
                    if (clientsTab) {
                        clientsTab.click();
                    }
                });
            }

            listNode.appendChild(item);
        });
    }

    async function updateBookingStatus(row, nextStatus) {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        window.FDAVip.hideStatus(statusBox);

        try {
            const payload = { status: nextStatus };
            const { error } = await supabaseClient
                .from("bookings")
                .update(payload)
                .eq("id", row.id);

            if (error) {
                throw error;
            }

            window.FDAVip.showStatus(
                statusBox,
                buildStatusFeedback(nextStatus),
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
            row.status === "RICHIESTA" ? "In pending" : row.status === "CONFERMATA" ? "Confermata" : row.status || "-"
        ].join(" · ");
    }

    function getStatusClass(status) {
        if (status === "CONFERMATA") {
            return "is-approved";
        }
        if (status === "RICHIESTA") {
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
            return "Prenotazione riportata in pending.";
        }
        return "Stato prenotazione aggiornato.";
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
