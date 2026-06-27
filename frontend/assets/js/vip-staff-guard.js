(function () {
    const state = {
        lastResult: null
    };

    function getSupabaseClient() {
        return window.FDAVip ? window.FDAVip.getSupabaseClient() : null;
    }

    async function checkStaffSession() {
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            return buildResult(false, null, false, false, "Client Supabase non disponibile.");
        }

        const { data } = await supabaseClient.auth.getSession();
        const session = data ? data.session : null;
        if (!session || !session.user) {
            return buildResult(false, null, false, false, "Sessione staff assente.");
        }

        try {
            const [staffResponse, adminResponse] = await Promise.all([
                supabaseClient.rpc("is_staff", {
                    p_user_id: session.user.id
                }),
                supabaseClient.rpc("is_admin", {
                    p_user_id: session.user.id
                })
            ]);

            if (staffResponse.error) {
                throw staffResponse.error;
            }
            if (adminResponse.error) {
                throw adminResponse.error;
            }

            const isStaff = Boolean(staffResponse.data);
            return buildResult(
                isStaff,
                session,
                isStaff,
                Boolean(adminResponse.data),
                isStaff
                    ? "Accesso staff confermato."
                    : "Utente autenticato ma non autorizzato come staff."
            );
        } catch (err) {
            return buildResult(false, session, false, false, "Impossibile verificare il ruolo staff.");
        }
    }

    async function requireStaffPage(options) {
        const settings = Object.assign({
            gateId: "vipStaffGate",
            loginPath: "vip-staff-login.html",
            returnTo: window.location.pathname.split("/").pop() + window.location.search + window.location.hash
        }, options || {});

        setGateState(settings, "checking");

        if (!window.FDAVip || !window.FDAVip.hasValidConfig) {
            const result = buildResult(false, null, false, false, "Configurazione Supabase mancante.");
            state.lastResult = result;
            setGateState(settings, "denied", result);
            return result;
        }

        const result = await checkStaffSession();
        state.lastResult = result;

        if (result.allowed) {
            setGateState(settings, "allowed", result);
            return result;
        }

        setGateState(settings, "denied", result);
        return result;
    }

    function setGateState(settings, phase, result) {
        const body = document.body;
        const gate = document.getElementById(settings.gateId);
        const title = gate ? gate.querySelector("[data-staff-gate-title]") : null;
        const copy = gate ? gate.querySelector("[data-staff-gate-copy]") : null;
        const loginLink = gate ? gate.querySelector("[data-staff-gate-login]") : null;

        if (loginLink) {
            loginLink.href = settings.loginPath + "?returnTo=" + encodeURIComponent(settings.returnTo || "vip-verify.html");
        }

        if (phase === "allowed") {
            body.classList.remove("vip-staff-guard-pending", "vip-staff-guard-denied");
            body.classList.add("vip-staff-guard-allowed");
            if (gate) {
                gate.hidden = true;
            }
            return;
        }

        body.classList.remove("vip-staff-guard-allowed", "vip-staff-guard-pending", "vip-staff-guard-denied");
        body.classList.add(phase === "checking" ? "vip-staff-guard-pending" : "vip-staff-guard-denied");

        if (!gate) {
            return;
        }

        gate.hidden = false;

        if (phase === "checking") {
            setNodeText(title, "Controllo accesso staff");
            setNodeText(copy, "Stiamo verificando la sessione staff prima di mostrare gli strumenti riservati.");
            return;
        }

        setNodeText(title, "Area riservata allo staff");
        setNodeText(
            copy,
            result && result.session
                ? "Questa sessione Supabase non risulta abilitata come staff Fior d'Acqua. Accedi con un account autorizzato."
                : "Questa pagina contiene dati operativi e strumenti admin. Accedi come staff per continuare."
        );
    }

    function buildResult(allowed, session, isStaff, isAdmin, message) {
        return {
            allowed,
            session,
            isStaff,
            isAdmin,
            message
        };
    }

    function setNodeText(node, value) {
        if (node) {
            node.textContent = value;
        }
    }

    window.FDAVipStaffGuard = {
        requireStaffPage,
        checkStaffSession,
        getLastResult: function () {
            return state.lastResult;
        }
    };
})();
