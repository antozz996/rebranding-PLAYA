(function () {
    const config = window.FDA_VIP_CONFIG || {};
    const hasValidConfig =
        typeof config.supabaseUrl === "string" &&
        typeof config.supabaseAnonKey === "string" &&
        config.supabaseUrl &&
        config.supabaseAnonKey &&
        !config.supabaseUrl.includes("INSERISCI_") &&
        !config.supabaseAnonKey.includes("INSERISCI_");

    function getStorageKey() {
        return config.storageKey || "fda_vip_session_token";
    }

    function getSupabaseClient() {
        if (!hasValidConfig) {
            return null;
        }

        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            return null;
        }

        if (!window.__fdaVipSupabase) {
            window.__fdaVipSupabase = window.supabase.createClient(
                config.supabaseUrl,
                config.supabaseAnonKey
            );
        }

        return window.__fdaVipSupabase;
    }

    function saveSessionToken(token) {
        window.sessionStorage.setItem(getStorageKey(), token);
    }

    function getSessionToken() {
        return window.sessionStorage.getItem(getStorageKey());
    }

    function clearSessionToken() {
        window.sessionStorage.removeItem(getStorageKey());
    }

    function redirectToLogin() {
        window.location.href = "vip-login.html";
    }

    function redirectToStaffLogin(returnTo) {
        const target = returnTo || window.location.pathname.split("/").pop() || "vip-verify.html";
        window.location.href = "vip-staff-login.html?returnTo=" + encodeURIComponent(target);
    }

    function showStatus(target, message, type) {
        if (!target) {
            return;
        }

        target.textContent = message;
        target.classList.remove("error", "success");
        if (type) {
            target.classList.add(type);
        }
        target.classList.add("visible");
    }

    function hideStatus(target) {
        if (!target) {
            return;
        }

        target.textContent = "";
        target.classList.remove("error", "success", "visible");
    }

    function ensureConfigured(statusTarget) {
        if (hasValidConfig) {
            return true;
        }

        showStatus(
            statusTarget,
            "Configura prima SUPABASE_URL e SUPABASE_ANON_KEY nel file assets/js/vip-club-config.js.",
            "error"
        );
        return false;
    }

    function normalizeCardCode(value) {
        return String(value || "").trim().toUpperCase();
    }

    function normalizePhone(value) {
        return String(value || "").trim();
    }

    function getPhotoFunctionName() {
        return config.photoFunctionName || "vip-client-photo";
    }

    function getInitials(value) {
        const clean = String(value || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!clean.length) {
            return "VIP";
        }

        if (clean.length === 1) {
            return clean[0].slice(0, 2).toUpperCase();
        }

        return (clean[0][0] + clean[clean.length - 1][0]).toUpperCase();
    }

    window.FDAVip = {
        config,
        hasValidConfig,
        getSupabaseClient,
        getStorageKey,
        saveSessionToken,
        getSessionToken,
        clearSessionToken,
        redirectToLogin,
        redirectToStaffLogin,
        showStatus,
        hideStatus,
        ensureConfigured,
        normalizeCardCode,
        normalizePhone,
        getPhotoFunctionName,
        getInitials
    };
})();
