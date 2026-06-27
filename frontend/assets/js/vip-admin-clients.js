document.addEventListener("DOMContentLoaded", function () {
    const dashboard = window.FDAVipAdmin;
    const statusBox = document.getElementById("vipAdminClientsStatus");
    const searchInput = document.getElementById("vipClientSearch");
    const filterStatus = document.getElementById("vipClientFilterStatus");
    const filterLevel = document.getElementById("vipClientFilterLevel");
    const filterWarnings = document.getElementById("vipClientFilterWarnings");
    const filterPhoto = document.getElementById("vipClientFilterPhoto");
    const sortSelect = document.getElementById("vipClientSort");
    const refreshButton = document.getElementById("vipAdminSearchButton");
    const resetButton = document.getElementById("vipAdminResetFilters");
    const resultsNode = document.getElementById("vipAdminSearchResults");
    const tableBody = document.getElementById("vipAdminClientsTableBody");
    const tableCountPill = document.getElementById("vipAdminTableCountPill");
    const selectAllCheckbox = document.getElementById("vipAdminSelectAll");
    const bulkButton = document.getElementById("vipAdminApplyBulk");
    const bulkStatus = document.getElementById("vipBulkStatus");
    const bulkNote = document.getElementById("vipBulkNote");
    const exportButton = document.getElementById("vipAdminExportCsv");

    if (!dashboard || !tableBody) {
        return;
    }

    bindEvents();
    loadClients();

    async function loadClients() {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            renderEmptyTable();
            return;
        }

        try {
            window.FDAVip.hideStatus(statusBox);

            const queryText = String(searchInput ? searchInput.value : "").trim();
            dashboard.state.lastQuery = queryText;
            dashboard.state.lastFilters = getCurrentFilters();

            let query = supabaseClient
                .from("clients")
                .select("id, full_name, phone, email, birth_date, photo_path, status, vip_level, card_code, referral_code, privacy_accepted, marketing_accepted, notes, created_at, updated_at", {
                    count: "exact"
                });

            query = applyFilters(query, queryText, dashboard.state.lastFilters);

            const { data, error, count } = await query;
            if (error) {
                throw error;
            }

            const clients = data || [];
            const warningCounts = await getWarningCounts(clients.map(function (client) {
                return client.id;
            }));

            const enrichedClients = clients
                .map(function (client) {
                    return Object.assign({}, client, {
                        warnings_count: warningCounts[client.id] || 0
                    });
                })
                .filter(function (client) {
                    if (dashboard.state.lastFilters.warnings === "yes") {
                        return client.warnings_count > 0;
                    }
                    if (dashboard.state.lastFilters.warnings === "no") {
                        return client.warnings_count === 0;
                    }
                    return true;
                });

            dashboard.setClientsRows(enrichedClients);
            dashboard.setSelectedClientIds([]);
            renderSearchResults(enrichedClients.slice(0, 8));
            renderTable(enrichedClients);
            updateCountPill(enrichedClients.length, count || enrichedClients.length);
        } catch (err) {
            renderEmptyTable();
            window.FDAVip.showStatus(
                statusBox,
                "Non riusciamo a caricare l'elenco clienti in questo momento.",
                "error"
            );
        }
    }

    async function getWarningCounts(clientIds) {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !clientIds.length) {
            return {};
        }

        const { data, error } = await supabaseClient
            .from("warnings")
            .select("client_id")
            .in("client_id", clientIds);

        if (error) {
            throw error;
        }

        return (data || []).reduce(function (acc, row) {
            acc[row.client_id] = (acc[row.client_id] || 0) + 1;
            return acc;
        }, {});
    }

    function applyFilters(query, queryText, filters) {
        let nextQuery = query;

        if (queryText) {
            const safeQuery = queryText.replace(/,/g, " ");
            nextQuery = nextQuery.or([
                "full_name.ilike.%" + safeQuery + "%",
                "phone.ilike.%" + safeQuery + "%",
                "email.ilike.%" + safeQuery + "%",
                "card_code.ilike.%" + safeQuery + "%",
                "referral_code.ilike.%" + safeQuery + "%"
            ].join(","));
        }

        if (filters.status) {
            nextQuery = nextQuery.eq("status", filters.status);
        }
        if (filters.level) {
            nextQuery = nextQuery.eq("vip_level", filters.level);
        }
        if (filters.photo === "yes") {
            nextQuery = nextQuery.not("photo_path", "is", null);
        }
        if (filters.photo === "no") {
            nextQuery = nextQuery.is("photo_path", null);
        }

        if (filters.sort === "name") {
            nextQuery = nextQuery.order("full_name", { ascending: true });
        } else if (filters.sort === "level") {
            nextQuery = nextQuery.order("vip_level", { ascending: true });
        } else if (filters.sort === "status") {
            nextQuery = nextQuery.order("status", { ascending: true });
        } else {
            nextQuery = nextQuery.order("created_at", { ascending: false });
        }

        return nextQuery.limit(200);
    }

    function renderSearchResults(rows) {
        if (!resultsNode) {
            return;
        }

        resultsNode.innerHTML = "";

        if (!rows.length) {
            resultsNode.innerHTML = "<div class='vip-admin-empty-inline'>Nessun cliente trovato con questi filtri.</div>";
            return;
        }

        rows.forEach(function (row) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "vip-admin-result-chip";
            button.innerHTML =
                "<strong>" + dashboard.escapeHtml(row.full_name) + "</strong>" +
                "<span>" + dashboard.escapeHtml(row.card_code || row.phone || "-") + "</span>";
            button.addEventListener("click", function () {
                openClientEditor(row);
            });
            resultsNode.appendChild(button);
        });
    }

    function renderTable(rows) {
        tableBody.innerHTML = "";

        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }

        if (!rows.length) {
            renderEmptyTable();
            return;
        }

        rows.forEach(function (row) {
            const tr = document.createElement("tr");
            tr.innerHTML = [
                "<td><input type='checkbox' class='vip-admin-row-check' data-id='" + row.id + "'></td>",
                "<td><strong>" + dashboard.escapeHtml(row.full_name) + "</strong><div class='vip-admin-row-sub'>" + dashboard.escapeHtml(row.referral_code || "-") + "</div></td>",
                "<td>" + dashboard.escapeHtml(row.phone || "-") + "</td>",
                "<td>" + dashboard.escapeHtml(row.vip_level || "-") + "</td>",
                "<td>" + buildStatusChip(row.status) + "</td>",
                "<td>" + dashboard.escapeHtml(row.card_code || "-") + "</td>",
                "<td>" + String(row.warnings_count || 0) + "</td>",
                "<td>" + (row.photo_path ? "Si" : "No") + "</td>",
                "<td><button type='button' class='vip-table-action' data-action='open' data-id='" + row.id + "'>Apri</button></td>"
            ].join("");

            tr.querySelector("[data-action='open']").addEventListener("click", function () {
                openClientEditor(row);
            });

            tr.querySelector(".vip-admin-row-check").addEventListener("change", onRowCheckChange);
            tableBody.appendChild(tr);
        });
    }

    function renderEmptyTable() {
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
        tableBody.innerHTML = "<tr><td colspan='9'><div class='vip-admin-empty-inline'>Nessun cliente disponibile nella vista corrente.</div></td></tr>";
        updateCountPill(0, 0);
    }

    function updateCountPill(visibleTotal, rawTotal) {
        if (tableCountPill) {
            if (rawTotal > visibleTotal) {
                tableCountPill.textContent = visibleTotal + " visibili su " + rawTotal;
                return;
            }

            tableCountPill.textContent = visibleTotal + " clienti";
        }
    }

    function onRowCheckChange() {
        const selected = Array.from(document.querySelectorAll(".vip-admin-row-check:checked")).map(function (checkbox) {
            return checkbox.getAttribute("data-id");
        });
        dashboard.setSelectedClientIds(selected);
    }

    async function applyBulkActions() {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        const selectedIds = Array.from(dashboard.state.selectedClientIds);
        if (!selectedIds.length) {
            window.FDAVip.showStatus(statusBox, "Seleziona almeno un cliente dalla tabella.", "error");
            return;
        }

        const nextStatus = bulkStatus ? bulkStatus.value : "";
        const noteValue = bulkNote ? String(bulkNote.value || "").trim() : "";

        if (!nextStatus && !noteValue) {
            window.FDAVip.showStatus(statusBox, "Scegli almeno un cambio stato o una nota staff rapida.", "error");
            return;
        }

        if (!window.confirm(buildBulkConfirmationMessage(selectedIds.length, nextStatus, noteValue))) {
            return;
        }

        bulkButton.disabled = true;
        bulkButton.textContent = "Applico...";
        window.FDAVip.hideStatus(statusBox);

        try {
            const selectedClients = selectedIds
                .map(function (clientId) {
                    return dashboard.getClientById(clientId);
                })
                .filter(Boolean);

            const timestamp = new Date().toLocaleString("it-IT");

            await Promise.all(selectedClients.map(function (client) {
                const mergedNotes = noteValue
                    ? buildMergedNotes(client.notes, "[" + timestamp + "] " + noteValue)
                    : client.notes;

                const payload = {
                    status: nextStatus || client.status,
                    notes: mergedNotes
                };

                return supabaseClient
                    .from("clients")
                    .update(payload)
                    .eq("id", client.id);
            }));

            if (bulkNote) {
                bulkNote.value = "";
            }
            if (bulkStatus) {
                bulkStatus.value = "";
            }

            window.FDAVip.showStatus(statusBox, "Azione massiva completata correttamente.", "success");
            await loadClients();
            window.dispatchEvent(new CustomEvent("fda-vip-admin:data-changed"));
        } catch (err) {
            window.FDAVip.showStatus(statusBox, "Non riusciamo ad applicare l'azione ai clienti selezionati.", "error");
        } finally {
            bulkButton.disabled = false;
            bulkButton.textContent = "Applica ai selezionati";
        }
    }

    async function exportCsv() {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        try {
            const rows = Array.isArray(dashboard.state.clientsRows) ? dashboard.state.clientsRows : [];
            const headers = ["full_name", "phone", "email", "vip_level", "status", "card_code", "referral_code", "created_at", "updated_at"];
            const csv = [headers.join(",")].concat(rows.map(function (row) {
                return headers.map(function (header) {
                    const value = String(row[header] || "").replace(/"/g, '""');
                    return '"' + value + '"';
                }).join(",");
            })).join("\n");

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "fioracqua-clienti.csv";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            window.FDAVip.showStatus(statusBox, "Non riusciamo a generare il CSV in questo momento.", "error");
        }
    }

    function buildMergedNotes(existingNotes, nextNote) {
        const current = String(existingNotes || "").trim();
        return current ? current + "\n" + nextNote : nextNote;
    }

    function buildBulkConfirmationMessage(selectedCount, nextStatus, noteValue) {
        const actions = [];

        if (nextStatus) {
            actions.push("cambio stato in \"" + humanizeStatus(nextStatus) + "\"");
        }

        if (noteValue) {
            actions.push("aggiunta nota staff");
        }

        return "Confermi " + actions.join(" + ") + " per " + selectedCount + " clienti selezionati?";
    }

    function openClientEditor(client) {
        dashboard.setEditingClient(client);

        const formNode = document.getElementById("vipAdminClientForm");
        if (formNode) {
            formNode.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    function buildStatusChip(status) {
        const normalizedStatus = String(status || "").trim();
        return "<span class='vip-status-pill vip-status-pill-inline " + getStatusClass(normalizedStatus) + "'>" +
            dashboard.escapeHtml(humanizeStatus(normalizedStatus)) +
            "</span>";
    }

    function getStatusClass(status) {
        if (status === "VIP") {
            return "is-vip";
        }

        if (status === "APPROVATO") {
            return "is-approved";
        }

        return "is-watch";
    }

    function humanizeStatus(status) {
        const labels = {
            DA_VERIFICARE: "Da verificare",
            APPROVATO: "Approvato",
            VIP: "VIP",
            IN_OSSERVAZIONE: "In osservazione",
            SOSPESO: "Sospeso",
            ARCHIVIATO: "Archiviato"
        };

        return labels[status] || "Profilo";
    }

    function getCurrentFilters() {
        return {
            status: filterStatus ? filterStatus.value : "",
            level: filterLevel ? filterLevel.value : "",
            warnings: filterWarnings ? filterWarnings.value : "",
            photo: filterPhoto ? filterPhoto.value : "",
            sort: sortSelect ? sortSelect.value : "recent"
        };
    }

    function bindEvents() {
        if (refreshButton) {
            refreshButton.addEventListener("click", loadClients);
        }
        if (searchInput) {
            searchInput.addEventListener("input", debounce(loadClients, 220));
        }
        if (filterStatus) {
            filterStatus.addEventListener("change", loadClients);
        }
        if (filterLevel) {
            filterLevel.addEventListener("change", loadClients);
        }
        if (filterWarnings) {
            filterWarnings.addEventListener("change", loadClients);
        }
        if (filterPhoto) {
            filterPhoto.addEventListener("change", loadClients);
        }
        if (sortSelect) {
            sortSelect.addEventListener("change", loadClients);
        }
        if (resetButton) {
            resetButton.addEventListener("click", function () {
                if (searchInput) {
                    searchInput.value = "";
                }
                if (filterStatus) {
                    filterStatus.value = "";
                }
                if (filterLevel) {
                    filterLevel.value = "";
                }
                if (filterWarnings) {
                    filterWarnings.value = "";
                }
                if (filterPhoto) {
                    filterPhoto.value = "";
                }
                if (sortSelect) {
                    sortSelect.value = "recent";
                }
                loadClients();
            });
        }
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener("change", function () {
                const isChecked = selectAllCheckbox.checked;
                Array.from(document.querySelectorAll(".vip-admin-row-check")).forEach(function (checkbox) {
                    checkbox.checked = isChecked;
                });
                onRowCheckChange();
            });
        }
        if (bulkButton) {
            bulkButton.addEventListener("click", applyBulkActions);
        }
        if (exportButton) {
            exportButton.addEventListener("click", exportCsv);
        }
        window.addEventListener("fda-vip-admin:data-changed", function () {
            loadClients();
            dashboard.loadDashboardStats();
        });
    }

    function debounce(fn, delay) {
        let timer = null;
        return function () {
            const args = arguments;
            const context = this;
            window.clearTimeout(timer);
            timer = window.setTimeout(function () {
                fn.apply(context, args);
            }, delay);
        };
    }
});
