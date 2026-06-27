document.addEventListener("DOMContentLoaded", function () {
    const dashboard = window.FDAVipAdmin;
    const section = document.getElementById("vipBeachAdminSection");

    const statusBox = document.getElementById("vipBeachAdminStatus");
    const dateInput = document.getElementById("vipBeachAdminDate");
    const refreshButton = document.getElementById("vipBeachAdminRefresh");
    const resetSelectionButton = document.getElementById("vipBeachAdminResetSelection");
    const mapGrid = document.getElementById("vipBeachAdminMapGrid");
    const mapTitle = document.getElementById("vipBeachAdminMapTitle");
    const mapMeta = document.getElementById("vipBeachAdminMapMeta");
    const dayPill = document.getElementById("vipBeachAdminDayPill");
    const editorPill = document.getElementById("vipBeachEditorPill");
    const overrideForm = document.getElementById("vipBeachOverrideForm");
    const overrideSpotId = document.getElementById("vipBeachOverrideSpotId");
    const overrideStatus = document.getElementById("vipBeachOverrideStatus");
    const overrideUmbrellas = document.getElementById("vipBeachOverrideUmbrellas");
    const overrideSunbeds = document.getElementById("vipBeachOverrideSunbeds");
    const overrideNote = document.getElementById("vipBeachOverrideNote");
    const overrideSaveButton = document.getElementById("vipBeachOverrideSave");
    const overrideClearButton = document.getElementById("vipBeachOverrideClear");
    const selectedCard = document.getElementById("vipBeachSelectedCard");
    const selectedCode = document.getElementById("vipBeachSelectedCode");
    const selectedLabel = document.getElementById("vipBeachSelectedLabel");
    const selectedDetails = document.getElementById("vipBeachSelectedDetails");
    const selectedMeta = document.getElementById("vipBeachSelectedMeta");

    const poolTabButtons = Array.from(document.querySelectorAll("[data-pool-tab-target]"));
    const poolTabPanels = Array.from(document.querySelectorAll("[data-pool-tab-panel]"));
    const layoutStatusBox = document.getElementById("vipBeachLayoutStatus");
    const layoutRefreshButton = document.getElementById("vipLayoutRefresh");
    const layoutAutoArrangeButton = document.getElementById("vipLayoutAutoArrange");
    const layoutSaveButton = document.getElementById("vipLayoutSaveButton");
    const layoutNewSpotButton = document.getElementById("vipLayoutNewSpot");
    const layoutDuplicateSpotButton = document.getElementById("vipLayoutDuplicateSpot");
    const layoutDeleteSpotButton = document.getElementById("vipLayoutDeleteSpot");
    const layoutResetDraftButton = document.getElementById("vipLayoutResetDraft");
    const layoutCanvasTitle = document.getElementById("vipLayoutCanvasTitle");
    const layoutCanvasMeta = document.getElementById("vipLayoutCanvasMeta");
    const layoutCanvas = document.getElementById("vipLayoutEditorCanvas");
    const layoutActiveName = document.getElementById("vipLayoutActiveName");
    const layoutSpotsCount = document.getElementById("vipLayoutSpotsCount");
    const layoutZonesCount = document.getElementById("vipLayoutZonesCount");
    const layoutDirtyState = document.getElementById("vipLayoutDirtyState");
    const layoutEditorPill = document.getElementById("vipLayoutEditorPill");
    const layoutSelectedCard = document.getElementById("vipLayoutSelectedCard");
    const layoutSelectedCode = document.getElementById("vipLayoutSelectedCode");
    const layoutSelectedLabel = document.getElementById("vipLayoutSelectedLabel");
    const layoutSelectedDetails = document.getElementById("vipLayoutSelectedDetails");
    const layoutSelectedMeta = document.getElementById("vipLayoutSelectedMeta");
    const layoutSpotForm = document.getElementById("vipLayoutSpotForm");
    const layoutSpotId = document.getElementById("vipLayoutSpotId");
    const layoutSpotCode = document.getElementById("vipLayoutSpotCode");
    const layoutSpotLabel = document.getElementById("vipLayoutSpotLabel");
    const layoutSpotZone = document.getElementById("vipLayoutSpotZone");
    const layoutSpotRow = document.getElementById("vipLayoutSpotRow");
    const layoutSpotStatus = document.getElementById("vipLayoutSpotStatus");
    const layoutSpotShape = document.getElementById("vipLayoutSpotShape");
    const layoutSpotUmbrellas = document.getElementById("vipLayoutSpotUmbrellas");
    const layoutSpotSunbeds = document.getElementById("vipLayoutSpotSunbeds");
    const layoutSpotSortOrder = document.getElementById("vipLayoutSpotSortOrder");
    const layoutSpotZIndex = document.getElementById("vipLayoutSpotZIndex");
    const layoutSpotX = document.getElementById("vipLayoutSpotX");
    const layoutSpotY = document.getElementById("vipLayoutSpotY");
    const layoutSpotWidth = document.getElementById("vipLayoutSpotWidth");
    const layoutSpotHeight = document.getElementById("vipLayoutSpotHeight");
    const layoutSpotRotation = document.getElementById("vipLayoutSpotRotation");

    const LAYOUT_CANVAS_WIDTH = 1200;
    const LAYOUT_CANVAS_HEIGHT = 760;
    const LAYOUT_MIN_SIZE = 72;

    const state = {
        date: "",
        rows: [],
        selectedSpotId: "",
        poolTab: "layout",
        isAdmin: false,
        layoutId: "",
        layoutName: "",
        layoutVersion: 0,
        layoutRowsOriginal: [],
        layoutRowsDraft: [],
        layoutDeletedIds: new Set(),
        selectedLayoutSpotKey: "",
        layoutDirty: false,
        layoutTempIndex: 0,
        drag: null
    };

    if (!dashboard || !section || !overrideForm || !layoutCanvas || !layoutSpotForm) {
        return;
    }

    bindEvents();
    setPoolTab("layout");
    resetSelection();
    resetLayoutSelection();
    renderEmptyMap("Scegli una data per leggere la piantina del giorno.");
    renderEmptyLayout("Carichiamo il layout permanente della piscina.");

    const initialDate = formatDateForInput(new Date());
    if (dateInput) {
        dateInput.min = initialDate;
        dateInput.value = initialDate;
    }

    bootAdminPool();

    function bindEvents() {
        poolTabButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                setPoolTab(button.getAttribute("data-pool-tab-target"));
            });
        });

        window.addEventListener("fda-vip-admin:activate-pool-subtab", function (event) {
            const requested = event && event.detail ? event.detail.tab : "";
            if (requested) {
                setPoolTab(requested);
            }
        });

        if (dateInput) {
            dateInput.addEventListener("change", function () {
                loadAdminMap(dateInput.value);
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener("click", function () {
                loadAdminMap(dateInput ? dateInput.value : "");
            });
        }

        if (resetSelectionButton) {
            resetSelectionButton.addEventListener("click", resetSelection);
        }

        if (overrideForm) {
            overrideForm.addEventListener("submit", onSubmitOverride);
        }

        if (overrideClearButton) {
            overrideClearButton.addEventListener("click", clearOverride);
        }

        const rulesForm = document.getElementById("vipBookingRulesForm");
        if (rulesForm) {
            rulesForm.addEventListener("submit", saveBookingRules);
        }

        if (layoutRefreshButton) {
            layoutRefreshButton.addEventListener("click", function () {
                loadStaffAccess().then(function () {
                    loadLayout(true);
                });
            });
        }

        if (layoutAutoArrangeButton) {
            layoutAutoArrangeButton.addEventListener("click", autoArrangeLayout);
        }

        if (layoutSaveButton) {
            layoutSaveButton.addEventListener("click", saveLayout);
        }

        if (layoutNewSpotButton) {
            layoutNewSpotButton.addEventListener("click", createNewLayoutSpot);
        }

        if (layoutDuplicateSpotButton) {
            layoutDuplicateSpotButton.addEventListener("click", duplicateSelectedLayoutSpot);
        }

        if (layoutDeleteSpotButton) {
            layoutDeleteSpotButton.addEventListener("click", deleteSelectedLayoutSpot);
        }

        if (layoutResetDraftButton) {
            layoutResetDraftButton.addEventListener("click", resetLayoutDraft);
        }

        if (layoutCanvas) {
            layoutCanvas.addEventListener("click", function (event) {
                if (event.target === layoutCanvas) {
                    resetLayoutSelection();
                }
            });
        }

        Array.from(layoutSpotForm.querySelectorAll("input, select")).forEach(function (field) {
            field.addEventListener("input", syncSelectedLayoutSpotFromForm);
            field.addEventListener("change", syncSelectedLayoutSpotFromForm);
        });

        window.addEventListener("pointermove", onGlobalPointerMove);
        window.addEventListener("pointerup", onGlobalPointerUp);
        window.addEventListener("pointercancel", onGlobalPointerUp);

        window.addEventListener("fda-vip-admin:data-changed", function () {
            if (state.date) {
                loadAdminMap(state.date, true);
            }
            loadLayout(true);
        });
    }

    async function bootAdminPool() {
        await loadStaffAccess();
        await loadLayout();
        await loadAdminMap(initialDate);
        await loadBookingRules();
    }

    async function loadStaffAccess() {
        if (!dashboard.getStaffSession) {
            return;
        }

        const previousIsAdmin = state.isAdmin;
        const sessionInfo = await dashboard.getStaffSession();
        state.isAdmin = Boolean(sessionInfo && sessionInfo.isAdmin);

        if (previousIsAdmin !== state.isAdmin && state.layoutRowsDraft.length) {
            renderLayoutCanvas();
            populateLayoutInspector(getSelectedLayoutSpot());
        }

        refreshLayoutControls();
    }

    function setPoolTab(tabName) {
        const allowed = ["layout", "overrides", "rules"];
        const target = allowed.includes(tabName) ? tabName : "layout";
        state.poolTab = target;

        poolTabButtons.forEach(function (button) {
            const isActive = button.getAttribute("data-pool-tab-target") === target;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
        });

        poolTabPanels.forEach(function (panel) {
            const isActive = panel.getAttribute("data-pool-tab-panel") === target;
            panel.hidden = !isActive;
            panel.classList.toggle("is-active", isActive);
        });
    }

    async function loadBookingRules() {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient) return;

        const rulesStatusBox = document.getElementById("vipBookingRulesStatus");
        window.FDAVip.hideStatus(rulesStatusBox);

        try {
            const { data, error } = await supabaseClient
                .from("booking_rules")
                .select("key, value");

            if (error) throw error;

            if (data && data.length) {
                data.forEach(function (rule) {
                    const node = document.getElementById("rule_" + rule.key);
                    if (node) {
                        node.value = rule.value;
                    }
                });
            }
        } catch (err) {
            console.error("Errore nel caricamento delle regole", err);
            window.FDAVip.showStatus(rulesStatusBox, "Errore nel caricamento delle regole.", "error");
        }
    }

    async function saveBookingRules(event) {
        if (event) event.preventDefault();

        const supabaseClient = dashboard.getSupabaseClient();
        const rulesStatusBox = document.getElementById("vipBookingRulesStatus");
        
        if (!supabaseClient || !(await dashboard.ensureStaffSession(rulesStatusBox))) {
            return;
        }

        window.FDAVip.hideStatus(rulesStatusBox);

        const rulesKeys = ["booking_enabled", "max_guests_per_spot", "max_days_advance", "same_day_cutoff_hour"];
        const updates = rulesKeys.map(function (key) {
            const node = document.getElementById("rule_" + key);
            return {
                key: key,
                value: node ? String(node.value).trim() : ""
            };
        });

        try {
            const { error } = await supabaseClient
                .from("booking_rules")
                .upsert(updates);

            if (error) throw error;

            window.FDAVip.showStatus(rulesStatusBox, "Regole salvate correttamente ed applicate in tempo reale.", "success");
            window.dispatchEvent(new CustomEvent("fda-vip-admin:data-changed"));
        } catch (err) {
            console.error("Errore nel salvataggio delle regole", err);
            window.FDAVip.showStatus(rulesStatusBox, "Impossibile salvare le regole.", "error");
        }
    }

    async function loadLayout(preserveSelection) {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(layoutStatusBox))) {
            return;
        }

        renderEmptyLayout("Carichiamo il layout permanente della piscina.");
        window.FDAVip.hideStatus(layoutStatusBox);

        try {
            const { data: layoutRows, error: layoutError } = await supabaseClient
                .from("beach_layouts")
                .select("id, name, version, is_active, notes, updated_at, created_at")
                .eq("is_active", true)
                .order("updated_at", { ascending: false })
                .limit(1);

            if (layoutError) {
                throw layoutError;
            }

            const activeLayout = Array.isArray(layoutRows) ? layoutRows[0] : null;

            if (!activeLayout) {
                state.layoutId = "";
                state.layoutName = "";
                state.layoutVersion = 0;
                state.layoutRowsOriginal = [];
                state.layoutRowsDraft = [];
                state.layoutDeletedIds = new Set();
                markLayoutDirty(false);
                resetLayoutSelection();
                renderEmptyLayout("Nessun layout attivo trovato in Supabase.");
                renderLayoutSummary();
                window.FDAVip.showStatus(layoutStatusBox, "Nessun layout attivo disponibile.", "error");
                return;
            }

            const { data: spotsData, error: spotsError } = await supabaseClient
                .from("beach_spots")
                .select("id, layout_id, spot_code, label, zone, row_name, sort_order, base_umbrellas, base_sunbeds, base_status, x, y, width, height, rotation, shape, z_index")
                .eq("layout_id", activeLayout.id)
                .order("z_index", { ascending: true })
                .order("row_name", { ascending: true })
                .order("sort_order", { ascending: true })
                .order("spot_code", { ascending: true });

            if (spotsError) {
                throw spotsError;
            }

            state.layoutId = activeLayout.id;
            state.layoutName = activeLayout.name || "Layout attivo";
            state.layoutVersion = Number(activeLayout.version || 1);
            state.layoutRowsOriginal = prepareDraftRows(spotsData || [], activeLayout.id);
            state.layoutRowsDraft = cloneLayoutRows(state.layoutRowsOriginal);
            state.layoutDeletedIds = new Set();
            markLayoutDirty(false);

            if (preserveSelection && state.selectedLayoutSpotKey) {
                if (!findLayoutSpotByKey(state.selectedLayoutSpotKey)) {
                    state.selectedLayoutSpotKey = "";
                }
            } else {
                state.selectedLayoutSpotKey = "";
            }

            renderLayoutSummary();
            renderLayoutCanvas();
            populateLayoutInspector(getSelectedLayoutSpot());
            refreshLayoutControls();

            const adminMessage = state.isAdmin
                ? "Layout permanente caricato. Puoi modificarlo e salvarlo direttamente."
                : "Layout permanente caricato in sola lettura. Per salvare servono permessi admin.";
            window.FDAVip.showStatus(layoutStatusBox, adminMessage, "success");
        } catch (err) {
            state.layoutRowsOriginal = [];
            state.layoutRowsDraft = [];
            state.layoutDeletedIds = new Set();
            markLayoutDirty(false);
            resetLayoutSelection();
            renderEmptyLayout("Non riusciamo a leggere il layout permanente in questo momento.");
            renderLayoutSummary();
            window.FDAVip.showStatus(layoutStatusBox, humanizeLayoutError(err), "error");
        }
    }

    function prepareDraftRows(rows, layoutId) {
        const normalizedRows = (rows || []).map(function (row) {
            return normalizeLayoutSpot(row, layoutId);
        });

        applyAutoCoordinates(normalizedRows);
        return normalizedRows;
    }

    function normalizeLayoutSpot(row, layoutId) {
        const localKey = row && row.id ? row.id : buildTempKey();
        const rowName = upperOrFallback(row && row.row_name, "A");
        const shape = upperOrFallback(row && row.shape, "RECT");

        return {
            id: row && row.id ? row.id : null,
            _localKey: localKey,
            layout_id: layoutId || (row ? row.layout_id : null),
            spot_code: upperOrFallback(row && row.spot_code, buildTempSpotCode()),
            label: cleanString(row && row.label),
            zone: upperOrFallback(row && row.zone, "VIP"),
            row_name: rowName,
            sort_order: toInteger(row && row.sort_order, 1),
            base_umbrellas: clamp(toInteger(row && row.base_umbrellas, 1), 0, 20),
            base_sunbeds: clamp(toInteger(row && row.base_sunbeds, 2), 0, 20),
            base_status: normalizeBaseStatus(row && row.base_status),
            x: nullableNumber(row && row.x),
            y: nullableNumber(row && row.y),
            width: nullableNumber(row && row.width),
            height: nullableNumber(row && row.height),
            rotation: toNumber(row && row.rotation, 0),
            shape: ["RECT", "ROUND", "CABANA"].includes(shape) ? shape : "RECT",
            z_index: toInteger(row && row.z_index, 0)
        };
    }

    function applyAutoCoordinates(rows) {
        const rowsByName = {};
        const rowOrder = [];

        rows.forEach(function (spot) {
            const key = spot.row_name || "A";
            if (!rowsByName[key]) {
                rowsByName[key] = [];
                rowOrder.push(key);
            }
            rowsByName[key].push(spot);
        });

        rowOrder.sort();

        rowOrder.forEach(function (rowName, rowIndex) {
            rowsByName[rowName]
                .sort(compareLayoutSpots)
                .forEach(function (spot, spotIndex) {
                    if (spot.x == null) {
                        spot.x = 64 + (spotIndex * 172);
                    }
                    if (spot.y == null) {
                        spot.y = 70 + (rowIndex * 170);
                    }
                    if (spot.width == null) {
                        spot.width = 150;
                    }
                    if (spot.height == null) {
                        spot.height = spot.shape === "ROUND" ? 108 : 118;
                    }
                    spot.rotation = clamp(toNumber(spot.rotation, 0), -180, 180);
                });
        });
    }

    function renderLayoutCanvas() {
        if (!layoutCanvas) {
            return;
        }

        const rows = state.layoutRowsDraft.slice().sort(compareLayoutSpots);

        if (!rows.length) {
            renderEmptyLayout("Nessuna postazione presente nel layout attivo.");
            return;
        }

        layoutCanvas.innerHTML = "";
        layoutCanvas.style.width = LAYOUT_CANVAS_WIDTH + "px";
        layoutCanvas.style.height = LAYOUT_CANVAS_HEIGHT + "px";

        rows.forEach(function (spot) {
            const node = document.createElement("button");
            const isSelected = spot._localKey === state.selectedLayoutSpotKey;
            const left = clamp(toNumber(spot.x, 0), 0, LAYOUT_CANVAS_WIDTH - LAYOUT_MIN_SIZE);
            const top = clamp(toNumber(spot.y, 0), 0, LAYOUT_CANVAS_HEIGHT - LAYOUT_MIN_SIZE);
            const width = clamp(toNumber(spot.width, 150), LAYOUT_MIN_SIZE, 320);
            const height = clamp(toNumber(spot.height, 118), LAYOUT_MIN_SIZE, 240);
            const rotation = clamp(toNumber(spot.rotation, 0), -180, 180);

            node.type = "button";
            node.className = buildLayoutSpotClassName(spot, isSelected);
            node.setAttribute("data-layout-spot-key", spot._localKey);
            node.style.left = left + "px";
            node.style.top = top + "px";
            node.style.width = width + "px";
            node.style.height = height + "px";
            node.style.transform = "rotate(" + rotation + "deg)";
            node.style.zIndex = String(clamp(toInteger(spot.z_index, 0), 0, 999));
            node.innerHTML = dashboard.escapeHtml(spot.spot_code || "-");

            node.addEventListener("click", function () {
                state.selectedLayoutSpotKey = spot._localKey;
                populateLayoutInspector(spot);
                renderLayoutCanvas();
                refreshLayoutControls();
            });

            if (state.isAdmin) {
                node.addEventListener("pointerdown", function (event) {
                    onLayoutSpotPointerDown(event, spot._localKey);
                });
            }

            if (isSelected && state.isAdmin) {
                appendLayoutHandles(node);
            }

            layoutCanvas.appendChild(node);
        });

        if (layoutCanvasTitle) {
            layoutCanvasTitle.textContent = state.layoutName + " · v" + state.layoutVersion;
        }
        if (layoutCanvasMeta) {
            layoutCanvasMeta.textContent = state.isAdmin
                ? "Drag sulla card per spostarla. Usa i punti agli angoli per ridimensionare e la maniglia superiore per ruotare."
                : "Visualizzazione in sola lettura del layout attivo. Un admin puo modificarlo e salvarlo.";
        }
    }

    function appendLayoutHandles(node) {
        const handles = [
            { mode: "resize-nw", className: "is-nw" },
            { mode: "resize-ne", className: "is-ne" },
            { mode: "resize-sw", className: "is-sw" },
            { mode: "resize-se", className: "is-se" }
        ];

        handles.forEach(function (handle) {
            const dot = document.createElement("span");
            dot.className = "vip-layout-handle " + handle.className;
            dot.setAttribute("data-drag-mode", handle.mode);
            node.appendChild(dot);
        });

        const rotate = document.createElement("span");
        rotate.className = "vip-layout-rotate-handle";
        rotate.setAttribute("data-drag-mode", "rotate");
        node.appendChild(rotate);
    }

    function onLayoutSpotPointerDown(event, spotKey) {
        if (!state.isAdmin) {
            return;
        }

        const spot = findLayoutSpotByKey(spotKey);
        if (!spot) {
            return;
        }

        const dragTarget = event.target && event.target.closest("[data-drag-mode]");
        const mode = dragTarget ? dragTarget.getAttribute("data-drag-mode") : "drag";
        const startX = event.clientX;
        const startY = event.clientY;
        const width = clamp(toNumber(spot.width, 150), LAYOUT_MIN_SIZE, 320);
        const height = clamp(toNumber(spot.height, 118), LAYOUT_MIN_SIZE, 240);
        const centerX = toNumber(spot.x, 0) + (width / 2);
        const centerY = toNumber(spot.y, 0) + (height / 2);

        state.selectedLayoutSpotKey = spotKey;
        state.drag = {
            spotKey: spotKey,
            mode: mode,
            startPointerX: startX,
            startPointerY: startY,
            startX: toNumber(spot.x, 0),
            startY: toNumber(spot.y, 0),
            startWidth: width,
            startHeight: height,
            startRotation: toNumber(spot.rotation, 0),
            startAngle: calculateAngle(centerX, centerY, startX, startY)
        };

        populateLayoutInspector(spot);
        renderLayoutCanvas();
        refreshLayoutControls();
        event.preventDefault();
    }

    function onGlobalPointerMove(event) {
        if (!state.drag) {
            return;
        }

        const spot = findLayoutSpotByKey(state.drag.spotKey);
        if (!spot) {
            state.drag = null;
            return;
        }

        const dx = event.clientX - state.drag.startPointerX;
        const dy = event.clientY - state.drag.startPointerY;
        const nextValues = {};

        if (state.drag.mode === "drag") {
            nextValues.x = clamp(state.drag.startX + dx, 0, LAYOUT_CANVAS_WIDTH - state.drag.startWidth);
            nextValues.y = clamp(state.drag.startY + dy, 0, LAYOUT_CANVAS_HEIGHT - state.drag.startHeight);
        } else if (state.drag.mode === "resize-se") {
            nextValues.width = clamp(state.drag.startWidth + dx, LAYOUT_MIN_SIZE, 320);
            nextValues.height = clamp(state.drag.startHeight + dy, LAYOUT_MIN_SIZE, 240);
        } else if (state.drag.mode === "resize-sw") {
            nextValues.width = clamp(state.drag.startWidth - dx, LAYOUT_MIN_SIZE, 320);
            nextValues.height = clamp(state.drag.startHeight + dy, LAYOUT_MIN_SIZE, 240);
            nextValues.x = clamp(state.drag.startX + dx, 0, LAYOUT_CANVAS_WIDTH - nextValues.width);
        } else if (state.drag.mode === "resize-ne") {
            nextValues.width = clamp(state.drag.startWidth + dx, LAYOUT_MIN_SIZE, 320);
            nextValues.height = clamp(state.drag.startHeight - dy, LAYOUT_MIN_SIZE, 240);
            nextValues.y = clamp(state.drag.startY + dy, 0, LAYOUT_CANVAS_HEIGHT - nextValues.height);
        } else if (state.drag.mode === "resize-nw") {
            nextValues.width = clamp(state.drag.startWidth - dx, LAYOUT_MIN_SIZE, 320);
            nextValues.height = clamp(state.drag.startHeight - dy, LAYOUT_MIN_SIZE, 240);
            nextValues.x = clamp(state.drag.startX + dx, 0, LAYOUT_CANVAS_WIDTH - nextValues.width);
            nextValues.y = clamp(state.drag.startY + dy, 0, LAYOUT_CANVAS_HEIGHT - nextValues.height);
        } else if (state.drag.mode === "rotate") {
            const centerX = state.drag.startX + (state.drag.startWidth / 2);
            const centerY = state.drag.startY + (state.drag.startHeight / 2);
            const currentAngle = calculateAngle(centerX, centerY, event.clientX, event.clientY);
            nextValues.rotation = normalizeAngle(state.drag.startRotation + (currentAngle - state.drag.startAngle));
        }

        patchSelectedLayoutSpot(nextValues, true);
        event.preventDefault();
    }

    function onGlobalPointerUp() {
        if (!state.drag) {
            return;
        }

        state.drag = null;
        populateLayoutInspector(getSelectedLayoutSpot());
    }

    function populateLayoutInspector(spot) {
        if (!spot) {
            resetLayoutSelection();
            return;
        }

        if (layoutSpotId) {
            layoutSpotId.value = spot.id || "";
        }
        if (layoutSpotCode) {
            layoutSpotCode.value = spot.spot_code || "";
        }
        if (layoutSpotLabel) {
            layoutSpotLabel.value = spot.label || "";
        }
        if (layoutSpotZone) {
            layoutSpotZone.value = spot.zone || "";
        }
        if (layoutSpotRow) {
            layoutSpotRow.value = spot.row_name || "";
        }
        if (layoutSpotStatus) {
            layoutSpotStatus.value = normalizeBaseStatus(spot.base_status);
        }
        if (layoutSpotShape) {
            layoutSpotShape.value = upperOrFallback(spot.shape, "RECT");
        }
        if (layoutSpotUmbrellas) {
            layoutSpotUmbrellas.value = String(spot.base_umbrellas != null ? spot.base_umbrellas : 0);
        }
        if (layoutSpotSunbeds) {
            layoutSpotSunbeds.value = String(spot.base_sunbeds != null ? spot.base_sunbeds : 0);
        }
        if (layoutSpotSortOrder) {
            layoutSpotSortOrder.value = String(spot.sort_order != null ? spot.sort_order : 0);
        }
        if (layoutSpotZIndex) {
            layoutSpotZIndex.value = String(spot.z_index != null ? spot.z_index : 0);
        }
        if (layoutSpotX) {
            layoutSpotX.value = String(Math.round(toNumber(spot.x, 0)));
        }
        if (layoutSpotY) {
            layoutSpotY.value = String(Math.round(toNumber(spot.y, 0)));
        }
        if (layoutSpotWidth) {
            layoutSpotWidth.value = String(Math.round(toNumber(spot.width, 150)));
        }
        if (layoutSpotHeight) {
            layoutSpotHeight.value = String(Math.round(toNumber(spot.height, 118)));
        }
        if (layoutSpotRotation) {
            layoutSpotRotation.value = String(Math.round(toNumber(spot.rotation, 0)));
        }
        if (layoutSelectedCode) {
            layoutSelectedCode.textContent = spot.spot_code || "-";
        }
        if (layoutSelectedLabel) {
            layoutSelectedLabel.textContent = (spot.label || "Postazione") + " · " + (spot.zone || "VIP");
        }
        if (layoutSelectedDetails) {
            layoutSelectedDetails.textContent = buildLayoutSelectionSummary(spot);
        }
        if (layoutSelectedMeta) {
            layoutSelectedMeta.textContent = state.isAdmin
                ? "Puoi spostare la postazione dal canvas o rifinire numeri e geometria da questo pannello."
                : "Stai osservando il layout attivo. Le modifiche richiedono un account admin.";
        }
        if (layoutEditorPill) {
            layoutEditorPill.textContent = spot.spot_code || "Selezionata";
        }
        if (layoutSelectedCard) {
            layoutSelectedCard.classList.add("is-selected");
        }

        refreshLayoutControls();
    }

    function syncSelectedLayoutSpotFromForm() {
        const selectedSpot = getSelectedLayoutSpot();
        if (!selectedSpot || !state.isAdmin) {
            return;
        }

        patchSelectedLayoutSpot({
            spot_code: upperOrFallback(layoutSpotCode ? layoutSpotCode.value : "", selectedSpot.spot_code),
            label: cleanString(layoutSpotLabel ? layoutSpotLabel.value : ""),
            zone: upperOrFallback(layoutSpotZone ? layoutSpotZone.value : "", selectedSpot.zone),
            row_name: upperOrFallback(layoutSpotRow ? layoutSpotRow.value : "", selectedSpot.row_name),
            base_status: normalizeBaseStatus(layoutSpotStatus ? layoutSpotStatus.value : selectedSpot.base_status),
            shape: upperOrFallback(layoutSpotShape ? layoutSpotShape.value : "", selectedSpot.shape),
            base_umbrellas: clamp(toInteger(layoutSpotUmbrellas ? layoutSpotUmbrellas.value : selectedSpot.base_umbrellas, selectedSpot.base_umbrellas), 0, 20),
            base_sunbeds: clamp(toInteger(layoutSpotSunbeds ? layoutSpotSunbeds.value : selectedSpot.base_sunbeds, selectedSpot.base_sunbeds), 0, 20),
            sort_order: clamp(toInteger(layoutSpotSortOrder ? layoutSpotSortOrder.value : selectedSpot.sort_order, selectedSpot.sort_order), 0, 999),
            z_index: clamp(toInteger(layoutSpotZIndex ? layoutSpotZIndex.value : selectedSpot.z_index, selectedSpot.z_index), 0, 999),
            x: clamp(toNumber(layoutSpotX ? layoutSpotX.value : selectedSpot.x, selectedSpot.x), 0, LAYOUT_CANVAS_WIDTH - LAYOUT_MIN_SIZE),
            y: clamp(toNumber(layoutSpotY ? layoutSpotY.value : selectedSpot.y, selectedSpot.y), 0, LAYOUT_CANVAS_HEIGHT - LAYOUT_MIN_SIZE),
            width: clamp(toNumber(layoutSpotWidth ? layoutSpotWidth.value : selectedSpot.width, selectedSpot.width), LAYOUT_MIN_SIZE, 320),
            height: clamp(toNumber(layoutSpotHeight ? layoutSpotHeight.value : selectedSpot.height, selectedSpot.height), LAYOUT_MIN_SIZE, 240),
            rotation: normalizeAngle(toNumber(layoutSpotRotation ? layoutSpotRotation.value : selectedSpot.rotation, selectedSpot.rotation))
        });
    }

    function patchSelectedLayoutSpot(patch, skipFormRefresh) {
        const selectedSpot = getSelectedLayoutSpot();
        if (!selectedSpot) {
            return;
        }

        Object.keys(patch || {}).forEach(function (key) {
            if (typeof patch[key] !== "undefined") {
                selectedSpot[key] = patch[key];
            }
        });

        if (selectedSpot.width != null) {
            selectedSpot.width = clamp(toNumber(selectedSpot.width, 150), LAYOUT_MIN_SIZE, 320);
        }
        if (selectedSpot.height != null) {
            selectedSpot.height = clamp(toNumber(selectedSpot.height, 118), LAYOUT_MIN_SIZE, 240);
        }
        if (selectedSpot.x != null) {
            selectedSpot.x = clamp(toNumber(selectedSpot.x, 0), 0, LAYOUT_CANVAS_WIDTH - clamp(toNumber(selectedSpot.width, 150), LAYOUT_MIN_SIZE, 320));
        }
        if (selectedSpot.y != null) {
            selectedSpot.y = clamp(toNumber(selectedSpot.y, 0), 0, LAYOUT_CANVAS_HEIGHT - clamp(toNumber(selectedSpot.height, 118), LAYOUT_MIN_SIZE, 240));
        }
        selectedSpot.rotation = normalizeAngle(toNumber(selectedSpot.rotation, 0));
        selectedSpot.shape = ["RECT", "ROUND", "CABANA"].includes(upperOrFallback(selectedSpot.shape, "RECT"))
            ? upperOrFallback(selectedSpot.shape, "RECT")
            : "RECT";

        markLayoutDirty(true);
        renderLayoutSummary();
        renderLayoutCanvas();

        if (!skipFormRefresh) {
            populateLayoutInspector(selectedSpot);
        } else if (layoutSelectedDetails) {
            layoutSelectedDetails.textContent = buildLayoutSelectionSummary(selectedSpot);
        }
    }

    function createNewLayoutSpot() {
        if (!state.isAdmin) {
            window.FDAVip.showStatus(layoutStatusBox, "Solo un admin puo creare nuove postazioni permanenti.", "error");
            return;
        }

        const baseSpot = getSelectedLayoutSpot();
        const preferredRow = upperOrFallback(baseSpot && baseSpot.row_name, "A");
        const nextSortOrder = baseSpot
            ? clamp(toInteger(baseSpot.sort_order, 1) + 1, 1, 999)
            : getNextSortOrderForRow(preferredRow);
        const nextCode = generateSpotCodeForRow(preferredRow, nextSortOrder);
        const nextSpot = normalizeLayoutSpot({
            id: null,
            layout_id: state.layoutId,
            spot_code: nextCode,
            label: "Nuova postazione " + nextCode,
            zone: upperOrFallback(baseSpot && baseSpot.zone, "VIP"),
            row_name: preferredRow,
            sort_order: nextSortOrder,
            base_umbrellas: baseSpot ? baseSpot.base_umbrellas : 1,
            base_sunbeds: baseSpot ? baseSpot.base_sunbeds : 2,
            base_status: baseSpot ? baseSpot.base_status : "DISPONIBILE",
            x: baseSpot ? clamp(toNumber(baseSpot.x, 60) + 30, 0, LAYOUT_CANVAS_WIDTH - 160) : 80,
            y: baseSpot ? clamp(toNumber(baseSpot.y, 60) + 30, 0, LAYOUT_CANVAS_HEIGHT - 140) : 88,
            width: baseSpot ? baseSpot.width : 150,
            height: baseSpot ? baseSpot.height : 118,
            rotation: baseSpot ? baseSpot.rotation : 0,
            shape: baseSpot ? baseSpot.shape : "RECT",
            z_index: baseSpot ? baseSpot.z_index + 1 : state.layoutRowsDraft.length
        }, state.layoutId);

        state.layoutRowsDraft.push(nextSpot);
        state.selectedLayoutSpotKey = nextSpot._localKey;
        markLayoutDirty(true);
        renderLayoutSummary();
        renderLayoutCanvas();
        populateLayoutInspector(nextSpot);
        refreshLayoutControls();
        window.FDAVip.showStatus(layoutStatusBox, "Nuova postazione creata in bozza. Salva il layout per renderla permanente.", "success");
    }

    function duplicateSelectedLayoutSpot() {
        const selectedSpot = getSelectedLayoutSpot();

        if (!selectedSpot) {
            window.FDAVip.showStatus(layoutStatusBox, "Seleziona prima una postazione da duplicare.", "error");
            return;
        }
        if (!state.isAdmin) {
            window.FDAVip.showStatus(layoutStatusBox, "Solo un admin puo duplicare le postazioni permanenti.", "error");
            return;
        }

        const duplicate = normalizeLayoutSpot({
            id: null,
            layout_id: state.layoutId,
            spot_code: generateSpotCodeForRow(selectedSpot.row_name, clamp(toInteger(selectedSpot.sort_order, 1) + 1, 1, 999)),
            label: cleanString(selectedSpot.label ? selectedSpot.label + " copia" : "Copia " + selectedSpot.spot_code),
            zone: selectedSpot.zone,
            row_name: selectedSpot.row_name,
            sort_order: clamp(toInteger(selectedSpot.sort_order, 1) + 1, 1, 999),
            base_umbrellas: selectedSpot.base_umbrellas,
            base_sunbeds: selectedSpot.base_sunbeds,
            base_status: selectedSpot.base_status,
            x: clamp(toNumber(selectedSpot.x, 60) + 34, 0, LAYOUT_CANVAS_WIDTH - 160),
            y: clamp(toNumber(selectedSpot.y, 60) + 34, 0, LAYOUT_CANVAS_HEIGHT - 140),
            width: selectedSpot.width,
            height: selectedSpot.height,
            rotation: selectedSpot.rotation,
            shape: selectedSpot.shape,
            z_index: clamp(toInteger(selectedSpot.z_index, 0) + 1, 0, 999)
        }, state.layoutId);

        state.layoutRowsDraft.push(duplicate);
        state.selectedLayoutSpotKey = duplicate._localKey;
        markLayoutDirty(true);
        renderLayoutSummary();
        renderLayoutCanvas();
        populateLayoutInspector(duplicate);
        refreshLayoutControls();
        window.FDAVip.showStatus(layoutStatusBox, "Postazione duplicata in bozza. Salva il layout per confermarla.", "success");
    }

    function deleteSelectedLayoutSpot() {
        const selectedSpot = getSelectedLayoutSpot();

        if (!selectedSpot) {
            window.FDAVip.showStatus(layoutStatusBox, "Seleziona prima una postazione da eliminare.", "error");
            return;
        }
        if (!state.isAdmin) {
            window.FDAVip.showStatus(layoutStatusBox, "Solo un admin puo eliminare le postazioni permanenti.", "error");
            return;
        }

        const confirmed = window.confirm(
            "Vuoi eliminare la postazione " + (selectedSpot.spot_code || "selezionata") + " dal layout permanente?"
        );

        if (!confirmed) {
            return;
        }

        if (selectedSpot.id) {
            state.layoutDeletedIds.add(selectedSpot.id);
        }

        state.layoutRowsDraft = state.layoutRowsDraft.filter(function (spot) {
            return spot._localKey !== selectedSpot._localKey;
        });
        state.selectedLayoutSpotKey = "";
        markLayoutDirty(true);
        renderLayoutSummary();
        renderLayoutCanvas();
        resetLayoutSelection();
        refreshLayoutControls();
        window.FDAVip.showStatus(layoutStatusBox, "Postazione rimossa dalla bozza. Salva il layout per applicare la modifica.", "success");
    }

    function resetLayoutDraft() {
        if (!state.layoutDirty) {
            resetLayoutSelection();
            return;
        }

        const confirmed = window.confirm("Vuoi annullare tutte le modifiche locali del layout permanente?");
        if (!confirmed) {
            return;
        }

        state.layoutRowsDraft = cloneLayoutRows(state.layoutRowsOriginal);
        state.layoutDeletedIds = new Set();
        state.selectedLayoutSpotKey = "";
        markLayoutDirty(false);
        renderLayoutSummary();
        renderLayoutCanvas();
        resetLayoutSelection();
        refreshLayoutControls();
        window.FDAVip.showStatus(layoutStatusBox, "Bozza ripristinata dal layout salvato su Supabase.", "success");
    }

    function autoArrangeLayout() {
        if (!state.isAdmin) {
            window.FDAVip.showStatus(layoutStatusBox, "Solo un admin puo riordinare e salvare il layout permanente.", "error");
            return;
        }
        if (!state.layoutRowsDraft.length) {
            return;
        }

        applyAutoCoordinates(state.layoutRowsDraft);
        state.layoutRowsDraft.forEach(function (spot, index) {
            spot.z_index = index;
        });

        markLayoutDirty(true);
        renderLayoutSummary();
        renderLayoutCanvas();
        populateLayoutInspector(getSelectedLayoutSpot());
        window.FDAVip.showStatus(layoutStatusBox, "Le postazioni sono state riallineate automaticamente nel canvas.", "success");
    }

    async function saveLayout() {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(layoutStatusBox))) {
            return;
        }
        if (!(await dashboard.ensureAdminSession(layoutStatusBox))) {
            return;
        }
        if (!state.layoutId) {
            window.FDAVip.showStatus(layoutStatusBox, "Nessun layout attivo disponibile da salvare.", "error");
            return;
        }
        if (!state.layoutDirty) {
            window.FDAVip.showStatus(layoutStatusBox, "Non ci sono modifiche locali da salvare.", "success");
            return;
        }

        setLayoutActionsDisabled(true, "Salvataggio...");
        window.FDAVip.hideStatus(layoutStatusBox);

        try {
            const deletedIds = Array.from(state.layoutDeletedIds);
            if (deletedIds.length) {
                const { error: deleteError } = await supabaseClient
                    .from("beach_spots")
                    .delete()
                    .in("id", deletedIds);

                if (deleteError) {
                    throw deleteError;
                }
            }

            const existingRows = state.layoutRowsDraft
                .filter(function (spot) {
                    return Boolean(spot.id);
                })
                .map(function (spot) {
                    return buildSpotPayload(spot, true);
                });

            if (existingRows.length) {
                const { error: updateError } = await supabaseClient
                    .from("beach_spots")
                    .upsert(existingRows, {
                        onConflict: "id"
                    });

                if (updateError) {
                    throw updateError;
                }
            }

            const newRows = state.layoutRowsDraft
                .filter(function (spot) {
                    return !spot.id;
                })
                .map(function (spot) {
                    return buildSpotPayload(spot, false);
                });

            if (newRows.length) {
                const { error: insertError } = await supabaseClient
                    .from("beach_spots")
                    .insert(newRows);

                if (insertError) {
                    throw insertError;
                }
            }

            window.FDAVip.showStatus(layoutStatusBox, "Layout permanente salvato correttamente su Supabase.", "success");
            await loadLayout(true);
            if (state.date) {
                await loadAdminMap(state.date, true);
            }
            if (dashboard.loadDashboardStats) {
                dashboard.loadDashboardStats();
            }
        } catch (err) {
            window.FDAVip.showStatus(layoutStatusBox, humanizeLayoutError(err), "error");
        } finally {
            setLayoutActionsDisabled(false);
        }
    }

    function buildSpotPayload(spot, includeId) {
        const payload = {
            layout_id: state.layoutId,
            spot_code: upperOrFallback(spot.spot_code, buildTempSpotCode()),
            label: cleanString(spot.label) || null,
            zone: upperOrFallback(spot.zone, "VIP"),
            row_name: upperOrFallback(spot.row_name, "A"),
            sort_order: clamp(toInteger(spot.sort_order, 1), 0, 999),
            base_umbrellas: clamp(toInteger(spot.base_umbrellas, 1), 0, 20),
            base_sunbeds: clamp(toInteger(spot.base_sunbeds, 2), 0, 20),
            base_status: normalizeBaseStatus(spot.base_status),
            x: roundDecimal(clamp(toNumber(spot.x, 0), 0, LAYOUT_CANVAS_WIDTH - LAYOUT_MIN_SIZE), 2),
            y: roundDecimal(clamp(toNumber(spot.y, 0), 0, LAYOUT_CANVAS_HEIGHT - LAYOUT_MIN_SIZE), 2),
            width: roundDecimal(clamp(toNumber(spot.width, 150), LAYOUT_MIN_SIZE, 320), 2),
            height: roundDecimal(clamp(toNumber(spot.height, 118), LAYOUT_MIN_SIZE, 240), 2),
            rotation: roundDecimal(normalizeAngle(toNumber(spot.rotation, 0)), 2),
            shape: upperOrFallback(spot.shape, "RECT"),
            z_index: clamp(toInteger(spot.z_index, 0), 0, 999)
        };

        if (includeId && spot.id) {
            payload.id = spot.id;
        }

        return payload;
    }

    async function loadAdminMap(dateValue, preserveSelection) {
        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        const normalizedDate = String(dateValue || "").trim();
        state.date = normalizedDate;

        if (!preserveSelection) {
            resetSelection();
        }

        if (!normalizedDate) {
            renderEmptyMap("Scegli una data per leggere la piantina del giorno.");
            window.FDAVip.hideStatus(statusBox);
            return;
        }

        mapGrid.innerHTML = "<div class='vip-admin-empty-inline'>Carichiamo la piantina staff del giorno...</div>";
        if (mapTitle) {
            mapTitle.textContent = "Caricamento in corso";
        }
        window.FDAVip.hideStatus(statusBox);

        try {
            const { data, error } = await supabaseClient.rpc("admin_get_booking_map_for_date", {
                p_booking_date: normalizedDate
            });

            if (error) {
                throw error;
            }

            state.rows = Array.isArray(data) ? data : [];

            if (!state.rows.length) {
                renderEmptyMap("Nessuna postazione configurata per il layout attivo.");
                renderCounters([]);
                window.FDAVip.showStatus(statusBox, "Nessuna postazione trovata per la data selezionata.", "error");
                return;
            }

            renderMap(state.rows, normalizedDate);
            renderCounters(state.rows);

            if (preserveSelection && state.selectedSpotId) {
                const currentSpot = findSpotById(state.selectedSpotId);
                if (currentSpot) {
                    populateEditor(currentSpot);
                } else {
                    resetSelection();
                }
            }

            window.FDAVip.showStatus(statusBox, buildAdminMessage(state.rows), "success");
        } catch (err) {
            state.rows = [];
            renderEmptyMap("Non riusciamo a leggere la piantina in questo momento.");
            renderCounters([]);
            window.FDAVip.showStatus(
                statusBox,
                "Errore nel caricamento della mappa giornaliera. Riprova tra poco.",
                "error"
            );
        }
    }

    function renderMap(rows, dateValue) {
        const availableCount = rows.filter(function (row) {
            return row.final_status === "DISPONIBILE" && row.is_bookable;
        }).length;

        if (mapTitle) {
            mapTitle.textContent = "Piantina staff del " + formatDateLabel(dateValue);
        }
        if (mapMeta) {
            mapMeta.textContent = availableCount + " postazioni disponibili ora. Clicca una postazione per modificarne lo stato.";
        }
        if (dayPill) {
            dayPill.textContent = formatShortDate(dateValue);
        }

        mapGrid.innerHTML = "";

        const CANVAS_WIDTH = 1200;
        const CANVAS_HEIGHT = 760;
        const MIN_SIZE = 72;

        rows.forEach(function (spot) {
            const button = document.createElement("button");
            const left = clamp(toNumber(spot.x, 0), 0, CANVAS_WIDTH - MIN_SIZE);
            const top = clamp(toNumber(spot.y, 0), 0, CANVAS_HEIGHT - MIN_SIZE);
            const width = clamp(toNumber(spot.width, 150), MIN_SIZE, 320);
            const height = clamp(toNumber(spot.height, 118), MIN_SIZE, 240);
            const rotation = clamp(toNumber(spot.rotation, 0), -180, 180);

            button.type = "button";
            button.className = buildSpotClassName(spot);
            button.setAttribute("data-spot-id", spot.spot_id);
            
            button.style.position = "absolute";
            button.style.left = left + "px";
            button.style.top = top + "px";
            button.style.width = width + "px";
            button.style.height = height + "px";
            button.style.transform = "rotate(" + rotation + "deg)";
            button.style.zIndex = String(clamp(toInteger(spot.z_index, 0), 0, 999));

            button.innerHTML = dashboard.escapeHtml(spot.spot_code);

            button.addEventListener("click", function () {
                state.selectedSpotId = spot.spot_id;
                populateEditor(spot);
                refreshSelectionStyles();
            });

            mapGrid.appendChild(button);
        });
    }

    function renderCounters(rows) {
        setText("vipBeachAvailableCount", countStatus(rows, "DISPONIBILE"));
        setText("vipBeachOccupiedCount", countStatus(rows, "RISERVATA"));
        setText("vipBeachBlockedCount", countStatus(rows, "BLOCCATA"));
        setText("vipBeachMaintenanceCount", countStatus(rows, "MANUTENZIONE"));
        setText("vipBeachOverridesCount", rows.filter(function (row) {
            return Boolean(row.override_id);
        }).length);
    }

    function renderEmptyMap(message) {
        if (mapTitle) {
            mapTitle.textContent = "Seleziona una data";
        }
        if (mapMeta) {
            mapMeta.textContent = "Ogni postazione mostra stato finale e capienza.";
        }
        if (dayPill) {
            dayPill.textContent = "Seleziona una data";
        }
        mapGrid.innerHTML = "<div class='vip-admin-empty-inline'>" + dashboard.escapeHtml(message) + "</div>";
    }

    function populateEditor(spot) {
        if (!spot) {
            resetSelection();
            return;
        }

        if (overrideSpotId) {
            overrideSpotId.value = spot.spot_id || "";
        }
        if (overrideStatus) {
            overrideStatus.value = spot.override_status || "";
        }
        if (overrideUmbrellas) {
            overrideUmbrellas.value = spot.override_id && spot.umbrellas != null ? String(spot.umbrellas) : "";
            overrideUmbrellas.placeholder = "Base: " + (spot.umbrellas != null ? spot.umbrellas : 0);
        }
        if (overrideSunbeds) {
            overrideSunbeds.value = spot.override_id && spot.sunbeds != null ? String(spot.sunbeds) : "";
            overrideSunbeds.placeholder = "Base: " + (spot.sunbeds != null ? spot.sunbeds : 0);
        }
        if (overrideNote) {
            overrideNote.value = spot.admin_note || "";
        }
        if (selectedCode) {
            selectedCode.textContent = spot.spot_code || "-";
        }
        if (selectedLabel) {
            selectedLabel.textContent = (spot.label || "Postazione") + " · " + (spot.zone || "Area VIP");
        }
        if (selectedDetails) {
            selectedDetails.textContent = getDetailedSummary(spot);
        }
        if (selectedMeta) {
            selectedMeta.textContent = spot.active_booking_id
                ? "Postazione occupata nella giornata selezionata."
                : "Nessuna occupazione attiva. Puoi applicare un override giornaliero.";
        }
        if (editorPill) {
            editorPill.textContent = spot.spot_code || "Selezionata";
        }
        if (selectedCard) {
            selectedCard.classList.add("is-selected");
        }
    }

    async function onSubmitOverride(event) {
        event.preventDefault();

        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        if (!state.date) {
            window.FDAVip.showStatus(statusBox, "Seleziona prima una data di servizio.", "error");
            return;
        }
        if (!overrideSpotId || !overrideSpotId.value) {
            window.FDAVip.showStatus(statusBox, "Seleziona prima una postazione dalla mappa.", "error");
            return;
        }

        overrideSaveButton.disabled = true;
        overrideSaveButton.textContent = "Salvataggio...";
        window.FDAVip.hideStatus(statusBox);

        try {
            const { data, error } = await supabaseClient.rpc("admin_upsert_spot_override", {
                p_spot_id: overrideSpotId.value,
                p_service_date: state.date,
                p_status: nullableString(overrideStatus ? overrideStatus.value : ""),
                p_umbrellas: nullableNumber(overrideUmbrellas ? overrideUmbrellas.value : ""),
                p_sunbeds: nullableNumber(overrideSunbeds ? overrideSunbeds.value : ""),
                p_admin_note: nullableString(overrideNote ? overrideNote.value : "")
            });

            if (error) {
                throw error;
            }

            const result = Array.isArray(data) ? data[0] : data;
            const actionLabel = result && result.action === "CLEARED"
                ? "Override rimosso correttamente."
                : "Override giornaliero salvato correttamente.";

            window.FDAVip.showStatus(statusBox, actionLabel, "success");
            await loadAdminMap(state.date, true);
        } catch (err) {
            window.FDAVip.showStatus(statusBox, humanizeOverrideError(err), "error");
        } finally {
            overrideSaveButton.disabled = false;
            overrideSaveButton.textContent = "Salva override";
        }
    }

    async function clearOverride() {
        if (!overrideSpotId || !overrideSpotId.value || !state.date) {
            resetSelection();
            return;
        }

        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        overrideClearButton.disabled = true;

        try {
            const { error } = await supabaseClient.rpc("admin_upsert_spot_override", {
                p_spot_id: overrideSpotId.value,
                p_service_date: state.date,
                p_status: null,
                p_umbrellas: null,
                p_sunbeds: null,
                p_admin_note: null
            });

            if (error) {
                throw error;
            }

            window.FDAVip.showStatus(statusBox, "Override rimosso. La postazione eredita di nuovo il layout base.", "success");
            await loadAdminMap(state.date);
        } catch (err) {
            window.FDAVip.showStatus(statusBox, humanizeOverrideError(err), "error");
        } finally {
            overrideClearButton.disabled = false;
        }
    }

    function resetSelection() {
        state.selectedSpotId = "";

        if (overrideForm) {
            overrideForm.reset();
        }
        if (overrideSpotId) {
            overrideSpotId.value = "";
        }
        if (selectedCode) {
            selectedCode.textContent = "-";
        }
        if (selectedLabel) {
            selectedLabel.textContent = "Nessuna postazione selezionata";
        }
        if (selectedDetails) {
            selectedDetails.textContent = "Lo snapshot finale della giornata apparira qui.";
        }
        if (selectedMeta) {
            selectedMeta.textContent = "Seleziona una postazione dalla mappa per modificarne lo stato o la capienza solo per il giorno scelto.";
        }
        if (editorPill) {
            editorPill.textContent = "Nessuna selezione";
        }
        if (selectedCard) {
            selectedCard.classList.remove("is-selected");
        }

        refreshSelectionStyles();
    }

    function resetLayoutSelection() {
        state.selectedLayoutSpotKey = "";

        if (layoutSpotForm) {
            layoutSpotForm.reset();
        }
        if (layoutSpotId) {
            layoutSpotId.value = "";
        }
        if (layoutSelectedCode) {
            layoutSelectedCode.textContent = "-";
        }
        if (layoutSelectedLabel) {
            layoutSelectedLabel.textContent = "Nessuna postazione selezionata";
        }
        if (layoutSelectedDetails) {
            layoutSelectedDetails.textContent = "La scheda mostra i dettagli della postazione selezionata.";
        }
        if (layoutSelectedMeta) {
            layoutSelectedMeta.textContent = "Seleziona una postazione dal canvas per modificarne codice, geometria, capienza e stato base.";
        }
        if (layoutEditorPill) {
            layoutEditorPill.textContent = "Nessuna selezione";
        }
        if (layoutSelectedCard) {
            layoutSelectedCard.classList.remove("is-selected");
        }

        renderLayoutCanvas();
        refreshLayoutControls();
    }

    function refreshSelectionStyles() {
        Array.from(document.querySelectorAll("#vipBeachAdminMapGrid .vip-beach-spot")).forEach(function (button) {
            const isSelected = button.getAttribute("data-spot-id") === state.selectedSpotId;
            button.classList.toggle("is-selected", Boolean(isSelected));
        });
    }

    function refreshLayoutControls() {
        const hasSelection = Boolean(getSelectedLayoutSpot());
        const editable = Boolean(state.isAdmin);

        if (layoutDuplicateSpotButton) {
            layoutDuplicateSpotButton.disabled = !editable || !hasSelection;
        }
        if (layoutDeleteSpotButton) {
            layoutDeleteSpotButton.disabled = !editable || !hasSelection;
        }
        if (layoutNewSpotButton) {
            layoutNewSpotButton.disabled = !editable || !state.layoutId;
        }
        if (layoutAutoArrangeButton) {
            layoutAutoArrangeButton.disabled = !editable || !state.layoutRowsDraft.length;
        }
        if (layoutSaveButton) {
            layoutSaveButton.disabled = !editable || !state.layoutDirty;
        }
        if (layoutResetDraftButton) {
            layoutResetDraftButton.disabled = !state.layoutDirty;
        }

        Array.from(layoutSpotForm.querySelectorAll("input, select")).forEach(function (field) {
            field.disabled = !editable || !hasSelection;
        });
    }

    function renderLayoutSummary() {
        const zones = new Set();
        state.layoutRowsDraft.forEach(function (spot) {
            if (spot.zone) {
                zones.add(spot.zone);
            }
        });

        setText("vipLayoutActiveName", state.layoutName ? state.layoutName + " v" + state.layoutVersion : "-");
        setText("vipLayoutSpotsCount", state.layoutRowsDraft.length);
        setText("vipLayoutZonesCount", zones.size);
        setText("vipLayoutDirtyState", state.layoutDirty ? "Modificata" : "Pulita");
    }

    function renderEmptyLayout(message) {
        if (layoutCanvasTitle) {
            layoutCanvasTitle.textContent = "Layout permanente";
        }
        if (layoutCanvasMeta) {
            layoutCanvasMeta.textContent = "Il canvas mostrera qui il layout base della piscina.";
        }
        if (layoutCanvas) {
            layoutCanvas.innerHTML = "<div class='vip-admin-empty-inline'>" + dashboard.escapeHtml(message) + "</div>";
            layoutCanvas.style.width = LAYOUT_CANVAS_WIDTH + "px";
            layoutCanvas.style.height = LAYOUT_CANVAS_HEIGHT + "px";
        }
    }

    function findSpotById(spotId) {
        return state.rows.find(function (row) {
            return row.spot_id === spotId;
        }) || null;
    }

    function findLayoutSpotByKey(spotKey) {
        return state.layoutRowsDraft.find(function (row) {
            return row._localKey === spotKey;
        }) || null;
    }

    function getSelectedLayoutSpot() {
        return findLayoutSpotByKey(state.selectedLayoutSpotKey);
    }

    function groupByRow(rows) {
        const groups = [];
        const lookup = new Map();

        rows.forEach(function (row) {
            const key = row.row_name || "A";
            if (!lookup.has(key)) {
                const bucket = {
                    rowName: key,
                    zoneLabel: row.zone || "Area VIP",
                    spots: []
                };
                lookup.set(key, bucket);
                groups.push(bucket);
            }
            lookup.get(key).spots.push(row);
        });

        return groups;
    }

    function buildSpotClassName(spot) {
        const classNames = ["vip-beach-spot", "is-admin"];
        const status = String(spot.final_status || "").toUpperCase();

        if (status === "DISPONIBILE") {
            classNames.push("is-available");
        } else if (status === "OCCUPATA") {
            classNames.push("is-booked");
        } else if (status === "RISERVATA") {
            classNames.push("is-occupied");
        } else if (status === "MANUTENZIONE") {
            classNames.push("is-maintenance");
        } else {
            classNames.push("is-blocked");
        }

        if (spot.spot_id === state.selectedSpotId) {
            classNames.push("is-selected");
        }

        return classNames.join(" ");
    }

    function buildLayoutSpotClassName(spot, isSelected) {
        const classNames = ["vip-layout-spot"];
        const status = normalizeBaseStatus(spot.base_status);
        const shape = upperOrFallback(spot.shape, "RECT");

        if (status === "DISPONIBILE") {
            classNames.push("is-available");
        } else if (status === "RISERVATA") {
            classNames.push("is-occupied");
        } else if (status === "MANUTENZIONE") {
            classNames.push("is-maintenance");
        } else {
            classNames.push("is-blocked");
        }

        classNames.push("shape-" + shape.toLowerCase());

        if (isSelected) {
            classNames.push("is-selected");
        }

        return classNames.join(" ");
    }

    function buildLayoutSpotMeta(spot) {
        return (spot.base_umbrellas || 0) + " omb · " + (spot.base_sunbeds || 0) + " let";
    }

    function buildLayoutSelectionSummary(spot) {
        return [
            "Fila " + (spot.row_name || "-"),
            "stato " + normalizeBaseStatus(spot.base_status).toLowerCase(),
            (spot.base_umbrellas || 0) + " ombrelloni",
            (spot.base_sunbeds || 0) + " lettini",
            "layer " + clamp(toInteger(spot.z_index, 0), 0, 999)
        ].join(" · ");
    }

    function getSpotBadge(spot) {
        const suffix = spot.active_booking_id ? " · occupata" : "";
        return (spot.umbrellas || 0) + " omb · " + (spot.sunbeds || 0) + " let" + suffix;
    }

    function getDetailedSummary(spot) {
        const parts = [
            "Stato finale: " + (spot.final_status || "-"),
            (spot.umbrellas || 0) + " ombrelloni",
            (spot.sunbeds || 0) + " lettini"
        ];

        if (spot.override_id) {
            parts.push("override attivo");
        }

        return parts.join(" · ");
    }

    function buildAdminMessage(rows) {
        return [
            countStatus(rows, "DISPONIBILE") + " disponibili",
            countStatus(rows, "RISERVATA") + " occupate",
            rows.filter(function (row) {
                return Boolean(row.override_id);
            }).length + " override attivi"
        ].join(" · ");
    }

    function countStatus(rows, status) {
        return rows.filter(function (row) {
            return row.final_status === status;
        }).length;
    }

    function markLayoutDirty(nextValue) {
        state.layoutDirty = Boolean(nextValue);
    }

    function compareLayoutSpots(a, b) {
        return (
            clamp(toInteger(a.z_index, 0), 0, 999) - clamp(toInteger(b.z_index, 0), 0, 999) ||
            String(a.row_name || "").localeCompare(String(b.row_name || "")) ||
            clamp(toInteger(a.sort_order, 0), 0, 999) - clamp(toInteger(b.sort_order, 0), 0, 999) ||
            String(a.spot_code || "").localeCompare(String(b.spot_code || ""))
        );
    }

    function cloneLayoutRows(rows) {
        return (rows || []).map(function (row) {
            return {
                id: row.id || null,
                _localKey: row.id || row._localKey || buildTempKey(),
                layout_id: row.layout_id || state.layoutId,
                spot_code: row.spot_code,
                label: row.label,
                zone: row.zone,
                row_name: row.row_name,
                sort_order: row.sort_order,
                base_umbrellas: row.base_umbrellas,
                base_sunbeds: row.base_sunbeds,
                base_status: row.base_status,
                x: row.x,
                y: row.y,
                width: row.width,
                height: row.height,
                rotation: row.rotation,
                shape: row.shape,
                z_index: row.z_index
            };
        });
    }

    function getNextSortOrderForRow(rowName) {
        const currentMax = state.layoutRowsDraft
            .filter(function (spot) {
                return upperOrFallback(spot.row_name, "A") === upperOrFallback(rowName, "A");
            })
            .reduce(function (maxValue, spot) {
                return Math.max(maxValue, clamp(toInteger(spot.sort_order, 0), 0, 999));
            }, 0);

        return currentMax + 1;
    }

    function generateSpotCodeForRow(rowName, sortOrder) {
        const prefix = upperOrFallback(rowName, "A").replace(/[^A-Z0-9]/g, "") || "A";
        let candidateOrder = clamp(toInteger(sortOrder, 1), 1, 999);
        let candidate = prefix + String(candidateOrder).padStart(2, "0");

        while (state.layoutRowsDraft.some(function (spot) {
            return upperOrFallback(spot.spot_code, "") === candidate;
        })) {
            candidateOrder += 1;
            candidate = prefix + String(candidateOrder).padStart(2, "0");
        }

        return candidate;
    }

    function buildTempKey() {
        state.layoutTempIndex += 1;
        return "temp-layout-spot-" + state.layoutTempIndex;
    }

    function buildTempSpotCode() {
        return "N" + String(state.layoutTempIndex + 1).padStart(2, "0");
    }

    function normalizeBaseStatus(value) {
        const upper = upperOrFallback(value, "DISPONIBILE");
        return ["DISPONIBILE", "BLOCCATA", "MANUTENZIONE", "RISERVATA"].includes(upper)
            ? upper
            : "DISPONIBILE";
    }

    function calculateAngle(centerX, centerY, pointX, pointY) {
        return Math.atan2(pointY - centerY, pointX - centerX) * (180 / Math.PI);
    }

    function normalizeAngle(value) {
        let angle = toNumber(value, 0);

        while (angle > 180) {
            angle -= 360;
        }
        while (angle < -180) {
            angle += 360;
        }

        return roundDecimal(angle, 2);
    }

    function setLayoutActionsDisabled(disabled, label) {
        const isDisabled = Boolean(disabled);

        if (!isDisabled) {
            if (layoutSaveButton) {
                layoutSaveButton.textContent = "Salva layout";
            }
            refreshLayoutControls();
            return;
        }

        if (layoutSaveButton) {
            layoutSaveButton.disabled = true;
            layoutSaveButton.textContent = label || "Salvataggio...";
        }
        if (layoutNewSpotButton) {
            layoutNewSpotButton.disabled = true;
        }
        if (layoutDuplicateSpotButton) {
            layoutDuplicateSpotButton.disabled = true;
        }
        if (layoutDeleteSpotButton) {
            layoutDeleteSpotButton.disabled = true;
        }
        if (layoutAutoArrangeButton) {
            layoutAutoArrangeButton.disabled = true;
        }
        if (layoutResetDraftButton) {
            layoutResetDraftButton.disabled = true;
        }
    }

    function setText(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = String(value);
        }
    }

    function cleanString(value) {
        return String(value || "").trim();
    }

    function nullableString(value) {
        const clean = cleanString(value);
        return clean || null;
    }

    function upperOrFallback(value, fallback) {
        const clean = cleanString(value).toUpperCase();
        return clean || String(fallback || "").trim().toUpperCase();
    }

    function nullableNumber(value) {
        const clean = String(value == null ? "" : value).trim();
        return clean === "" ? null : Number(clean);
    }

    function toInteger(value, fallback) {
        const numberValue = Number.parseInt(value, 10);
        return Number.isFinite(numberValue) ? numberValue : Number(fallback || 0);
    }

    function toNumber(value, fallback) {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : Number(fallback || 0);
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function roundDecimal(value, digits) {
        const precision = Math.pow(10, digits || 0);
        return Math.round(value * precision) / precision;
    }

    function humanizeOverrideError(err) {
        const message = String(err && (err.message || err)).toLowerCase();

        if (message.includes("solo allo staff")) {
            return "Questa operazione e riservata allo staff autenticato.";
        }
        if (message.includes("postazione e data sono obbligatorie")) {
            return "Seleziona prima data e postazione.";
        }
        if (message.includes("stato override")) {
            return "Lo stato selezionato non e valido.";
        }
        if (message.includes("ombrelloni")) {
            return "Controlla il numero di ombrelloni indicato.";
        }
        if (message.includes("lettini")) {
            return "Controlla il numero di lettini indicato.";
        }

        return "Non riusciamo a salvare l'override in questo momento.";
    }

    function humanizeLayoutError(err) {
        const message = String(err && (err.message || err)).toLowerCase();

        if (message.includes("row-level security") || message.includes("permission denied")) {
            return "Il layout permanente richiede un account admin con permessi completi.";
        }
        if (message.includes("duplicate key") || message.includes("spot_code")) {
            return "Esiste gia una postazione con questo codice nel layout attivo. Correggi il codice e riprova.";
        }
        if (message.includes("violates check constraint")) {
            return "Controlla stato base, capienza e geometria della postazione selezionata.";
        }

        return "Non riusciamo a salvare o leggere il layout permanente in questo momento.";
    }

    function formatDateForInput(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function formatDateLabel(dateString) {
        const date = new Date(dateString + "T00:00:00");
        return date.toLocaleDateString("it-IT", {
            weekday: "long",
            day: "2-digit",
            month: "long"
        });
    }

    function formatShortDate(dateString) {
        const date = new Date(dateString + "T00:00:00");
        return date.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short"
        });
    }
});
