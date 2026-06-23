document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("vipLoginForm");
    const statusBox = document.getElementById("vipLoginStatus");
    const submitButton = document.getElementById("vipLoginSubmit");

    if (!form || !window.FDAVip) {
        return;
    }

    window.FDAVip.clearSessionToken();
    window.FDAVip.ensureConfigured(statusBox);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!window.FDAVip.ensureConfigured(statusBox)) {
            return;
        }

        const supabaseClient = window.FDAVip.getSupabaseClient();
        if (!supabaseClient) {
            window.FDAVip.showStatus(
                statusBox,
                "Client Supabase non disponibile. Controlla la configurazione del frontend.",
                "error"
            );
            return;
        }

        const cardCode = window.FDAVip.normalizeCardCode(form.card_code.value);
        const phone = window.FDAVip.normalizePhone(form.phone.value);

        if (!cardCode || !phone) {
            window.FDAVip.showStatus(
                statusBox,
                "Inserisci il codice card e il numero di telefono associato al profilo VIP.",
                "error"
            );
            return;
        }

        window.FDAVip.hideStatus(statusBox);
        submitButton.disabled = true;
        submitButton.textContent = "Accesso in corso...";

        try {
            const { data, error } = await supabaseClient.rpc("client_login", {
                p_card_code: cardCode,
                p_phone: phone
            });

            if (error) {
                throw error;
            }

            const result = Array.isArray(data) ? data[0] : data;
            if (!result) {
                throw new Error("Risposta login non valida.");
            }

            if (!result.success || !result.session_token) {
                window.FDAVip.showStatus(
                    statusBox,
                    result.message || "Accesso non disponibile in questo momento.",
                    "error"
                );
                return;
            }

            window.FDAVip.saveSessionToken(result.session_token);
            window.FDAVip.showStatus(
                statusBox,
                "Accesso confermato. Ti stiamo accompagnando alla tua card digitale.",
                "success"
            );

            window.setTimeout(function () {
                window.location.href = "vip-card.html";
            }, 500);
        } catch (err) {
            window.FDAVip.showStatus(
                statusBox,
                "Al momento non riusciamo a completare l'accesso. Riprova tra qualche istante.",
                "error"
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Accedi alla card";
        }
    });
});
