document.addEventListener("DOMContentLoaded", async function () {
    const statusBox = document.getElementById("vipBookingStatus");
    const mapStatusBox = document.getElementById("vipBookingMapStatus");
    const form = document.getElementById("vipBookingForm");
    const submitButton = document.getElementById("vipBookingSubmit");
    const gateBox = document.getElementById("vipBookingGate");
    const gateStatus = document.getElementById("vipBookingGateStatus");
    const profileName = document.getElementById("vipBookingProfileName");
    const profileLevel = document.getElementById("vipBookingProfileLevel");
    const dateInput = document.getElementById("booking_date");
    const mapRefreshButton = document.getElementById("vipBookingMapRefresh");
    const selectionPill = document.getElementById("vipBookingSelectionPill");
    const mapTitle = document.getElementById("vipBookingMapTitle");
    const mapMeta = document.getElementById("vipBookingMapMeta");
    const mapGrid = document.getElementById("vipBookingMapGrid");
    const selectionCard = document.getElementById("vipBookingSelectionCard");
    const selectionCode = document.getElementById("vipBookingSelectedSpotCode");
    const selectionLabel = document.getElementById("vipBookingSelectedSpotLabel");
    const selectionMeta = document.getElementById("vipBookingSelectedSpotMeta");
    const spotIdInput = document.getElementById("vipBookingSpotId");
    const resetSelectionButton = document.getElementById("vipBookingResetSelection");
    const passPanel = document.getElementById("vipBookingPassPanel");
    const passIdNode = document.getElementById("vipBookingPassId");
    const passSummaryNode = document.getElementById("vipBookingPassSummary");
    const passStatusNode = document.getElementById("vipBookingPassStatus");
    const qrImageNode = document.getElementById("vipBookingQrImage");
    const staffLinkNode = document.getElementById("vipBookingStaffLink");
    const emailStatusNode = document.getElementById("vipBookingEmailStatus");

    if (!window.FDAVip || !form) {
        return;
    }

    if (!window.FDAVip.ensureConfigured(statusBox)) {
        disableForm();
        return;
    }

    const token = window.FDAVip.getSessionToken();
    if (!token) {
        window.FDAVip.redirectToLogin();
        return;
    }

    const supabaseClient = window.FDAVip.getSupabaseClient();
    if (!supabaseClient) {
        window.FDAVip.showStatus(
            statusBox,
            "Client Supabase non disponibile. Controlla la configurazione del frontend.",
            "error"
        );
        disableForm();
        return;
    }

    const state = {
        currentStatus: null,
        rows: [],
        selectedSpotId: "",
        selectedDate: ""
    };

    // Default rules configuration
    const rules = {
        booking_enabled: "true",
        max_days_advance: "30",
        same_day_cutoff_hour: "12",
        max_guests_per_spot: "4"
    };

    try {
        const { data: rulesData } = await supabaseClient
            .from("booking_rules")
            .select("key, value");
        if (rulesData && rulesData.length) {
            rulesData.forEach(function (rule) {
                rules[rule.key] = rule.value;
            });
        }
    } catch (e) {
        console.error("Non è stato possibile caricare le regole di prenotazione dal database.", e);
    }

    if (rules.booking_enabled !== "true") {
        window.FDAVip.showStatus(statusBox, "Le prenotazioni online sono momentaneamente sospese dallo staff.", "error");
        if (gateStatus) {
            gateStatus.textContent = "Le prenotazioni online sono momentaneamente sospese dallo staff.";
        }
        disableForm();
        return;
    }

    if (dateInput) {
        const today = new Date();
        dateInput.min = formatDateForInput(today);

        const maxDays = Number(rules.max_days_advance || 30);
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + maxDays);
        dateInput.max = formatDateForInput(maxDate);
    }

    try {
        const { data, error } = await supabaseClient.rpc("get_client_profile", {
            p_token: token
        });

        if (error) {
            throw error;
        }

        const profile = Array.isArray(data) ? data[0] : data;
        if (!profile) {
            throw new Error("Profilo non disponibile.");
        }

        state.currentStatus = profile.status;

        if (profileName) {
            profileName.textContent = profile.display_name || profile.full_name || "Profilo VIP";
        }
        if (profileLevel) {
            profileLevel.textContent = profile.vip_level || "SILVER";
        }
        if (gateBox) {
            gateBox.hidden = false;
        }

        if (state.currentStatus === "IN_OSSERVAZIONE") {
            if (gateStatus) {
                gateStatus.textContent = "Il tuo profilo puo consultare la card, ma non puo ancora prenotare una postazione dedicata.";
            }
            disableForm();
            return;
        }

        if (!["APPROVATO", "VIP"].includes(state.currentStatus)) {
            if (gateStatus) {
                gateStatus.textContent = "Il tuo profilo non e abilitato alla prenotazione VIP in questo momento.";
            }
            disableForm();
            return;
        }

        if (gateStatus) {
            gateStatus.textContent = "Il tuo profilo e pronto per scegliere una postazione precisa sulla mappa del giorno.";
        }
    } catch (err) {
        window.FDAVip.clearSessionToken();
        window.FDAVip.showStatus(
            statusBox,
            "La tua sessione non e piu disponibile. Effettua di nuovo l'accesso per proseguire.",
            "error"
        );
        disableForm();
        window.setTimeout(function () {
            window.FDAVip.redirectToLogin();
        }, 1400);
        return;
    }

    bindEvents();
    renderEmptyMap("Scegli una data per caricare la piantina prenotabile.");
    resetSelection();

    function bindEvents() {
        form.addEventListener("submit", onSubmit);

        if (dateInput) {
            dateInput.addEventListener("change", function () {
                loadBookingMap(dateInput.value);
            });
        }

        if (mapRefreshButton) {
            mapRefreshButton.addEventListener("click", function () {
                loadBookingMap(dateInput ? dateInput.value : "");
            });
        }

        if (resetSelectionButton) {
            resetSelectionButton.addEventListener("click", resetSelection);
        }
    }

    async function loadBookingMap(dateValue) {
        if (!["APPROVATO", "VIP"].includes(state.currentStatus)) {
            return;
        }

        const normalizedDate = String(dateValue || "").trim();
        state.selectedDate = normalizedDate;
        resetSelection();

        if (!normalizedDate) {
            renderEmptyMap("Scegli una data per caricare la piantina prenotabile.");
            window.FDAVip.hideStatus(mapStatusBox);
            return;
        }

        const todayStr = formatDateForInput(new Date());
        if (normalizedDate === todayStr) {
            const currentHour = new Date().getHours();
            const cutoffHour = Number(rules.same_day_cutoff_hour || 12);
            if (currentHour >= cutoffHour) {
                renderEmptyMap("Prenotazioni per oggi chiuse.");
                window.FDAVip.showStatus(
                    mapStatusBox,
                    "Non è più consentito prenotare online per la giornata odierna dopo le ore " + cutoffHour + ":00.",
                    "error"
                );
                if (mapTitle) {
                    mapTitle.textContent = "Chiuso per oggi";
                }
                return;
            }
        }

        window.FDAVip.hideStatus(mapStatusBox);
        mapGrid.innerHTML = "<div class='vip-admin-empty-inline'>Carichiamo la piantina aggiornata del giorno...</div>";
        if (mapTitle) {
            mapTitle.textContent = "Caricamento in corso";
        }

        try {
            const { data, error } = await supabaseClient.rpc("get_booking_map_for_date", {
                p_booking_date: normalizedDate
            });

            if (error) {
                throw error;
            }

            state.rows = Array.isArray(data) ? data : [];

            if (!state.rows.length) {
                renderEmptyMap("Non ci sono postazioni configurate per questa data.");
                window.FDAVip.showStatus(
                    mapStatusBox,
                    "Nessuna postazione disponibile nella configurazione attiva del giorno selezionato.",
                    "error"
                );
                return;
            }

            renderMap(state.rows, normalizedDate);
            window.FDAVip.showStatus(
                mapStatusBox,
                buildAvailabilityMessage(state.rows),
                "success"
            );
        } catch (err) {
            state.rows = [];
            renderEmptyMap("Non riusciamo a leggere la mappa in questo momento.");
            window.FDAVip.showStatus(
                mapStatusBox,
                "Non riusciamo a caricare la piantina del giorno. Riprova tra poco.",
                "error"
            );
        }
    }

    function renderMap(rows, dateValue) {
        const groupedRows = groupByRow(rows);
        const freeSpots = rows.filter(function (row) {
            return row.final_status === "DISPONIBILE" && row.is_bookable;
        }).length;

        if (mapTitle) {
            mapTitle.textContent = "Piantina del " + formatDateLabel(dateValue);
        }
        if (mapMeta) {
            mapMeta.textContent = freeSpots + " postazioni prenotabili adesso, aggiornate in tempo reale.";
        }
        if (selectionPill) {
            selectionPill.textContent = freeSpots ? freeSpots + " postazioni libere" : "Nessuna postazione libera";
        }

        mapGrid.innerHTML = "";

        groupedRows.forEach(function (group) {
            const rowShell = document.createElement("section");
            rowShell.className = "vip-beach-row";

            const rowLabel = document.createElement("div");
            rowLabel.className = "vip-beach-row-label";
            rowLabel.innerHTML =
                "<strong>Fila " + escapeHtml(group.rowName) + "</strong>" +
                "<span>" + escapeHtml(group.zoneLabel) + "</span>";

            const rowSpots = document.createElement("div");
            rowSpots.className = "vip-beach-row-spots";

            group.spots.forEach(function (spot) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = buildSpotClassName(spot, false);
                button.disabled = !spot.is_bookable;
                button.setAttribute("data-spot-id", spot.spot_id);
                button.innerHTML =
                    "<strong>" + escapeHtml(spot.spot_code) + "</strong>" +
                    "<span>" + escapeHtml(spot.label || spot.zone || "Postazione") + "</span>" +
                    "<small>" + escapeHtml(getSpotMetaLabel(spot)) + "</small>";

                button.addEventListener("click", function () {
                    selectSpot(spot);
                });

                rowSpots.appendChild(button);
            });

            rowShell.appendChild(rowLabel);
            rowShell.appendChild(rowSpots);
            mapGrid.appendChild(rowShell);
        });
    }

    function renderEmptyMap(message) {
        if (mapTitle) {
            mapTitle.textContent = "Seleziona prima la data";
        }
        if (mapMeta) {
            mapMeta.textContent = "Le postazioni vengono aggiornate in base alla disponibilita del giorno.";
        }
        if (selectionPill) {
            selectionPill.textContent = "Seleziona una data";
        }
        mapGrid.innerHTML = "<div class='vip-admin-empty-inline'>" + escapeHtml(message) + "</div>";
    }

    function selectSpot(spot) {
        if (!spot || !spot.spot_id) {
            return;
        }

        if (!spot.is_bookable || spot.final_status !== "DISPONIBILE") {
            window.FDAVip.showStatus(
                mapStatusBox,
                "Questa postazione non e prenotabile in questo momento.",
                "error"
            );
            return;
        }

        state.selectedSpotId = spot.spot_id;

        if (spotIdInput) {
            spotIdInput.value = spot.spot_id;
        }
        if (selectionCode) {
            selectionCode.textContent = spot.spot_code || "-";
        }
        if (selectionLabel) {
            selectionLabel.textContent = (spot.label || "Postazione") + " · " + (spot.zone || "Area");
        }
        if (selectionMeta) {
            selectionMeta.textContent = getSpotMetaLabel(spot) + " · disponibile per intera giornata.";
        }
        if (selectionPill) {
            selectionPill.textContent = "Postazione " + (spot.spot_code || "selezionata");
        }
        if (selectionCard) {
            selectionCard.classList.add("is-selected");
        }

        refreshSelectionStyles();
        window.FDAVip.showStatus(
            mapStatusBox,
            "Postazione " + (spot.spot_code || "") + " selezionata. Puoi completare la richiesta.",
            "success"
        );
    }

    function resetSelection() {
        state.selectedSpotId = "";

        if (spotIdInput) {
            spotIdInput.value = "";
        }
        if (selectionCode) {
            selectionCode.textContent = "-";
        }
        if (selectionLabel) {
            selectionLabel.textContent = "Nessuna postazione selezionata";
        }
        if (selectionMeta) {
            selectionMeta.textContent = "La configurazione del giorno apparira qui dopo il click sulla mappa.";
        }
        if (selectionCard) {
            selectionCard.classList.remove("is-selected");
        }

        refreshSelectionStyles();
    }

    async function onSubmit(event) {
        event.preventDefault();

        if (!["APPROVATO", "VIP"].includes(state.currentStatus)) {
            return;
        }

        if (!dateInput || !String(dateInput.value || "").trim()) {
            window.FDAVip.showStatus(statusBox, "Scegli prima la data della prenotazione.", "error");
            return;
        }

        if (!spotIdInput || !spotIdInput.value) {
            window.FDAVip.showStatus(statusBox, "Seleziona una postazione precisa dalla mappa prima di inviare la richiesta.", "error");
            return;
        }

        const adultsCount = Number(form.adults.value || 0);
        const childrenCount = Number(form.children.value || 0);
        const totalGuests = adultsCount + childrenCount;
        const maxGuestsLimit = Number(rules.max_guests_per_spot || 4);

        if (totalGuests > maxGuestsLimit) {
            window.FDAVip.showStatus(statusBox, "Capienza massima superata: massimo " + maxGuestsLimit + " persone consentite per questa postazione.", "error");
            return;
        }

        window.FDAVip.hideStatus(statusBox);
        submitButton.disabled = true;
        submitButton.textContent = "Invio richiesta...";

        const selectedSpot = state.rows.find(function (row) {
            return row.spot_id === spotIdInput.value;
        }) || null;

        try {
            const { data, error } = await supabaseClient.rpc("create_spot_booking", {
                p_token: token,
                p_booking_date: dateInput.value,
                p_spot_id: spotIdInput.value,
                p_adults: Number(form.adults.value),
                p_children: Number(form.children.value || 0),
                p_client_notes: form.client_notes.value
            });

            if (error) {
                throw error;
            }

            const result = Array.isArray(data) ? data[0] : data;
            if (!result || !result.booking_id) {
                throw new Error("Risposta prenotazione non valida.");
            }

            window.FDAVip.showStatus(
                statusBox,
                "Richiesta inviata correttamente per la postazione " + (result.spot_code || "") + ". Lo staff la prendera in carico a breve.",
                "success"
            );

            hydrateBookingPass(result, selectedSpot);
            await sendBookingEmail(result.booking_id);

            form.adults.value = "2";
            form.children.value = "0";
            form.client_notes.value = "";
            await loadBookingMap(dateInput.value);
        } catch (err) {
            window.FDAVip.showStatus(statusBox, humanizeBookingError(err), "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Invia richiesta VIP";
        }
    }

    function hydrateBookingPass(result, selectedSpot) {
        if (!passPanel || !result || !result.booking_id) {
            return;
        }

        const bookingDate = dateInput ? dateInput.value : "";
        const staffUrl = window.FDAVip.buildBookingStaffUrl(result.booking_id, bookingDate);
        const qrUrl = window.FDAVip.buildQrImageUrl(staffUrl, 260);
        const spotCode = result.spot_code || (selectedSpot ? selectedSpot.spot_code : "");
        const peopleLabel = String(form.adults.value || "0") + " adulti, " + String(form.children.value || "0") + " bambini";

        if (passIdNode) {
            passIdNode.textContent = result.booking_id;
        }
        if (passSummaryNode) {
            passSummaryNode.textContent = [
                formatDateLabel(bookingDate),
                spotCode ? "postazione " + spotCode : "postazione selezionata",
                peopleLabel
            ].join(" · ");
        }
        if (passStatusNode) {
            passStatusNode.textContent = "Richiesta in attesa";
        }
        if (qrImageNode) {
            qrImageNode.src = qrUrl;
        }
        if (staffLinkNode) {
            staffLinkNode.href = staffUrl;
        }
        if (emailStatusNode) {
            emailStatusNode.textContent = "Stiamo provando a inviare il QR all'email salvata sul profilo.";
        }

        passPanel.hidden = false;
        passPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    async function sendBookingEmail(bookingId) {
        const functionName = window.FDAVip.getBookingEmailFunctionName();
        if (!functionName || !bookingId) {
            setEmailStatus("QR creato. Invio email non configurato su questo ambiente.");
            return;
        }

        try {
            const { data, error } = await supabaseClient.functions.invoke(functionName, {
                body: {
                    token,
                    booking_id: bookingId
                }
            });

            if (error) {
                throw error;
            }

            if (data && data.success) {
                setEmailStatus("Email inviata al recapito presente sul profilo cliente.");
                return;
            }

            if (data && data.skipped) {
                setEmailStatus(data.message || "QR creato. Email non inviata per configurazione o recapito mancante.");
                return;
            }

            setEmailStatus("QR creato. Email non confermata dal servizio.");
        } catch (err) {
            setEmailStatus("QR creato. Email non ancora attiva: configura/deploya la Edge Function vip-booking-email.");
        }
    }

    function setEmailStatus(message) {
        if (emailStatusNode) {
            emailStatusNode.textContent = message;
        }
    }

    function refreshSelectionStyles() {
        Array.from(document.querySelectorAll(".vip-beach-spot")).forEach(function (button) {
            const isSelected = button.getAttribute("data-spot-id") === state.selectedSpotId;
            button.classList.toggle("is-selected", Boolean(isSelected));
        });
    }

    function groupByRow(rows) {
        const groups = [];
        const map = new Map();

        rows.forEach(function (row) {
            const key = row.row_name || "A";
            if (!map.has(key)) {
                const bucket = {
                    rowName: key,
                    zoneLabel: row.zone || "Area VIP",
                    spots: []
                };
                map.set(key, bucket);
                groups.push(bucket);
            }
            map.get(key).spots.push(row);
        });

        return groups;
    }

    function buildAvailabilityMessage(rows) {
        const available = rows.filter(function (row) {
            return row.final_status === "DISPONIBILE" && row.is_bookable;
        }).length;
        const reserved = rows.filter(function (row) {
            return row.final_status === "RISERVATA";
        }).length;
        const blocked = rows.filter(function (row) {
            return row.final_status === "BLOCCATA";
        }).length;
        const maintenance = rows.filter(function (row) {
            return row.final_status === "MANUTENZIONE";
        }).length;

        return [
            available + " disponibili",
            reserved + " occupate",
            blocked + " bloccate",
            maintenance + " in manutenzione"
        ].join(" · ");
    }

    function buildSpotClassName(spot, isAdmin) {
        const classNames = ["vip-beach-spot"];
        const status = String(spot.final_status || "").toUpperCase();

        if (status === "DISPONIBILE") {
            classNames.push("is-available");
        } else if (status === "OCCUPATA") {
            classNames.push("is-booked");
        } else if (status === "RISERVATA") {
            classNames.push("is-occupied");
        } else if (status === "MANUTENZIONE") {
            classNames.push("is-maintenance");
        } else {
            classNames.push("is-blocked");
        }

        if (isAdmin) {
            classNames.push("is-admin");
        }
        if (spot.spot_id === state.selectedSpotId) {
            classNames.push("is-selected");
        }

        return classNames.join(" ");
    }

    function getSpotMetaLabel(spot) {
        const umbrellas = Number.isFinite(Number(spot.umbrellas)) ? Number(spot.umbrellas) : 0;
        const sunbeds = Number.isFinite(Number(spot.sunbeds)) ? Number(spot.sunbeds) : 0;
        return umbrellas + " ombrelloni · " + sunbeds + " lettini";
    }

    function disableForm() {
        Array.from(form.elements).forEach(function (element) {
            element.disabled = true;
        });
    }

    function humanizeBookingError(err) {
        const message = String(err && (err.message || err)).toLowerCase();

        if (message.includes("data di prenotazione")) {
            return "Scegli una data valida, non nel passato.";
        }
        if (message.includes("postazione selezionata")) {
            return "La postazione scelta non e valida o non e piu disponibile. Aggiorna la piantina e prova di nuovo.";
        }
        if (message.includes("numero adulti")) {
            return "Indica almeno un adulto per completare la richiesta.";
        }
        if (message.includes("numero bambini")) {
            return "Controlla il numero di bambini inserito.";
        }
        if (message.includes("stato corrente del profilo")) {
            return "Il tuo profilo non puo inviare richieste VIP in questo momento.";
        }
        if (message.includes("sessione cliente")) {
            return "La sessione non e piu valida. Effettua di nuovo l'accesso.";
        }

        return "Non riusciamo a completare la richiesta in questo momento. Riprova tra poco.";
    }

    function setDateValue(dateString) {
        if (dateInput) {
            dateInput.value = dateString;
        }
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

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    const initialDate = formatDateForInput(new Date());
    setDateValue(initialDate);
    loadBookingMap(initialDate);
});
