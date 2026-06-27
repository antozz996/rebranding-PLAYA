(function () {
    const state = {
        clientsRows: [],
        selectedClientIds: new Set(),
        editingClient: null,
        lastQuery: "",
        lastFilters: {
            status: "",
            level: "",
            warnings: "",
            photo: "",
            sort: "recent"
        }
    };

    function getSupabaseClient() {
        return window.FDAVip ? window.FDAVip.getSupabaseClient() : null;
    }

    async function getStaffSession() {
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            return { session: null, isStaff: false, isAdmin: false };
        }

        const { data } = await supabaseClient.auth.getSession();
        const session = data ? data.session : null;
        if (!session || !session.user) {
            return { session: null, isStaff: false, isAdmin: false };
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

            return {
                session,
                isStaff: Boolean(staffResponse.data),
                isAdmin: Boolean(adminResponse.data)
            };
        } catch (err) {
            return {
                session,
                isStaff: false,
                isAdmin: false
            };
        }
    }

    async function ensureStaffSession(statusBox, customMessage) {
        const { session, isStaff } = await getStaffSession();

        if (session && isStaff) {
            return true;
        }

        if (statusBox) {
            window.FDAVip.showStatus(
                statusBox,
                customMessage || "Questa sezione e disponibile solo per staff autenticato.",
                "error"
            );
        }

        return false;
    }

    async function ensureAdminSession(statusBox, customMessage) {
        const { session, isAdmin } = await getStaffSession();

        if (session && isAdmin) {
            return true;
        }

        if (statusBox) {
            window.FDAVip.showStatus(
                statusBox,
                customMessage || "Questa operazione e disponibile solo per admin autenticato.",
                "error"
            );
        }

        return false;
    }

    function setSelectedClientIds(ids) {
        state.selectedClientIds = new Set(ids || []);
        window.dispatchEvent(new CustomEvent("fda-vip-admin:selection-changed", {
            detail: {
                selectedIds: Array.from(state.selectedClientIds)
            }
        }));
    }

    function setEditingClient(client) {
        state.editingClient = client || null;
        window.dispatchEvent(new CustomEvent("fda-vip-admin:editing-client-changed", {
            detail: {
                client: state.editingClient
            }
        }));
    }

    function setClientsRows(rows) {
        state.clientsRows = Array.isArray(rows) ? rows : [];
    }

    function getClientById(clientId) {
        return state.clientsRows.find(function (row) {
            return row.id === clientId;
        }) || null;
    }

    async function loadDashboardStats() {
        const statusBox = document.getElementById("vipAdminDashboardStatus");
        const supabaseClient = getSupabaseClient();

        if (!supabaseClient || !(await ensureStaffSession(statusBox))) {
            return;
        }

        try {
            window.FDAVip.hideStatus(statusBox);

            const totals = await Promise.all([
                countRows("clients"),
                countRows("clients", function (query) {
                    return query.in("status", ["APPROVATO", "VIP"]);
                }),
                countRows("clients", function (query) {
                    return query.eq("status", "IN_OSSERVAZIONE");
                }),
                countRows("bookings", function (query) {
                    return query.eq("status", "RICHIESTA");
                }),
                countRows("bookings", function (query) {
                    return query.eq("status", "CONFERMATA");
                }),
                countRows("referrals"),
                countRows("referrals", function (query) {
                    return query.eq("status", "APPROVATO");
                }),
                countRows("warnings"),
                countRows("beach_layouts", function (query) {
                    return query.eq("is_active", true);
                }),
                countRows("beach_spots"),
                countRows("bookings", function (query) {
                    return query
                        .eq("booking_date", getTodayIsoDate())
                        .not("spot_id", "is", null)
                        .in("status", ["RICHIESTA", "CONFERMATA", "ARRIVATA"]);
                }),
                countRows("beach_spot_overrides", function (query) {
                    return query.eq("service_date", getTodayIsoDate());
                })
            ]);

            setText("vipKpiClientsTotal", totals[0]);
            setText("vipKpiClientsActive", totals[1]);
            setText("vipKpiClientsWatch", totals[2]);
            setText("vipKpiBookingsRequested", totals[3]);
            setText("vipKpiBookingsConfirmed", totals[4]);
            setText("vipKpiReferralsTotal", totals[5]);
            setText("vipKpiReferralsApproved", totals[6]);
            setText("vipKpiWarningsTotal", totals[7]);
            setText("vipKpiBeachLayoutsActive", totals[8]);
            setText("vipKpiBeachSpotsTotal", totals[9]);
            setText("vipKpiBeachBookingsToday", totals[10]);
            setText("vipKpiBeachOverridesToday", totals[11]);

            await loadRecentActivity();
        } catch (err) {
            window.FDAVip.showStatus(
                statusBox,
                "Non riusciamo a caricare i KPI della dashboard in questo momento.",
                "error"
            );
        }
    }

    async function countRows(tableName, builder) {
        const supabaseClient = getSupabaseClient();
        let query = supabaseClient.from(tableName).select("*", {
            count: "exact",
            head: true
        });

        if (typeof builder === "function") {
            query = builder(query);
        }

        const { count, error } = await query;
        if (error) {
            throw error;
        }

        return count || 0;
    }

    async function loadRecentActivity() {
        const supabaseClient = getSupabaseClient();
        const recentClientsNode = document.getElementById("vipRecentClientsList");
        const recentWarningsNode = document.getElementById("vipRecentWarningsList");

        if (!supabaseClient || !recentClientsNode || !recentWarningsNode) {
            return;
        }

        const [clientsRes, warningsRes] = await Promise.all([
            supabaseClient
                .from("clients")
                .select("id, full_name, card_code, created_at")
                .order("created_at", { ascending: false })
                .limit(5),
            supabaseClient
                .from("warnings")
                .select("id, client_id, reason, severity, created_at")
                .order("created_at", { ascending: false })
                .limit(5)
        ]);

        if (clientsRes.error) {
            throw clientsRes.error;
        }
        if (warningsRes.error) {
            throw warningsRes.error;
        }

        const warnings = warningsRes.data || [];
        const clientIds = warnings.map(function (warning) {
            return warning.client_id;
        }).filter(Boolean);

        const clientLookup = {};
        if (clientIds.length) {
            const { data: warningClients, error: warningClientsError } = await supabaseClient
                .from("clients")
                .select("id, full_name")
                .in("id", clientIds);

            if (warningClientsError) {
                throw warningClientsError;
            }

            (warningClients || []).forEach(function (client) {
                clientLookup[client.id] = client.full_name;
            });
        }

        recentClientsNode.innerHTML = "";
        (clientsRes.data || []).forEach(function (client) {
            const item = document.createElement("div");
            item.className = "vip-admin-activity-item";
            item.innerHTML =
                "<strong>" + escapeHtml(client.full_name || "Cliente") + "</strong>" +
                "<span>" + escapeHtml(client.card_code || "-") + "</span>";
            recentClientsNode.appendChild(item);
        });

        recentWarningsNode.innerHTML = "";
        warnings.forEach(function (warning) {
            const item = document.createElement("div");
            item.className = "vip-admin-activity-item";
            item.innerHTML =
                "<strong>" + escapeHtml(clientLookup[warning.client_id] || "Cliente") + "</strong>" +
                "<span>" + escapeHtml(warning.severity || "Warning") + " · " + escapeHtml(warning.reason || "") + "</span>";
            recentWarningsNode.appendChild(item);
        });

        if (!recentClientsNode.children.length) {
            recentClientsNode.innerHTML = "<div class='vip-admin-empty-inline'>Nessun profilo recente.</div>";
        }
        if (!recentWarningsNode.children.length) {
            recentWarningsNode.innerHTML = "<div class='vip-admin-empty-inline'>Nessun warning recente.</div>";
        }
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function setText(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = value;
        }
    }

    function getTodayIsoDate() {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function bindQuickActions() {
        const newClientButton = document.getElementById("vipAdminNewClient");
        const resetButton = document.getElementById("vipAdminResetForm");

        if (newClientButton) {
            newClientButton.addEventListener("click", function () {
                setEditingClient(null);
                window.dispatchEvent(new CustomEvent("fda-vip-admin:reset-form"));
            });
        }

        if (resetButton) {
            resetButton.addEventListener("click", function () {
                setEditingClient(null);
                window.dispatchEvent(new CustomEvent("fda-vip-admin:reset-form"));
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!window.FDAVip || !document.getElementById("vipAdminDashboard")) {
            return;
        }

        bindQuickActions();
        loadDashboardStats();
    });

    window.FDAVipAdmin = {
        state,
        getSupabaseClient,
        getStaffSession,
        ensureStaffSession,
        ensureAdminSession,
        loadDashboardStats,
        setClientsRows,
        setSelectedClientIds,
        setEditingClient,
        getClientById,
        escapeHtml
    };
})();
