document.addEventListener("DOMContentLoaded", async function () {
    const statusBox = document.getElementById("vipCardStatusMessage");
    const loadingState = document.getElementById("vipCardLoading");
    const cardView = document.getElementById("vipCardView");
    const signOutButton = document.getElementById("vipCardSignOut");
    const bookingCta = document.getElementById("vipBookingCta");
    const referralCta = document.getElementById("vipReferralCta");

    if (!window.FDAVip) {
        return;
    }

    if (signOutButton) {
        signOutButton.addEventListener("click", function () {
            window.FDAVip.clearSessionToken();
            window.FDAVip.redirectToLogin();
        });
    }

    if (!window.FDAVip.ensureConfigured(statusBox)) {
        if (loadingState) {
            loadingState.style.display = "none";
        }
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
        if (loadingState) {
            loadingState.style.display = "none";
        }
        return;
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

        hydrateProfile(profile);

        if (loadingState) {
            loadingState.style.display = "none";
        }
        if (cardView) {
            cardView.hidden = false;
        }
    } catch (err) {
        window.FDAVip.clearSessionToken();
        window.FDAVip.showStatus(
            statusBox,
            "La tua sessione non e piu disponibile. Effettua di nuovo l'accesso per visualizzare la card.",
            "error"
        );

        if (loadingState) {
            loadingState.style.display = "none";
        }

        window.setTimeout(function () {
            window.FDAVip.redirectToLogin();
        }, 1400);
    }

    function hydrateProfile(profile) {
        setText("vipClientDisplayName", profile.display_name || profile.full_name || "Ospite VIP");
        setText("vipClientFullName", profile.full_name || "Profilo riservato");
        setText("vipClientCardCode", profile.card_code || "FDA-0000-000000");
        setText("vipClientLevel", profile.vip_level || "SILVER");
        setText("vipClientStatus", humanizeStatus(profile.status));
        setText("vipClientVerifyUrl", profile.verify_url || "/vip-verify.html");
        setText("vipMetricLevel", profile.vip_level || "SILVER");
        setText("vipMetricStatus", humanizeStatus(profile.status));
        setText("vipMetricAccess", accessMessage(profile.status));
        setText("vipActionInlineStatus", actionLabel(profile.status));
        setText("vipActionCopy", actionCopy(profile.status));

        hydrateBonuses(Array.isArray(profile.vip_bonuses) ? profile.vip_bonuses : []);
        hydrateStateMessage(profile.status);
        hydrateActionState(profile.status);
        hydrateStatusPill(profile.status);
    }

    function hydrateBonuses(bonuses) {
        const list = document.getElementById("vipBonusList");
        const empty = document.getElementById("vipBonusEmpty");

        if (!list || !empty) {
            return;
        }

        list.innerHTML = "";

        if (!bonuses.length) {
            empty.hidden = false;
            return;
        }

        empty.hidden = true;

        bonuses.forEach(function (bonus) {
            const item = document.createElement("article");
            item.className = "vip-bonus-item";

            const mark = document.createElement("div");
            mark.className = "vip-bonus-mark";
            mark.textContent = "VIP";

            const copy = document.createElement("div");
            copy.className = "vip-bonus-copy";

            const title = document.createElement("h4");
            title.textContent = bonus.title || "Benefit riservato";

            const text = document.createElement("p");
            text.textContent = bonus.description || "Dettagli benefit disponibili in struttura.";

            copy.appendChild(title);
            copy.appendChild(text);
            item.appendChild(mark);
            item.appendChild(copy);
            list.appendChild(item);
        });
    }

    function hydrateStateMessage(status) {
        if (status === "IN_OSSERVAZIONE") {
            window.FDAVip.showStatus(
                statusBox,
                "La tua card e attiva per la consultazione. In questo momento inviti e richieste dedicate non sono disponibili.",
                "success"
            );
            return;
        }

        window.FDAVip.hideStatus(statusBox);
    }

    function humanizeStatus(status) {
        const labels = {
            APPROVATO: "Profilo approvato",
            VIP: "Profilo VIP attivo",
            IN_OSSERVAZIONE: "Profilo in osservazione"
        };

        return labels[status] || "Profilo riservato";
    }

    function accessMessage(status) {
        if (status === "IN_OSSERVAZIONE") {
            return "Card visibile";
        }

        return "Accesso completo";
    }

    function actionLabel(status) {
        if (status === "IN_OSSERVAZIONE") {
            return "Solo card consultabile in questa fase";
        }

        return "Prenotazioni e inviti disponibili";
    }

    function actionCopy(status) {
        if (status === "IN_OSSERVAZIONE") {
            return "Il tuo profilo puo consultare la card, ma prenotazioni dedicate e inviti restano temporaneamente non attivi.";
        }

        return "Se il tuo profilo e attivo, puoi proseguire con una richiesta di prenotazione dedicata oppure segnalare un ospite da invitare al club.";
    }

    function hydrateActionState(status) {
        if (!bookingCta && !referralCta) {
            return;
        }

        if (status === "IN_OSSERVAZIONE") {
            setDisabledAction(bookingCta, "Richiesta non attiva");
            setDisabledAction(referralCta, "Invito non attivo");
            return;
        }

        setEnabledAction(bookingCta, "Richiedi prenotazione", "vip-btn-primary");
        setEnabledAction(referralCta, "Invita un ospite", "vip-btn-plain");
    }

    function hydrateStatusPill(status) {
        const pill = document.getElementById("vipStatusPill");
        if (!pill) {
            return;
        }

        pill.textContent = accessMessage(status);
        pill.classList.remove("is-vip", "is-approved", "is-watch");

        if (status === "VIP") {
            pill.classList.add("is-vip");
        } else if (status === "APPROVATO") {
            pill.classList.add("is-approved");
        } else if (status === "IN_OSSERVAZIONE") {
            pill.classList.add("is-watch");
        }
    }

    function preventNavigationOnce(event) {
        event.preventDefault();
    }

    function setDisabledAction(target, label) {
        if (!target) {
            return;
        }

        target.textContent = label;
        target.classList.remove("vip-btn-primary");
        target.classList.add("vip-btn-plain", "is-disabled");
        target.setAttribute("aria-disabled", "true");
        target.addEventListener("click", preventNavigationOnce, { once: true });
    }

    function setEnabledAction(target, label, preferredClass) {
        if (!target) {
            return;
        }

        target.textContent = label;
        target.classList.remove("is-disabled", "vip-btn-primary", "vip-btn-plain");
        target.classList.add(preferredClass);
        target.removeAttribute("aria-disabled");
    }

    function setText(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = value;
        }
    }
});
