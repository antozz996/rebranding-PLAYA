document.addEventListener("DOMContentLoaded", async function () {
    const statusBox = document.getElementById("vipBookingStatus");
    const form = document.getElementById("vipBookingForm");
    const submitButton = document.getElementById("vipBookingSubmit");
    const gateBox = document.getElementById("vipBookingGate");
    const gateStatus = document.getElementById("vipBookingGateStatus");
    const profileName = document.getElementById("vipBookingProfileName");
    const profileLevel = document.getElementById("vipBookingProfileLevel");

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

    let currentStatus = null;

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

        currentStatus = profile.status;
        if (profileName) {
            profileName.textContent = profile.display_name || profile.full_name || "Profilo VIP";
        }
        if (profileLevel) {
            profileLevel.textContent = profile.vip_level || "SILVER";
        }

        if (gateBox) {
            gateBox.hidden = false;
        }

        if (currentStatus === "IN_OSSERVAZIONE") {
            if (gateStatus) {
                gateStatus.textContent = "Il tuo profilo puo consultare la card, ma non puo ancora inviare richieste di prenotazione dedicate.";
            }
            disableForm();
            return;
        }

        if (!["APPROVATO", "VIP"].includes(currentStatus)) {
            if (gateStatus) {
                gateStatus.textContent = "Il tuo profilo non e abilitato alla richiesta VIP in questo momento.";
            }
            disableForm();
            return;
        }

        if (gateStatus) {
            gateStatus.textContent = "Il tuo profilo e pronto per inviare una richiesta di prenotazione VIP.";
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

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!["APPROVATO", "VIP"].includes(currentStatus)) {
            return;
        }

        window.FDAVip.hideStatus(statusBox);
        submitButton.disabled = true;
        submitButton.textContent = "Invio richiesta...";

        const payload = {
            p_token: token,
            p_booking_date: form.booking_date.value,
            p_time_slot: form.time_slot.value,
            p_adults: Number(form.adults.value),
            p_children: Number(form.children.value || 0),
            p_area_preference: form.area_preference.value,
            p_notes: form.client_notes.value
        };

        try {
            const { data, error } = await supabaseClient.rpc("create_booking_vip", payload);

            if (error) {
                throw error;
            }

            const result = Array.isArray(data) ? data[0] : data;
            if (!result || !result.booking_id) {
                throw new Error("Risposta prenotazione non valida.");
            }

            window.FDAVip.showStatus(
                statusBox,
                "Richiesta inviata correttamente. Il nostro staff la prendera in carico a breve.",
                "success"
            );

            form.reset();
        } catch (err) {
            window.FDAVip.showStatus(
                statusBox,
                humanizeBookingError(err),
                "error"
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Invia richiesta VIP";
        }
    });

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
        if (message.includes("fascia oraria")) {
            return "Seleziona una fascia oraria valida per la richiesta.";
        }
        if (message.includes("numero adulti")) {
            return "Indica almeno un adulto per completare la richiesta.";
        }
        if (message.includes("stato corrente del profilo")) {
            return "Il tuo profilo non puo inviare richieste VIP in questo momento.";
        }
        if (message.includes("sessione cliente")) {
            return "La sessione non e piu valida. Effettua di nuovo l'accesso.";
        }

        return "Non riusciamo a completare la richiesta in questo momento. Riprova tra poco.";
    }
});
