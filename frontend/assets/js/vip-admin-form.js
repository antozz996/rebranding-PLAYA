document.addEventListener("DOMContentLoaded", function () {
    const dashboard = window.FDAVipAdmin;
    const form = document.getElementById("vipAdminClientForm");
    const statusBox = document.getElementById("vipAdminFormStatus");
    const saveButton = document.getElementById("vipAdminSaveButton");
    const resetButton = document.getElementById("vipAdminFormResetButton");
    const fileInput = document.getElementById("vipAdminPhotoFile");

    if (!dashboard || !form) {
        return;
    }

    bindEvents();
    resetForm();

    function bindEvents() {
        form.addEventListener("submit", onSubmit);

        if (resetButton) {
            resetButton.addEventListener("click", resetForm);
        }

        if (fileInput) {
            fileInput.addEventListener("change", updateLocalPhotoPreview);
        }

        window.addEventListener("fda-vip-admin:editing-client-changed", function (event) {
            const client = event.detail ? event.detail.client : null;
            if (client) {
                populateForm(client);
                return;
            }
            resetForm();
        });

        window.addEventListener("fda-vip-admin:reset-form", function () {
            resetForm();
        });
    }

    async function onSubmit(event) {
        event.preventDefault();

        const supabaseClient = dashboard.getSupabaseClient();
        if (!supabaseClient || !(await dashboard.ensureStaffSession(statusBox))) {
            return;
        }

        const formData = buildPayload();
        if (!formData.full_name || !formData.phone) {
            window.FDAVip.showStatus(statusBox, "Nome e telefono sono obbligatori per il profilo cliente.", "error");
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = isEditMode() ? "Aggiorno profilo..." : "Creo profilo...";
        window.FDAVip.hideStatus(statusBox);

        try {
            const wasEditMode = isEditMode();
            let savedClient;

            if (wasEditMode) {
                const { data, error } = await supabaseClient
                    .from("clients")
                    .update(formData)
                    .eq("id", getCurrentClientId())
                    .select("*")
                    .single();

                if (error) {
                    throw error;
                }

                savedClient = data;
            } else {
                const { data, error } = await supabaseClient
                    .from("clients")
                    .insert(formData)
                    .select("*")
                    .single();

                if (error) {
                    throw error;
                }

                savedClient = data;
            }

            if (fileInput && fileInput.files && fileInput.files[0]) {
                savedClient = await uploadClientPhoto(savedClient);
            }

            populateForm(savedClient);
            dashboard.setEditingClient(savedClient);
            updateOutput(savedClient);

            window.FDAVip.showStatus(
                statusBox,
                wasEditMode
                    ? "Profilo cliente aggiornato correttamente."
                    : "Profilo cliente creato correttamente.",
                "success"
            );

            window.dispatchEvent(new CustomEvent("fda-vip-admin:data-changed"));
        } catch (err) {
            window.FDAVip.showStatus(
                statusBox,
                humanizeSaveError(err),
                "error"
            );
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = isEditMode() ? "Aggiorna profilo" : "Crea profilo";
        }
    }

    function buildPayload() {
        return {
            full_name: getValue("vipAdminFullName"),
            phone: getValue("vipAdminPhone"),
            email: nullableValue("vipAdminEmail"),
            birth_date: nullableValue("vipAdminBirthDate"),
            vip_level: getValue("vipAdminLevel") || "SILVER",
            status: getValue("vipAdminStatusSelect") || "DA_VERIFICARE",
            privacy_accepted: getChecked("vipAdminPrivacyAccepted"),
            marketing_accepted: getChecked("vipAdminMarketingAccepted"),
            notes: nullableValue("vipAdminNotes")
        };
    }

    async function uploadClientPhoto(client) {
        const supabaseClient = dashboard.getSupabaseClient();
        const file = fileInput.files[0];
        const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
        const safeName = slugify(client.full_name || "cliente");
        const photoPath = "clients/" + client.id + "/" + Date.now() + "-" + safeName + "." + extension;

        const { error: uploadError } = await supabaseClient.storage
            .from("client-photos")
            .upload(photoPath, file, {
                upsert: true
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data, error } = await supabaseClient
            .from("clients")
            .update({ photo_path: photoPath })
            .eq("id", client.id)
            .select("*")
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    function populateForm(client) {
        setValue("vipAdminClientId", client.id || "");
        setValue("vipAdminFullName", client.full_name || "");
        setValue("vipAdminPhone", client.phone || "");
        setValue("vipAdminEmail", client.email || "");
        setValue("vipAdminBirthDate", client.birth_date || "");
        setValue("vipAdminLevel", client.vip_level || "SILVER");
        setValue("vipAdminStatusSelect", client.status || "DA_VERIFICARE");
        setValue("vipAdminNotes", client.notes || "");
        setChecked("vipAdminPrivacyAccepted", Boolean(client.privacy_accepted));
        setChecked("vipAdminMarketingAccepted", Boolean(client.marketing_accepted));
        if (fileInput) {
            fileInput.value = "";
        }

        const titleNode = document.getElementById("vipAdminFormModeTitle");
        const pillNode = document.getElementById("vipAdminFormModePill");
        const summaryNode = document.getElementById("vipAdminSelectionSummary");

        if (titleNode) {
            titleNode.textContent = "Modifica profilo cliente";
        }
        if (pillNode) {
            pillNode.textContent = "Modifica";
            pillNode.classList.add("is-approved");
        }
        if (summaryNode) {
            summaryNode.textContent = "Stai modificando il profilo di " + (client.full_name || "Cliente") + ".";
        }

        updatePhotoPreviewFromPath(client.photo_path, client.full_name);
        updateOutput(client);

        if (saveButton) {
            saveButton.textContent = "Aggiorna profilo";
        }
    }

    function resetForm() {
        form.reset();
        setValue("vipAdminClientId", "");
        if (fileInput) {
            fileInput.value = "";
        }
        updateOutput(null);
        updatePhotoFallback("VIP");

        const titleNode = document.getElementById("vipAdminFormModeTitle");
        const pillNode = document.getElementById("vipAdminFormModePill");
        const summaryNode = document.getElementById("vipAdminSelectionSummary");

        if (titleNode) {
            titleNode.textContent = "Nuovo profilo cliente";
        }
        if (pillNode) {
            pillNode.textContent = "Creazione";
            pillNode.classList.remove("is-approved");
        }
        if (summaryNode) {
            summaryNode.textContent = "Nessun cliente selezionato. Il form e pronto per creare una nuova card.";
        }
        if (saveButton) {
            saveButton.textContent = "Crea profilo";
        }

        if (window.FDAVip) {
            window.FDAVip.hideStatus(statusBox);
        }
    }

    function updateOutput(client) {
        setText("vipAdminOutputCardCode", client && client.card_code ? client.card_code : "-");
        setText("vipAdminOutputReferralCode", client && client.referral_code ? client.referral_code : "-");
    }

    function updateLocalPhotoPreview() {
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;
        const name = getValue("vipAdminFullName") || "VIP";

        if (!file) {
            updatePhotoFallback(window.FDAVip.getInitials(name));
            return;
        }

        const reader = new FileReader();
        reader.onload = function (loadEvent) {
            const previewNode = document.getElementById("vipAdminPhotoPreview");
            const fallbackNode = document.getElementById("vipAdminPhotoFallback");
            if (previewNode) {
                previewNode.src = String(loadEvent.target.result || "");
                previewNode.hidden = false;
            }
            if (fallbackNode) {
                fallbackNode.hidden = true;
            }
        };
        reader.readAsDataURL(file);
    }

    async function updatePhotoPreviewFromPath(photoPath, fullName) {
        const cleanPath = String(photoPath || "").trim();
        if (!cleanPath) {
            updatePhotoFallback(window.FDAVip.getInitials(fullName || "VIP"));
            return;
        }

        const previewNode = document.getElementById("vipAdminPhotoPreview");
        const fallbackNode = document.getElementById("vipAdminPhotoFallback");

        if (/^https?:\/\//i.test(cleanPath)) {
            if (previewNode) {
                previewNode.src = cleanPath;
                previewNode.hidden = false;
            }
            if (fallbackNode) {
                fallbackNode.hidden = true;
            }
            return;
        }

        try {
            const supabaseClient = dashboard.getSupabaseClient();
            const normalizedPath = cleanPath.replace(/^\/+/, "").replace(/^client-photos\//, "");
            const { data, error } = await supabaseClient.storage
                .from("client-photos")
                .createSignedUrl(normalizedPath, 60 * 20);

            if (error || !data || !data.signedUrl) {
                throw error || new Error("Signed URL non disponibile.");
            }

            if (previewNode) {
                previewNode.src = data.signedUrl;
                previewNode.hidden = false;
            }
            if (fallbackNode) {
                fallbackNode.hidden = true;
            }
        } catch (err) {
            updatePhotoFallback(window.FDAVip.getInitials(fullName || "VIP"));
        }
    }

    function updatePhotoFallback(label) {
        const previewNode = document.getElementById("vipAdminPhotoPreview");
        const fallbackNode = document.getElementById("vipAdminPhotoFallback");

        if (previewNode) {
            previewNode.removeAttribute("src");
            previewNode.hidden = true;
        }
        if (fallbackNode) {
            fallbackNode.textContent = label;
            fallbackNode.hidden = false;
        }
    }

    function isEditMode() {
        return Boolean(getCurrentClientId());
    }

    function getCurrentClientId() {
        return getValue("vipAdminClientId");
    }

    function humanizeSaveError(err) {
        const message = String(err && (err.message || err)).toLowerCase();

        if (message.includes("phone number is required")) {
            return "Inserisci un numero di telefono valido per il cliente.";
        }
        if (message.includes("birth date is required")) {
            return "Per profili approvati o VIP la data di nascita e obbligatoria.";
        }
        if (message.includes("must be an adult")) {
            return "Il cliente VIP deve essere maggiorenne.";
        }
        if (message.includes("duplicate key")) {
            return "Esiste gia un profilo con questi dati univoci.";
        }

        return "Non riusciamo a salvare il profilo cliente in questo momento.";
    }

    function slugify(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 48) || "cliente";
    }

    function getValue(id) {
        const node = document.getElementById(id);
        return node ? String(node.value || "").trim() : "";
    }

    function nullableValue(id) {
        const value = getValue(id);
        return value || null;
    }

    function getChecked(id) {
        const node = document.getElementById(id);
        return Boolean(node && node.checked);
    }

    function setValue(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.value = value == null ? "" : value;
        }
    }

    function setChecked(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.checked = Boolean(value);
        }
    }

    function setText(id, value) {
        const node = document.getElementById(id);
        if (node) {
            node.textContent = value;
        }
    }
});
