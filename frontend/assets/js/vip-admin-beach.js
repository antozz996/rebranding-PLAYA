document.addEventListener("DOMContentLoaded", function () {
    const dashboard = window.FDAVipAdmin;
    const section = document.getElementById("vipBeachAdminSection");
    const statusBox = document.getElementById("vipBeachAdminStatus");
    const dateInput = document.getElementById("vipBeachAdminDate");
    const refreshButton = document.getElementById("vipBeachAdminRefresh");
    const resetSelectionButton = document.getElementById("vipBeachAdminResetSelection");
    const mapGrid = document.getElementById("vipBeachAdminMapGrid");
    const mapTitle = document.getElementById("vipBeachAdminMapTitle");
    const mapMeta = document.getElementById("vipBeachAdminMapMeta");
    const dayPill = document.getElementById("vipBeachAdminDayPill");
    const editorPill = document.getElementById("vipBeachEditorPill");
    const bookingsPill = document.getElementById("vipBeachBookingsPill");
    const bookingsList = document.getElementById("vipBeachBookingsList");
    const overrideForm = document.getElementById("vipBeachOverrideForm");
    const overrideSpotId = document.getElementById("vipBeachOverrideSpotId");
    const overrideStatus = document.getElementById("vipBeachOverrideStatus");
    const overrideUmbrellas = document.getElementById("vipBeachOverrideUmbrellas");
    const overrideSunbeds = document.getElementById("vipBeachOverrideSunbeds");
    const overrideNote = document.getElementById("vipBeachOverrideNote");
    const overrideSaveButton = document.getElementById("vipBeachOverrideSave");
    const overrideClearButton = document.getElementById("vipBeachOverrideClear");
    const selectedCard = document.getElementById("vipBeachSelectedCard");
    const selectedCode = document.getElementById("vipBeachSelectedCode");
    const selectedLabel = document.getElementById("vipBeachSelectedLabel");
    const selectedDetails = document.getElementById("vipBeachSelectedDetails");
    const selectedMeta = document.getElementById("vipBeachSelectedMeta");

    const state = {
        date: "",
        rows: [],
        selectedSpotId: ""
    };

    if (!dashboard || !section || !overrideForm) {
        return;
    }

    bindEvents();
    resetSelection();
    renderEmptyMap("Scegli una data per leggere la piantina del giorno.");

    const initialDate = formatDateForInput(new Date());
    if (dateInput) {
        dateInput.min = initialDate;
        dateInput.value = initialDate;
    }
    loadAdminMap(initialDate);

    function bindEvents() {
        if (dateInput) {
            dateInput.addEventListener("change", function () {
                loadAdminMap(dateInput.value);
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener("click", function () {
                loadAdminMap(dateInput ? dateInput.value : "");
            });
        }

        if (resetSelectionButton) {
            resetSelectionButton.addEventListener("click", resetSelection);
        }

        if (overrideForm) {
            overrideForm.addEventListener("submit", onSubmitOverride);
        }

        if (overrideClearButton) {
            overrideClearButton.addEventListener("click", clearOverride);
        }

        window.addEventListener("fda-vip-admin:data-changed", function () {
            if (state.date) {
                loadAdminMap(state.date, true);
            }
        });
    }

    async function loadAdminMap(dateValue, preserveSelection) {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        const normalizedDate = String(dateValue || "").trim();
        state.date = normalizedDate;

        if (!preserveSelection) {
            resetSelection();
        }

        if (!normalizedDate) {
            renderEmptyMap("Scegli una data per leggere la piantina del giorno.");
            window.FDAVip.hideStatus(statusBox);
            return;
        }

        mapGrid.innerHTML = "<div class='vip-admin-empty-inline'>Carichiamo la piantina staff del giorno...</div>";
        if (mapTitle) {
            mapTitle.textContent = "Caricamento in corso";
        }
        window.FDAVip.hideStatus(statusBox);

        try {
            const { data, error } = await supabaseClient.rpc("admin_get_booking_map_for_date", {
                p_booking_date: normalizedDate
            });

            if (error) {
                throw error;
            }

            state.rows = Array.isArray(data) ? data : [];

            if (!state.rows.length) {
                renderEmptyMap("Nessuna postazione configurata per il layout attivo.");
                renderBookings([]);
                renderCounters([]);
                window.FDAVip.showStatus(statusBox, "Nessuna postazione trovata per la data selezionata.", "error");
                return;
            }

            renderMap(state.rows, normalizedDate);
            renderCounters(state.rows);
            renderBookings(state.rows);

            if (preserveSelection && state.selectedSpotId) {
                const currentSpot = findSpotById(state.selectedSpotId);
                if (currentSpot) {
                    populateEditor(currentSpot);
                } else {
                    resetSelection();
                }
            }

            window.FDAVip.showStatus(
                statusBox,
                buildAdminMessage(state.rows),
                "success"
            );
        } catch (err) {
            state.rows = [];
            renderEmptyMap("Non riusciamo a leggere la piantina in questo momento.");
            renderBookings([]);
            renderCounters([]);
            window.FDAVip.showStatus(
                statusBox,
                "Errore nel caricamento della mappa giornaliera. Riprova tra poco.",
                "error"
            );
        }
    }

    function renderMap(rows, dateValue) {
        const groupedRows = groupByRow(rows);
        const availableCount = rows.filter(function (row) {
            return row.final_status === "DISPONIBILE" && row.is_bookable;
        }).length;

        if (mapTitle) {
            mapTitle.textContent = "Piantina staff del " + formatDateLabel(dateValue);
        }
        if (mapMeta) {
            mapMeta.textContent = availableCount + " spot disponibili ora. Clicca una postazione per modificarla.";
        }
        if (dayPill) {
            dayPill.textContent = formatShortDate(dateValue);
        }

        mapGrid.innerHTML = "";

        groupedRows.forEach(function (group) {
            const rowShell = document.createElement("section");
            rowShell.className = "vip-beach-row";

            const rowLabel = document.createElement("div");
            rowLabel.className = "vip-beach-row-label";
            rowLabel.innerHTML =
                "<strong>Fila " + dashboard.escapeHtml(group.rowName) + "</strong>" +
                "<span>" + dashboard.escapeHtml(group.zoneLabel) + "</span>";

            const rowSpots = document.createElement("div");
            rowSpots.className = "vip-beach-row-spots";

            group.spots.forEach(function (spot) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = buildSpotClassName(spot);
                button.setAttribute("data-spot-id", spot.spot_id);
                button.innerHTML =
                    "<strong>" + dashboard.escapeHtml(spot.spot_code) + "</strong>" +
                    "<span>" + dashboard.escapeHtml(spot.label || spot.zone || "Postazione") + "</span>" +
                    "<small>" + dashboard.escapeHtml(getSpotBadge(spot)) + "</small>";

                button.addEventListener("click", function () {
                    state.selectedSpotId = spot.spot_id;
                    populateEditor(spot);
                    refreshSelectionStyles();
                });

                rowSpots.appendChild(button);
            });

            rowShell.appendChild(rowLabel);
            rowShell.appendChild(rowSpots);
            mapGrid.appendChild(rowShell);
        });
    }

    function renderCounters(rows) {
        setText("vipBeachAvailableCount", countStatus(rows, "DISPONIBILE"));
        setText("vipBeachOccupiedCount", countStatus(rows, "RISERVATA"));
        setText("vipBeachBlockedCount", countStatus(rows, "BLOCCATA"));
        setText("vipBeachMaintenanceCount", countStatus(rows, "MANUTENZIONE"));
        setText("vipBeachOverridesCount", rows.filter(function (row) {
            return Boolean(row.override_id);
        }).length);
    }

    function renderBookings(rows) {
        if (!bookingsList) {
            return;
        }

        const bookings = rows
            .filter(function (row) {
                return Boolean(row.active_booking_id);
            })
            .reduce(function (acc, row) {
                if (!acc.lookup[row.active_booking_id]) {
                    acc.lookup[row.active_booking_id] = true;
                    acc.rows.push(row);
                }
                return acc;
            }, { lookup: {}, rows: [] })
            .rows;

        bookingsList.innerHTML = "";

        if (bookingsPill) {
            bookingsPill.textContent = bookings.length + " booking";
        }

        if (!bookings.length) {
            bookingsList.innerHTML = "<div class='vip-admin-empty-inline'>Nessuna prenotazione attiva per la giornata selezionata.</div>";
            return;
        }

        bookings.forEach(function (row) {
            const item = document.createElement("article");
            item.className = "vip-beach-admin-booking-item";
            item.innerHTML =
                "<strong>" + dashboard.escapeHtml(row.spot_code || "-") + "</strong>" +
                "<span>" + dashboard.escapeHtml(row.booking_client_name || "Cliente riservato") + "</span>" +
                "<small>" + dashboard.escapeHtml((row.zone || "Area VIP") + " · " + (row.active_booking_status || "RICHIESTA")) + "</small>";
            item.addEventListener("click", function () {
                state.selectedSpotId = row.spot_id;
                populateEditor(row);
                refreshSelectionStyles();
            });
            bookingsList.appendChild(item);
        });
    }

    function renderEmptyMap(message) {
        if (mapTitle) {
            mapTitle.textContent = "Seleziona una data";
        }
        if (mapMeta) {
            mapMeta.textContent = "Ogni spot mostra stato finale, capienza e booking attivo se presente.";
        }
        if (dayPill) {
            dayPill.textContent = "Seleziona una data";
        }
        mapGrid.innerHTML = "<div class='vip-admin-empty-inline'>" + dashboard.escapeHtml(message) + "</div>";
    }

    function populateEditor(spot) {
        if (!spot) {
            resetSelection();
            return;
        }

        if (overrideSpotId) {
            overrideSpotId.value = spot.spot_id || "";
        }
        if (overrideStatus) {
            overrideStatus.value = spot.override_status || "";
        }
        if (overrideUmbrellas) {
            overrideUmbrellas.value = spot.override_id && spot.umbrellas != null ? String(spot.umbrellas) : "";
            overrideUmbrellas.placeholder = "Base: " + (spot.umbrellas != null ? spot.umbrellas : 0);
        }
        if (overrideSunbeds) {
            overrideSunbeds.value = spot.override_id && spot.sunbeds != null ? String(spot.sunbeds) : "";
            overrideSunbeds.placeholder = "Base: " + (spot.sunbeds != null ? spot.sunbeds : 0);
        }
        if (overrideNote) {
            overrideNote.value = spot.admin_note || "";
        }
        if (selectedCode) {
            selectedCode.textContent = spot.spot_code || "-";
        }
        if (selectedLabel) {
            selectedLabel.textContent = (spot.label || "Postazione") + " · " + (spot.zone || "Area VIP");
        }
        if (selectedDetails) {
            selectedDetails.textContent = getDetailedSummary(spot);
        }
        if (selectedMeta) {
            selectedMeta.textContent = spot.active_booking_id
                ? "Booking attivo associato a " + (spot.booking_client_name || "cliente riservato") + "."
                : "Nessun booking attivo. Puoi applicare un override giornaliero.";
        }
        if (editorPill) {
            editorPill.textContent = spot.spot_code || "Selezionata";
        }
        if (selectedCard) {
            selectedCard.classList.add("is-selected");
        }
    }

    async function onSubmitOverride(event) {
        event.preventDefault();

        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        if (!state.date) {
            window.FDAVip.showStatus(statusBox, "Seleziona prima una data di servizio.", "error");
            return;
        }
        if (!overrideSpotId || !overrideSpotId.value) {
            window.FDAVip.showStatus(statusBox, "Seleziona prima una postazione dalla mappa.", "error");
            return;
        }

        overrideSaveButton.disabled = true;
        overrideSaveButton.textContent = "Salvataggio...";
        window.FDAVip.hideStatus(statusBox);

        try {
            const { data, error } = await supabaseClient.rpc("admin_upsert_spot_override", {
                p_spot_id: overrideSpotId.value,
                p_service_date: state.date,
                p_status: nullableString(overrideStatus ? overrideStatus.value : ""),
                p_umbrellas: nullableNumber(overrideUmbrellas ? overrideUmbrellas.value : ""),
                p_sunbeds: nullableNumber(overrideSunbeds ? overrideSunbeds.value : ""),
                p_admin_note: nullableString(overrideNote ? overrideNote.value : "")
            });

            if (error) {
                throw error;
            }

            const result = Array.isArray(data) ? data[0] : data;
            const actionLabel = result && result.action === "CLEARED"
                ? "Override rimosso correttamente."
                : "Override giornaliero salvato correttamente.";

            window.FDAVip.showStatus(statusBox, actionLabel, "success");
            await loadAdminMap(state.date, true);
        } catch (err) {
            window.FDAVip.showStatus(statusBox, humanizeOverrideError(err), "error");
        } finally {
            overrideSaveButton.disabled = false;
            overrideSaveButton.textContent = "Salva override";
        }
    }

    async function clearOverride() {
        if (!overrideSpotId || !overrideSpotId.value || !state.date) {
            resetSelection();
            return;
        }

        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        overrideClearButton.disabled = true;

        try {
            const { error } = await supabaseClient.rpc("admin_upsert_spot_override", {
                p_spot_id: overrideSpotId.value,
                p_service_date: state.date,
                p_status: null,
                p_umbrellas: null,
                p_sunbeds: null,
                p_admin_note: null
            });

            if (error) {
                throw error;
            }

            window.FDAVip.showStatus(statusBox, "Override rimosso. La postazione eredita di nuovo il layout base.", "success");
            await loadAdminMap(state.date);
        } catch (err) {
            window.FDAVip.showStatus(statusBox, humanizeOverrideError(err), "error");
        } finally {
            overrideClearButton.disabled = false;
        }
    }

    function resetSelection() {
        state.selectedSpotId = "";

        if (overrideForm) {
            overrideForm.reset();
        }
        if (overrideSpotId) {
            overrideSpotId.value = "";
        }
        if (selectedCode) {
            selectedCode.textContent = "-";
        }
        if (selectedLabel) {
            selectedLabel.textContent = "Nessuna postazione selezionata";
        }
        if (selectedDetails) {
            selectedDetails.textContent = "Lo snapshot finale della giornata apparira qui.";
        }
        if (selectedMeta) {
            selectedMeta.textContent = "Seleziona una postazione dalla mappa per modificarne lo stato o la capienza solo per il giorno scelto.";
        }
        if (editorPill) {
            editorPill.textContent = "Nessuna selezione";
        }
        if (selectedCard) {
            selectedCard.classList.remove("is-selected");
        }

        refreshSelectionStyles();
    }

    function refreshSelectionStyles() {
        Array.from(document.querySelectorAll("#vipBeachAdminMapGrid .vip-beach-spot")).forEach(function (button) {
            const isSelected = button.getAttribute("data-spot-id") === state.selectedSpotId;
            button.classList.toggle("is-selected", Boolean(isSelected));
        });
    }

    function findSpotById(spotId) {
        return state.rows.find(function (row) {
            return row.spot_id === spotId;
        }) || null;
    }

    function groupByRow(rows) {
        const groups = [];
        const lookup = new Map();

        rows.forEach(function (row) {
            const key = row.row_name || "A";
            if (!lookup.has(key)) {
                const bucket = {
                    rowName: key,
                    zoneLabel: row.zone || "Area VIP",
                    spots: []
                };
                lookup.set(key, bucket);
                groups.push(bucket);
            }
            lookup.get(key).spots.push(row);
        });

        return groups;
    }

    function buildSpotClassName(spot) {
        const classNames = ["vip-beach-spot", "is-admin"];
        const status = String(spot.final_status || "").toUpperCase();

        if (status === "DISPONIBILE") {
            classNames.push("is-available");
        } else if (status === "RISERVATA") {
            classNames.push("is-occupied");
        } else if (status === "MANUTENZIONE") {
            classNames.push("is-maintenance");
        } else {
            classNames.push("is-blocked");
        }

        if (spot.spot_id === state.selectedSpotId) {
            classNames.push("is-selected");
        }

        return classNames.join(" ");
    }

    function getSpotBadge(spot) {
        const suffix = spot.active_booking_id ? " · booking attivo" : "";
        return (spot.umbrellas || 0) + " omb · " + (spot.sunbeds || 0) + " let" + suffix;
    }

    function getDetailedSummary(spot) {
        const parts = [
            "Stato finale: " + (spot.final_status || "-"),
            (spot.umbrellas || 0) + " ombrelloni",
            (spot.sunbeds || 0) + " lettini"
        ];

        if (spot.override_id) {
            parts.push("override attivo");
        }

        return parts.join(" · ");
    }

    function buildAdminMessage(rows) {
        return [
            countStatus(rows, "DISPONIBILE") + " disponibili",
            countStatus(rows, "RISERVATA") + " occupate",
            rows.filter(function (row) { return Boolean(row.override_id); }).length + " override attivi"
        ].join(" · ");
    }

    function countStatus(rows, status) {
        return rows.filter(function (row) {
            return row.final_status === status;
        }).length;
    }

    function setText(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = String(value);
        }
    }

    function nullableString(value) {
        const clean = String(value || "").trim();
        return clean || null;
    }

    function nullableNumber(value) {
        const clean = String(value || "").trim();
        return clean === "" ? null : Number(clean);
    }

    function humanizeOverrideError(err) {
        const message = String(err && (err.message || err)).toLowerCase();

        if (message.includes("solo allo staff")) {
            return "Questa operazione e riservata allo staff autenticato.";
        }
        if (message.includes("postazione e data sono obbligatorie")) {
            return "Seleziona prima data e postazione.";
        }
        if (message.includes("stato override")) {
            return "Lo stato selezionato non e valido.";
        }
        if (message.includes("ombrelloni")) {
            return "Controlla il numero di ombrelloni indicato.";
        }
        if (message.includes("lettini")) {
            return "Controlla il numero di lettini indicato.";
        }

        return "Non riusciamo a salvare l'override in questo momento.";
    }

    function formatDateForInput(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function formatDateLabel(dateString) {
        const date = new Date(dateString + "T00:00:00");
        return date.toLocaleDateString("it-IT", {
            weekday: "long",
            day: "2-digit",
            month: "long"
        });
    }

    function formatShortDate(dateString) {
        const date = new Date(dateString + "T00:00:00");
        return date.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short"
        });
    }
});
