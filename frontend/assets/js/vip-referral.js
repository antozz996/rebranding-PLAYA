document.addEventListener("DOMContentLoaded", async function () {
    const statusBox = document.getElementById("vipReferralStatus");
    const form = document.getElementById("vipReferralForm");
    const submitButton = document.getElementById("vipReferralSubmit");
    const gateBox = document.getElementById("vipReferralGate");
    const gateStatus = document.getElementById("vipReferralGateStatus");
    const profileName = document.getElementById("vipReferralProfileName");
    const profileLevel = document.getElementById("vipReferralProfileLevel");

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
                gateStatus.textContent = "Il tuo profilo puo vedere la card, ma non puo ancora inviare referral.";
            }
            disableForm();
            return;
        }

        if (!["APPROVATO", "VIP"].includes(currentStatus)) {
            if (gateStatus) {
                gateStatus.textContent = "Il tuo profilo non e abilitato ai referral in questo momento.";
            }
            disableForm();
            return;
        }

        if (gateStatus) {
            gateStatus.textContent = "Il tuo profilo puo inviare una segnalazione riservata allo staff.";
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
        submitButton.textContent = "Invio segnalazione...";

        const payload = {
            p_token: token,
            p_referred_full_name: form.referred_full_name.value,
            p_referred_phone: form.referred_phone.value,
            p_referred_notes: form.referred_notes.value
        };

        try {
            const { data, error } = await supabaseClient.rpc("create_referral_vip", payload);

            if (error) {
                throw error;
            }

            const result = Array.isArray(data) ? data[0] : data;
            if (!result || !result.referral_id) {
                throw new Error("Risposta referral non valida.");
            }

            window.FDAVip.showStatus(
                statusBox,
                "Segnalazione inviata correttamente. Il nostro staff la valutera in modo riservato.",
                "success"
            );

            form.reset();
        } catch (err) {
            window.FDAVip.showStatus(
                statusBox,
                humanizeReferralError(err),
                "error"
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Invia segnalazione";
        }
    });

    function disableForm() {
        Array.from(form.elements).forEach(function (element) {
            element.disabled = true;
        });
    }

    function humanizeReferralError(err) {
        const message = String(err && (err.message || err)).toLowerCase();

        if (message.includes("nome dell'ospite")) {
            return "Inserisci il nome dell'ospite da segnalare.";
        }
        if (message.includes("stato corrente del profilo")) {
            return "Il tuo profilo non puo inviare referral in questo momento.";
        }
        if (message.includes("sessione cliente")) {
            return "La sessione non e piu valida. Effettua di nuovo l'accesso.";
        }

        return "Non riusciamo a inviare la segnalazione in questo momento. Riprova tra poco.";
    }
});
