document.addEventListener("DOMContentLoaded", async function () {
    const FALLBACK_RETURN_TO = "vip-verify.html";
    const form = document.getElementById("vipStaffLoginForm");
    const statusBox = document.getElementById("vipStaffLoginStatus");
    const submitButton = document.getElementById("vipStaffLoginSubmit");
    const signOutButton = document.getElementById("vipStaffSignOut");
    const currentUserNode = document.getElementById("vipStaffCurrentUser");
    const sessionCopyNode = document.getElementById("vipStaffSessionCopy");
    const returnLink = document.getElementById("vipStaffReturnLink");

    if (!form || !window.FDAVip) {
        return;
    }

    if (!window.FDAVip.ensureConfigured(statusBox)) {
        disableForm();
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

    const returnTo = getReturnTo();
    if (returnLink) {
        returnLink.href = returnTo;
    }

    await hydrateSessionState();

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = String(form.staff_email.value || "").trim();
        const password = String(form.staff_password.value || "");

        if (!email || !password) {
            window.FDAVip.showStatus(
                statusBox,
                "Inserisci email e password dello staff per continuare.",
                "error"
            );
            return;
        }

        window.FDAVip.hideStatus(statusBox);
        submitButton.disabled = true;
        submitButton.textContent = "Accesso in corso...";

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            if (!data || !data.session) {
                throw new Error("Sessione staff non disponibile.");
            }

            const isStaff = await verifyStaffRole(data.session.user.id);
            if (!isStaff) {
                await supabaseClient.auth.signOut();
                throw new Error("not_staff");
            }

            await hydrateSessionState();

            window.FDAVip.showStatus(
                statusBox,
                "Accesso staff confermato. Ti stiamo portando alla verifica card.",
                "success"
            );

            window.setTimeout(function () {
                window.location.href = returnTo;
            }, 500);
        } catch (err) {
            window.FDAVip.showStatus(
                statusBox,
                humanizeAuthError(err),
                "error"
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Accedi come staff";
        }
    });

    if (signOutButton) {
        signOutButton.addEventListener("click", async function () {
            await supabaseClient.auth.signOut();
            await hydrateSessionState();
            form.reset();
            window.FDAVip.showStatus(
                statusBox,
                "Sessione staff chiusa correttamente.",
                "success"
            );
        });
    }

    async function hydrateSessionState() {
        const { data } = await supabaseClient.auth.getSession();
        const session = data ? data.session : null;

        if (!session) {
            if (currentUserNode) {
                currentUserNode.textContent = "Nessuna sessione attiva";
            }
            if (sessionCopyNode) {
                sessionCopyNode.textContent = "Esegui l'accesso staff per abilitare la verifica card e gli strumenti riservati.";
            }
            return;
        }

        const isStaff = await verifyStaffRole(session.user.id);
        if (!isStaff) {
            await supabaseClient.auth.signOut();
            if (currentUserNode) {
                currentUserNode.textContent = "Sessione non autorizzata";
            }
            if (sessionCopyNode) {
                sessionCopyNode.textContent = "L'utente autenticato non risulta inserito tra gli staff autorizzati.";
            }
            return;
        }

        if (currentUserNode) {
            currentUserNode.textContent = session.user && session.user.email
                ? session.user.email
                : "Staff autenticato";
        }
        if (sessionCopyNode) {
            sessionCopyNode.textContent = "Sessione staff attiva nel browser. Puoi proseguire direttamente con la verifica card.";
        }
    }

    async function verifyStaffRole(userId) {
        if (!userId) {
            return false;
        }

        const { data, error } = await supabaseClient.rpc("is_staff", {
            p_user_id: userId
        });

        if (error) {
            return false;
        }

        return Boolean(data);
    }

    function disableForm() {
        Array.from(form.elements).forEach(function (element) {
            element.disabled = true;
        });
    }

    function getReturnTo() {
        const params = new URLSearchParams(window.location.search);
        return sanitizeReturnTo(params.get("returnTo"));
    }

    function sanitizeReturnTo(value) {
        const rawValue = String(value || "").trim();
        if (!rawValue) {
            return FALLBACK_RETURN_TO;
        }

        if (/^https?:\/\//i.test(rawValue) || rawValue.startsWith("//")) {
            return FALLBACK_RETURN_TO;
        }

        const hashIndex = rawValue.indexOf("#");
        const hashPart = hashIndex >= 0 ? rawValue.slice(hashIndex) : "";
        const withoutHash = hashIndex >= 0 ? rawValue.slice(0, hashIndex) : rawValue;
        const queryIndex = withoutHash.indexOf("?");
        const pathPart = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
        const queryPart = queryIndex >= 0 ? withoutHash.slice(queryIndex) : "";

        if (pathPart !== FALLBACK_RETURN_TO) {
            return FALLBACK_RETURN_TO;
        }

        return pathPart + queryPart + hashPart;
    }

    function humanizeAuthError(err) {
        const message = String(err && (err.message || err)).toLowerCase();

        if (message.includes("invalid login credentials")) {
            return "Email o password staff non corrette.";
        }
        if (message.includes("email not confirmed")) {
            return "L'email staff non risulta ancora confermata.";
        }
        if (message.includes("not_staff")) {
            return "Questo utente non e abilitato come staff Fior d'Acqua.";
        }

        return "Non riusciamo a completare l'accesso staff in questo momento.";
    }
});
