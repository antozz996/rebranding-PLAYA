document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("vipVerifyForm");
    const statusBox = document.getElementById("vipVerifyStatus");
    const submitButton = document.getElementById("vipVerifySubmit");
    const resultBox = document.getElementById("vipVerifyResult");
    const codeInput = document.getElementById("verify_card_code");

    if (!form || !window.FDAVip) {
        return;
    }

    if (!window.FDAVip.ensureConfigured(statusBox)) {
        if (submitButton) {
            submitButton.disabled = true;
        }
        return;
    }

    const supabaseClient = window.FDAVip.getSupabaseClient();
    if (!supabaseClient) {
        window.FDAVip.showStatus(
            statusBox,
            "Client Supabase non disponibile. Controlla la configurazione del frontend.",
            "error"
        );
        if (submitButton) {
            submitButton.disabled = true;
        }
        return;
    }

    const initialCode = getCodeFromQuery();
    if (initialCode && codeInput) {
        codeInput.value = initialCode;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        await verifyCard();
    });

    if (initialCode) {
        verifyCard();
    }

    async function verifyCard() {
        const cardCode = window.FDAVip.normalizeCardCode(codeInput ? codeInput.value : "");
        if (!cardCode) {
            window.FDAVip.showStatus(
                statusBox,
                "Inserisci un codice card valido per procedere con la verifica.",
                "error"
            );
            return;
        }

        window.FDAVip.hideStatus(statusBox);
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Verifica in corso...";
        }

        try {
            const { data, error } = await supabaseClient.rpc("verify_client_by_staff", {
                p_card_code: cardCode
            });

            if (error) {
                throw error;
            }

            const profile = Array.isArray(data) ? data[0] : data;
            if (!profile) {
                window.FDAVip.showStatus(
                    statusBox,
                    "Nessun profilo trovato per questo codice card.",
                    "error"
                );
                if (resultBox) {
                    resultBox.hidden = true;
                }
                return;
            }

            hydrateResult(profile);
            if (resultBox) {
                resultBox.hidden = false;
            }

            window.FDAVip.showStatus(
                statusBox,
                "Verifica completata correttamente.",
                "success"
            );
        } catch (err) {
            if (resultBox) {
                resultBox.hidden = true;
            }

            window.FDAVip.showStatus(
                statusBox,
                humanizeVerifyError(err),
                "error"
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Verifica card";
            }
        }
    }

    function hydrateResult(profile) {
        const preferredName = profile.full_name || "Cliente verificato";
        const photoNode = document.getElementById("vipVerifyPhoto");
        const fallbackNode = document.getElementById("vipVerifyPhotoFallback");
        const pillNode = document.getElementById("vipVerifyStatusPill");

        setText("vipVerifyClientName", preferredName);
        setText("vipVerifyCardCode", profile.card_code || "-");
        setText("vipVerifyLevel", profile.vip_level || "-");
        setText("vipVerifyWarnings", String(profile.warnings_count ?? 0));
        setText("vipVerifyPhone", profile.phone || "-");
        setText("vipVerifyProfileStatus", humanizeStatus(profile.status));

        if (pillNode) {
            pillNode.textContent = humanizeStatus(profile.status);
            pillNode.classList.remove("is-vip", "is-approved", "is-watch");

            if (profile.status === "VIP") {
                pillNode.classList.add("is-vip");
            } else if (profile.status === "APPROVATO") {
                pillNode.classList.add("is-approved");
            } else {
                pillNode.classList.add("is-watch");
            }
        }

        if (fallbackNode) {
            fallbackNode.textContent = window.FDAVip.getInitials(preferredName);
            fallbackNode.hidden = false;
        }

        if (photoNode) {
            const photoPath = String(profile.photo_path || "").trim();
            if (photoPath) {
                photoNode.src = photoPath;
                photoNode.hidden = false;
                if (fallbackNode) {
                    fallbackNode.hidden = true;
                }
            } else {
                photoNode.removeAttribute("src");
                photoNode.hidden = true;
            }
        }
    }

    function humanizeStatus(status) {
        const labels = {
            APPROVATO: "Profilo approvato",
            VIP: "Profilo VIP attivo",
            IN_OSSERVAZIONE: "Profilo in osservazione",
            DA_VERIFICARE: "Da verificare",
            SOSPESO: "Profilo sospeso",
            ARCHIVIATO: "Profilo archiviato"
        };

        return labels[status] || "Profilo riservato";
    }

    function humanizeVerifyError(err) {
        const message = String(err && (err.message || err)).toLowerCase();

        if (message.includes("solo allo staff autenticato")) {
            return "Questa verifica e riservata allo staff autenticato in Supabase.";
        }

        return "Non riusciamo a completare la verifica in questo momento.";
    }

    function getCodeFromQuery() {
        const params = new URLSearchParams(window.location.search);
        return params.get("code") || "";
    }

    function setText(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = value;
        }
    }
});
