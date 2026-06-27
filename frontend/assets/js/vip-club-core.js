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

    function getBookingEmailFunctionName() {
        return config.bookingEmailFunctionName || "vip-booking-email";
    }

    function getPublicSiteUrl() {
        const configuredUrl = String(config.publicSiteUrl || "").trim();
        const fallbackUrl = window.location.origin || "";
        return (configuredUrl || fallbackUrl).replace(/\/+$/, "");
    }

    function buildAbsoluteUrl(path) {
        const rawPath = String(path || "").trim();
        if (/^https?:\/\//i.test(rawPath)) {
            return rawPath;
        }

        const cleanPath = rawPath.replace(/^\/+/, "");
        return getPublicSiteUrl() + "/" + cleanPath;
    }

    function buildBookingStaffUrl(bookingId, bookingDate) {
        const url = new URL(buildAbsoluteUrl("vip-verify.html"));
        url.searchParams.set("tab", "bookings");
        url.searchParams.set("booking", String(bookingId || "").trim());

        if (bookingDate) {
            url.searchParams.set("date", String(bookingDate).trim());
        }

        return url.toString();
    }

    function buildQrImageUrl(payload, size) {
        const qrUrl = new URL(config.qrProviderUrl || "https://api.qrserver.com/v1/create-qr-code/");
        const normalizedSize = Number.isFinite(Number(size)) ? Number(size) : 240;

        qrUrl.searchParams.set("size", normalizedSize + "x" + normalizedSize);
        qrUrl.searchParams.set("margin", "16");
        qrUrl.searchParams.set("data", String(payload || ""));

        return qrUrl.toString();
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
        getBookingEmailFunctionName,
        getPublicSiteUrl,
        buildAbsoluteUrl,
        buildBookingStaffUrl,
        buildQrImageUrl,
        getInitials
    };
})();
