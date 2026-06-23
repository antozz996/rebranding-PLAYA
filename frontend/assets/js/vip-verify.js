document.addEventListener("DOMContentLoaded", async function () {
    const form = document.getElementById("vipVerifyForm");
    const statusBox = document.getElementById("vipVerifyStatus");
    const submitButton = document.getElementById("vipVerifySubmit");
    const resultBox = document.getElementById("vipVerifyResult");
    const codeInput = document.getElementById("verify_card_code");
    const accessStateNode = document.getElementById("vipVerifyAccessState");
    const signOutButton = document.getElementById("vipVerifySignOut");
    const loginLink = document.getElementById("vipVerifyLoginLink");

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
    const returnTo = buildReturnTo();

    if (loginLink) {
        loginLink.href = "vip-staff-login.html?returnTo=" + encodeURIComponent(returnTo);
    }

    if (initialCode && codeInput) {
        codeInput.value = initialCode;
    }

    await hydrateAccessState();

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        await verifyCard();
    });

    if (signOutButton) {
        signOutButton.addEventListener("click", async function () {
            await supabaseClient.auth.signOut();
            await hydrateAccessState();
            if (resultBox) {
                resultBox.hidden = true;
            }
            window.FDAVip.showStatus(
                statusBox,
                "Sessione staff chiusa. Per nuove verifiche serve un nuovo accesso.",
                "success"
            );
        });
    }

    if (initialCode) {
        verifyCard();
    }

    async function verifyCard() {
        const isStaffAuthenticated = await hasStaffSession();
        if (!isStaffAuthenticated) {
            if (resultBox) {
                resultBox.hidden = true;
            }
            window.FDAVip.showStatus(
                statusBox,
                "Per verificare una card devi prima aprire l'accesso staff in questo browser.",
                "error"
            );
            return;
        }

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
                resolveStaffPhotoUrl(photoPath).then(function (resolvedUrl) {
                    if (resolvedUrl) {
                        photoNode.src = resolvedUrl;
                        photoNode.hidden = false;
                        if (fallbackNode) {
                            fallbackNode.hidden = true;
                        }
                        return;
                    }

                    photoNode.removeAttribute("src");
                    photoNode.hidden = true;
                    if (fallbackNode) {
                        fallbackNode.hidden = false;
                    }
                });
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

        if (
            message.includes("solo allo staff autenticato") ||
            message.includes("permission denied") ||
            message.includes("jwt") ||
            message.includes("42501") ||
            message.includes("not authenticated")
        ) {
            return "Questa verifica e riservata allo staff autenticato. Apri prima l'accesso staff in questo browser.";
        }

        return "Non riusciamo a completare la verifica in questo momento.";
    }

    async function hydrateAccessState() {
        const { data } = await supabaseClient.auth.getSession();
        const session = data ? data.session : null;

        if (!accessStateNode) {
            return;
        }

        if (!session) {
            accessStateNode.textContent = "Nessuna sessione staff attiva nel browser.";
            return;
        }

        accessStateNode.textContent = session.user && session.user.email
            ? "Sessione attiva: " + session.user.email
            : "Sessione staff attiva.";
    }

    async function hasStaffSession() {
        const { data } = await supabaseClient.auth.getSession();
        return Boolean(data && data.session);
    }

    async function resolveStaffPhotoUrl(photoPath) {
        const cleanPath = String(photoPath || "").trim();
        if (!cleanPath) {
            return null;
        }

        if (/^https?:\/\//i.test(cleanPath)) {
            return cleanPath;
        }

        const normalizedPath = cleanPath
            .replace(/^\/+/, "")
            .replace(/^client-photos\//, "");

        const { data, error } = await supabaseClient.storage
            .from("client-photos")
            .createSignedUrl(normalizedPath, 60 * 20);

        if (error || !data || !data.signedUrl) {
            return null;
        }

        return data.signedUrl;
    }

    function getCodeFromQuery() {
        const params = new URLSearchParams(window.location.search);
        return params.get("code") || "";
    }

    function buildReturnTo() {
        return "vip-verify.html" + window.location.search;
    }

    function setText(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = value;
        }
    }
});
