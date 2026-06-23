// This script is injected into the iframe pages to enable visual editing.
document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject Styles for Editor UI elements
    const style = document.createElement("style");
    style.id = "editor-helper-styles";
    style.innerHTML = `
        [contenteditable="true"] {
            outline: 1px dashed rgba(201, 168, 76, 0.5);
            transition: outline 0.2s, background 0.2s;
        }
        [contenteditable="true"]:hover {
            outline: 2px solid #C9A84C !important;
            background: rgba(201, 168, 76, 0.05) !important;
            cursor: text;
        }
        [contenteditable="true"]:focus {
            outline: 2px solid #C9A84C !important;
            background: rgba(201, 168, 76, 0.1) !important;
        }
        .editor-section-wrapper {
            position: relative !important;
        }
        .editor-section-active {
            outline: 2px dashed #C9A84C !important;
            outline-offset: -2px;
        }
        .editor-controls-menu {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #1A1208;
            border: 1px solid #C9A84C;
            border-radius: 4px;
            display: flex;
            gap: 4px;
            padding: 4px;
            z-index: 100000;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            pointer-events: auto;
        }
        .editor-btn {
            background: transparent;
            border: none;
            color: #F9F7F2;
            cursor: pointer;
            font-size: 11px;
            font-family: sans-serif;
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 3px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .editor-btn:hover {
            background: #C9A84C;
            color: #1A1208;
        }
        .editor-btn-delete:hover {
            background: #d9534f;
            color: white;
        }
        img:hover, video:hover {
            outline: 3px solid #C9A84C !important;
            cursor: pointer;
        }
        .editor-text-toolbar {
            position: absolute;
            z-index: 100001;
            background: #1A1208;
            border: 1px solid #C9A84C;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            pointer-events: auto;
        }
        .editor-btn-drag {
            cursor: grab !important;
        }
        .editor-btn-drag:active {
            cursor: grabbing !important;
        }
        .editor-section-dragging {
            opacity: 0.45 !important;
            border: 2px dashed #C9A84C !important;
        }
        .editor-drag-over-top {
            border-top: 4px solid #C9A84C !important;
        }
        .editor-drag-over-bottom {
            border-bottom: 4px solid #C9A84C !important;
        }
        .editor-element-hover-outline {
            outline: 2px solid #C9A84C !important;
            outline-offset: 1px;
        }
        .editor-element-controls {
            position: absolute;
            background: #1A1208;
            border: 1px solid #C9A84C;
            border-radius: 4px;
            display: flex;
            gap: 2px;
            padding: 2px;
            z-index: 100000;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            pointer-events: auto;
        }
        .editor-element-btn {
            background: transparent;
            border: none;
            color: #F9F7F2;
            cursor: pointer;
            font-size: 10px;
            font-family: sans-serif;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 2px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .editor-element-btn:hover {
            background: #C9A84C;
            color: #1A1208;
        }
        .editor-element-btn-drag {
            cursor: grab !important;
        }
        .editor-element-btn-drag:active {
            cursor: grabbing !important;
        }
        .editor-element-btn-delete:hover {
            background: #d9534f;
            color: white;
        }
        .editor-element-drop-indicator {
            height: 4px;
            background: #C9A84C;
            margin: 8px 0;
            border-radius: 2px;
            pointer-events: none;
            box-shadow: 0 0 8px rgba(201, 168, 76, 0.7);
            position: relative;
            z-index: 99999;
        }
    `;
    document.head.appendChild(style);

    // 2. Identify and setup editable text elements
    // We target common text tags: h1, h2, h3, h4, h5, h6, p, a, span, button, li, option
    const textSelectors = "h1, h2, h3, h4, h5, h6, p, span, a, button, li, option";
    
    let activeTextElement = null;
    let textToolbar = null;

    function makeTextsEditable() {
        const targetTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'DIV', 'LI', 'SPAN', 'A', 'BUTTON', 'TD', 'TH', 'FIGCAPTION'];
        const blockTags = ['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'UL', 'OL', 'LI', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'THEAD', 'TBODY', 'TR', 'FORM', 'IMG', 'VIDEO', 'IFRAME', 'NOSCRIPT', 'SCRIPT', 'STYLE', 'BLOCKQUOTE', 'PRE', 'HR'];
        
        const candidates = [];
        
        document.querySelectorAll(targetTags.join(',')).forEach(el => {
            // Skip elements that are part of the editor UI itself
            if (el.closest('.editor-controls-menu') || el.closest('.editor-text-toolbar')) return;
            
            // Must contain text
            const text = el.textContent.trim();
            if (!text) return;
            
            // Check if it has block children
            // For semantic text blocks (H1-H6, P), we don't treat DIV as a blocking child since DIVs are often used inside headings/paragraphs for line breaks.
            const isSemanticTextBlock = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'].includes(el.tagName);
            const activeBlockTags = isSemanticTextBlock ? blockTags.filter(t => t !== 'DIV') : blockTags;
            
            const hasBlockChildren = Array.from(el.children).some(child => activeBlockTags.includes(child.tagName));
            if (hasBlockChildren) return;
            
            // Specific rules for DIVs to avoid selecting layout containers
            if (el.tagName === 'DIV') {
                const hasInteractiveChildren = Array.from(el.children).some(child => ['A', 'BUTTON', 'IMG', 'VIDEO'].includes(child.tagName));
                if (hasInteractiveChildren) return;
                
                // If it has no direct text nodes and has children, skip it (let the children be candidates)
                let hasDirectText = false;
                for (let i = 0; i < el.childNodes.length; i++) {
                    const node = el.childNodes[i];
                    if (node.nodeType === 3 && node.nodeValue.trim().length > 0) { // TEXT_NODE is 3
                        hasDirectText = true;
                        break;
                    }
                }
                if (!hasDirectText && el.children.length > 0) return;
            }
            
            candidates.push(el);
        });
        
        // Only set contenteditable on candidate elements that don't have a candidate ancestor
        candidates.forEach(el => {
            let parent = el.parentElement;
            let hasCandidateAncestor = false;
            while (parent && parent !== document.body) {
                if (candidates.includes(parent)) {
                    hasCandidateAncestor = true;
                    break;
                }
                parent = parent.parentElement;
            }
            
            if (!hasCandidateAncestor) {
                el.setAttribute("contenteditable", "true");
                
                // Prevent link clicks during editing
                if (el.tagName === 'A') {
                    el.addEventListener('click', (e) => {
                        e.preventDefault();
                    });
                }
            }
        });
    }
    
    makeTextsEditable();

    // Prevent all navigation clicks and form submissions inside the iframe
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (link) {
            e.preventDefault();
        }
    }, true);

    document.addEventListener("submit", (e) => {
        e.preventDefault();
    }, true);

    // Floating text formatting toolbar
    function showTextToolbar(el) {
        if (textToolbar) {
            textToolbar.remove();
        }
        
        activeTextElement = el;
        
        textToolbar = document.createElement("div");
        textToolbar.className = "editor-text-toolbar";
        textToolbar.setAttribute("contenteditable", "false");
        
        const btnDecrease = document.createElement("button");
        btnDecrease.className = "editor-btn";
        btnDecrease.innerHTML = "A－";
        btnDecrease.title = "Rimpicciolisci Testo";
        btnDecrease.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            adjustFontSize(-2);
        };
        
        const sizeLabel = document.createElement("span");
        sizeLabel.id = "editor-size-label";
        sizeLabel.style.color = "#F9F7F2";
        sizeLabel.style.fontSize = "10px";
        sizeLabel.style.fontFamily = "sans-serif";
        sizeLabel.style.fontWeight = "bold";
        sizeLabel.style.padding = "0 6px";
        sizeLabel.style.minWidth = "36px";
        sizeLabel.style.textAlign = "center";
        
        const btnIncrease = document.createElement("button");
        btnIncrease.className = "editor-btn";
        btnIncrease.innerHTML = "A＋";
        btnIncrease.title = "Ingrandisci Testo";
        btnIncrease.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            adjustFontSize(2);
        };

        const btnReset = document.createElement("button");
        btnReset.className = "editor-btn";
        btnReset.innerHTML = "Reset";
        btnReset.title = "Ripristina dimensione originale";
        btnReset.style.fontSize = "9px";
        btnReset.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            el.style.fontSize = "";
            updateSizeLabel();
            positionToolbar(el);
        };
        
        textToolbar.appendChild(btnDecrease);
        textToolbar.appendChild(sizeLabel);
        textToolbar.appendChild(btnIncrease);
        textToolbar.appendChild(btnReset);
        
        document.body.appendChild(textToolbar);
        
        updateSizeLabel();
        positionToolbar(el);
    }
    
    function hideTextToolbar() {
        if (textToolbar) {
            textToolbar.remove();
            textToolbar = null;
        }
        activeTextElement = null;
    }
    
    function positionToolbar(el) {
        if (!textToolbar || !el) return;
        const rect = el.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Position toolbar above the text element
        const toolbarHeight = textToolbar.offsetHeight || 32;
        let top = rect.top + scrollTop - toolbarHeight - 8;
        if (top < scrollTop) {
            // position below if off-screen
            top = rect.bottom + scrollTop + 8;
        }
        
        const left = rect.left + scrollLeft + (rect.width - textToolbar.offsetWidth) / 2;
        
        textToolbar.style.top = top + "px";
        textToolbar.style.left = Math.max(8, left) + "px";
    }

    function updateSizeLabel() {
        if (!activeTextElement || !textToolbar) return;
        const label = textToolbar.querySelector("#editor-size-label");
        if (label) {
            const currentSize = window.getComputedStyle(activeTextElement).fontSize;
            label.textContent = currentSize;
        }
    }

    function adjustFontSize(delta) {
        if (!activeTextElement) return;
        const currentSizeStr = window.getComputedStyle(activeTextElement).fontSize;
        const currentSize = parseFloat(currentSizeStr);
        let newSize = Math.max(6, Math.round(currentSize + delta));
        activeTextElement.style.fontSize = newSize + "px";
        updateSizeLabel();
        positionToolbar(activeTextElement);
    }

    // Scroll and resize listeners to maintain toolbar positioning
    window.addEventListener("scroll", () => {
        if (activeTextElement && textToolbar) {
            positionToolbar(activeTextElement);
        }
        if (activeElement && elementControls) {
            positionElementControls(activeElement);
        }
    }, { passive: true });

    window.addEventListener("resize", () => {
        if (activeTextElement && textToolbar) {
            positionToolbar(activeTextElement);
        }
        if (activeElement && elementControls) {
            positionElementControls(activeElement);
        }
    });

    // Keyboard shortcuts for text resizing (Ctrl + Plus, Ctrl + Minus, Ctrl + 0)
    document.addEventListener("keydown", (e) => {
        if (!activeTextElement) return;
        
        if (e.ctrlKey) {
            // Ctrl + Plus (key '+' or '=' depending on keyboard layout, code 'Equal' or 'NumpadAdd')
            if (e.key === '+' || e.key === '=' || e.code === 'Equal' || e.code === 'NumpadAdd') {
                e.preventDefault();
                adjustFontSize(2);
            }
            // Ctrl + Minus (key '-' or '_', code 'Minus' or 'NumpadSubtract')
            else if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
                e.preventDefault();
                adjustFontSize(-2);
            }
            // Ctrl + 0 (Reset)
            else if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
                e.preventDefault();
                activeTextElement.style.fontSize = "";
                updateSizeLabel();
                positionToolbar(activeTextElement);
            }
        }
    });

    // Detect click on editable text to show toolbar
    document.addEventListener("click", (e) => {
        const el = e.target;
        if (el.getAttribute && el.getAttribute("contenteditable") === "true") {
            if (el.closest('.editor-controls-menu') || el.closest('.editor-text-toolbar')) {
                return;
            }
            showTextToolbar(el);
        } else {
            // If we click outside the editable text and not on the toolbar itself, hide it
            if (textToolbar && !e.target.closest('.editor-text-toolbar')) {
                hideTextToolbar();
            }
        }
    });

    // 3. Setup media clicks (images & videos)
    document.addEventListener("click", (e) => {
        let target = e.target;
        
        // Image swap trigger
        if (target.tagName === "IMG") {
            e.preventDefault();
            e.stopPropagation();
            
            // Assign temporary ID if it doesn't have one to track the replace
            if (!target.id) {
                target.id = "img-" + Math.random().toString(36).substr(2, 9);
            }
            
            // Notify parent window (the editor dashboard)
            window.parent.postMessage({
                type: "edit_image",
                elementId: target.id,
                currentSrc: target.getAttribute("src")
            }, "*");
        }
        
        // Video swap trigger
        if (target.tagName === "VIDEO" || target.closest("video")) {
            e.preventDefault();
            e.stopPropagation();
            
            const videoEl = target.tagName === "VIDEO" ? target : target.closest("video");
            if (!videoEl.id) {
                videoEl.id = "video-" + Math.random().toString(36).substr(2, 9);
            }
            
            let currentSrc = videoEl.getAttribute("src");
            if (!currentSrc) {
                const sourceEl = videoEl.querySelector("source");
                if (sourceEl) currentSrc = sourceEl.getAttribute("src");
            }
            
            window.parent.postMessage({
                type: "edit_video",
                elementId: videoEl.id,
                currentSrc: currentSrc || ""
            }, "*");
        }
    });

    // 4. Setup Section controls (reordering, duplicating, deleting)
    // We treat top-level direct children of <body> or <main> (if exists) as sections
    const mainContainer = document.querySelector("main") || document.body;
    
    let activeSection = null;
    let controlsMenu = null;

    // Element editing and hover controls
    let activeElement = null;
    let elementControls = null;
    let draggedElement = null;
    let draggedType = null; // 'section' or 'element'

    function isEditableElement(el) {
        if (!el || el.nodeType !== 1) return false;
        // Skip editor UI elements
        if (el.classList && (
            el.classList.contains("editor-controls-menu") || 
            el.classList.contains("editor-text-toolbar") || 
            el.classList.contains("editor-element-controls") ||
            el.classList.contains("editor-drag-indicator") ||
            el.classList.contains("editor-element-drop-indicator") ||
            el.closest(".editor-controls-menu") || 
            el.closest(".editor-text-toolbar") || 
            el.closest(".editor-element-controls") ||
            el.id === "editor-section-modal"
        )) return false;

        // Is editable text
        if (el.getAttribute && el.getAttribute("contenteditable") === "true") return true;

        // Is visual or clickable element inside section
        if (["IMG", "VIDEO", "A", "BUTTON"].includes(el.tagName)) {
            let parent = el.parentElement;
            while (parent && parent !== document.body) {
                if (isEditableSection(parent)) return true;
                parent = parent.parentElement;
            }
        }
        return false;
    }

    function createElementControls(el) {
        if (elementControls) {
            elementControls.remove();
        }

        elementControls = document.createElement("div");
        elementControls.className = "editor-element-controls";
        elementControls.setAttribute("contenteditable", "false");

        const btnDrag = document.createElement("button");
        btnDrag.className = "editor-element-btn editor-element-btn-drag";
        btnDrag.innerHTML = "⋮⋮";
        btnDrag.title = "Trascina Elemento";
        btnDrag.setAttribute("draggable", "true");

        btnDrag.addEventListener("dragstart", (e) => {
            draggedElement = el;
            draggedType = 'element';
            el.classList.add("editor-element-hover-outline");
            e.dataTransfer.effectAllowed = "move";
            
            // Set simple transparent canvas or small drag image if desired, or let browser do standard ghosting
            e.stopPropagation();

            // Hide toolbars
            hideTextToolbar();
            if (controlsMenu) {
                controlsMenu.remove();
                controlsMenu = null;
            }
        });

        btnDrag.addEventListener("dragend", (e) => {
            el.classList.remove("editor-element-hover-outline");
            if (elementControls) {
                elementControls.remove();
                elementControls = null;
            }
            activeElement = null;
            draggedElement = null;
            draggedType = null;
        });

        const btnDel = document.createElement("button");
        btnDel.className = "editor-element-btn editor-element-btn-delete";
        btnDel.innerHTML = "×";
        btnDel.title = "Elimina Elemento";
        btnDel.onclick = (e) => {
            e.stopPropagation();
            if (confirm("Sei sicuro di voler eliminare questo elemento?")) {
                el.remove();
                if (elementControls) {
                    elementControls.remove();
                    elementControls = null;
                }
                activeElement = null;
                hideTextToolbar();
            }
        };

        elementControls.appendChild(btnDrag);
        elementControls.appendChild(btnDel);

        document.body.appendChild(elementControls);
        positionElementControls(el);
    }

    function positionElementControls(el) {
        if (!elementControls || !el) return;
        const rect = el.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        // Position tab at the top-left of the element
        const top = rect.top + scrollTop - 20;
        const left = rect.left + scrollLeft;

        elementControls.style.top = Math.max(scrollTop, top) + "px";
        elementControls.style.left = Math.max(0, left) + "px";
    }

    function createControlsMenu(section) {
        if (controlsMenu) {
            controlsMenu.remove();
        }
        
        controlsMenu = document.createElement("div");
        controlsMenu.className = "editor-controls-menu";
        controlsMenu.setAttribute("contenteditable", "false");
        
        const btnDrag = document.createElement("button");
        btnDrag.className = "editor-btn editor-btn-drag";
        btnDrag.innerHTML = "☰";
        btnDrag.title = "Trascina per Riordinare";
        btnDrag.setAttribute("draggable", "true");
        
        const btnUp = document.createElement("button");
        btnUp.className = "editor-btn";
        btnUp.innerHTML = "▲";
        btnUp.title = "Sposta Su";
        btnUp.onclick = (e) => {
            e.stopPropagation();
            moveSectionUp(section);
        };
        
        const btnDown = document.createElement("button");
        btnDown.className = "editor-btn";
        btnDown.innerHTML = "▼";
        btnDown.title = "Sposta Giù";
        btnDown.onclick = (e) => {
            e.stopPropagation();
            moveSectionDown(section);
        };
        
        const btnDup = document.createElement("button");
        btnDup.className = "editor-btn";
        btnDup.innerHTML = "＋ Duplica";
        btnDup.title = "Duplica Sezione";
        btnDup.onclick = (e) => {
            e.stopPropagation();
            duplicateSection(section);
        };
        
        const btnDel = document.createElement("button");
        btnDel.className = "editor-btn editor-btn-delete";
        btnDel.innerHTML = "🗑️ Elimina";
        btnDel.title = "Elimina Sezione";
        btnDel.onclick = (e) => {
            e.stopPropagation();
            deleteSection(section);
        };
        
        const btnAdd = document.createElement("button");
        btnAdd.className = "editor-btn";
        btnAdd.innerHTML = "➕ Sezione";
        btnAdd.title = "Aggiungi Sezione Sotto";
        btnAdd.onclick = (e) => {
            e.stopPropagation();
            openSectionTemplateModal(section);
        };
        
        controlsMenu.appendChild(btnDrag);
        controlsMenu.appendChild(btnUp);
        controlsMenu.appendChild(btnDown);
        controlsMenu.appendChild(btnDup);
        controlsMenu.appendChild(btnDel);
        controlsMenu.appendChild(btnAdd);
        
        section.appendChild(controlsMenu);
    }

    function isEditableSection(el) {
        if (!el || el.nodeType !== 1) return false;
        // We only want logical page sections
        const invalidTags = ["SCRIPT", "STYLE", "NOSCRIPT", "NAV", "BASE", "FOOTER", "MAIN"];
        if (invalidTags.includes(el.tagName)) return false;
        if (el.className && typeof el.className === "string") {
            if (el.className.includes("decor-line")) return false;
            if (el.className.includes("wa-widget-container")) return false;
            if (el.className.includes("mobile-overlay")) return false;
            if (el.className.includes("editor-")) return false;
        }
        if (el.id === "scrollTop" || el.id === "editor-section-modal") return false;
        
        const parent = el.parentElement;
        if (!parent) return false;
        return parent.tagName === "BODY" || parent.tagName === "MAIN";
    }

    // Hover effect on sections and elements
    document.body.addEventListener("mouseover", (e) => {
        // 1. Element Hover
        let targetEl = e.target;
        let foundElement = null;
        
        while (targetEl && targetEl !== document.body) {
            if (isEditableElement(targetEl)) {
                foundElement = targetEl;
                break;
            }
            targetEl = targetEl.parentElement;
        }
        
        if (foundElement) {
            if (activeElement !== foundElement) {
                if (activeElement) {
                    activeElement.classList.remove("editor-element-hover-outline");
                }
                activeElement = foundElement;
                activeElement.classList.add("editor-element-hover-outline");
                createElementControls(activeElement);
            }
        } else {
            // Check if hovering over the element controls themselves
            if (elementControls && !e.target.closest('.editor-element-controls')) {
                if (activeElement) {
                    activeElement.classList.remove("editor-element-hover-outline");
                }
                elementControls.remove();
                elementControls = null;
                activeElement = null;
            }
        }

        // 2. Section Hover
        let el = e.target;
        let foundSection = null;
        while (el && el !== document.body) {
            if (isEditableSection(el)) {
                foundSection = el;
                break;
            }
            el = el.parentElement;
        }

        if (foundSection) {
            if (activeSection !== foundSection) {
                if (activeSection) {
                    activeSection.classList.remove("editor-section-active");
                }
                activeSection = foundSection;
                activeSection.classList.add("editor-section-active");
                activeSection.classList.add("editor-section-wrapper");
                createControlsMenu(activeSection);
            }
        } else {
            // If hovering outside and not on controls menus or elements controls
            if (controlsMenu && !e.target.closest('.editor-controls-menu') && !e.target.closest('.editor-element-controls') && (!activeSection || !activeSection.contains(e.target))) {
                if (activeSection) {
                    activeSection.classList.remove("editor-section-active");
                    activeSection = null;
                }
                controlsMenu.remove();
                controlsMenu = null;
            }
        }
    });

    // Remove outlines when mouse leaves the page frame
    document.addEventListener("mouseleave", () => {
        if (activeSection) {
            activeSection.classList.remove("editor-section-active");
            activeSection = null;
        }
        if (controlsMenu) {
            controlsMenu.remove();
            controlsMenu = null;
        }
        if (activeElement) {
            activeElement.classList.remove("editor-element-hover-outline");
            activeElement = null;
        }
        if (elementControls) {
            elementControls.remove();
            elementControls = null;
        }
    });

    // Reordering functions
    function moveSectionUp(section) {
        let prev = section.previousElementSibling;
        // Skip script, style or navigation tags
        while (prev && !isEditableSection(prev)) {
            prev = prev.previousElementSibling;
        }
        if (prev) {
            mainContainer.insertBefore(section, prev);
            createControlsMenu(section); // Recenter controls
        }
    }

    function moveSectionDown(section) {
        let next = section.nextElementSibling;
        // Skip script, style or footer tags (if we don't want to move below footer)
        while (next && !isEditableSection(next)) {
            next = next.nextElementSibling;
        }
        if (next) {
            mainContainer.insertBefore(next, section);
            createControlsMenu(section); // Recenter controls
        }
    }

    function duplicateSection(section) {
        // Clean controlsMenu from clone
        const menu = section.querySelector(".editor-controls-menu");
        if (menu) menu.remove();
        
        const clone = section.cloneNode(true);
        clone.classList.remove("editor-section-active");
        
        // Insert clone after the section
        section.parentNode.insertBefore(clone, section.nextSibling);
        
        // Re-apply contenteditable on the clone text elements
        makeTextsEditable();
    }

    function deleteSection(section) {
        if (confirm("Sei sicuro di voler eliminare questa sezione? Questa azione non può essere annullata direttamente.")) {
            section.remove();
            if (controlsMenu) {
                controlsMenu.remove();
                controlsMenu = null;
            }
        }
    }

    // Modal to add new sections from pre-styled templates
    function openSectionTemplateModal(targetSection) {
        const existing = document.getElementById("editor-section-modal");
        if (existing) existing.remove();
        
        const isEn = window.location.pathname.includes('/en/');
        const modalTitleText = isEn ? "Add New Section Below" : "Aggiungi Nuova Sezione Sotto";
        const modalSubtitleText = isEn ? "Select a pre-styled section template to insert into the page." : "Seleziona un modello di sezione pre-stilizzato da inserire nella pagina.";
        const cancelBtnText = isEn ? "Cancel" : "Annulla";
        
        const modal = document.createElement("div");
        modal.id = "editor-section-modal";
        modal.setAttribute("contenteditable", "false");
        
        modal.style.position = "fixed";
        modal.style.inset = "0";
        modal.style.zIndex = "100002";
        modal.style.background = "rgba(15, 10, 4, 0.85)";
        modal.style.backdropFilter = "blur(4px)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.padding = "20px";
        
        const card = document.createElement("div");
        card.style.background = "#1A1208";
        card.style.border = "1px solid #C9A84C";
        card.style.borderRadius = "12px";
        card.style.padding = "30px";
        card.style.maxWidth = "600px";
        card.style.width = "100%";
        card.style.boxShadow = "0 20px 50px rgba(0,0,0,0.5)";
        card.style.fontFamily = "sans-serif";
        card.style.color = "#F9F7F2";
        
        const title = document.createElement("h3");
        title.style.margin = "0 0 10px 0";
        title.style.fontSize = "18px";
        title.style.fontFamily = "'Playfair Display', serif";
        title.style.color = "#C9A84C";
        title.textContent = modalTitleText;
        
        const subtitle = document.createElement("p");
        subtitle.style.margin = "0 0 20px 0";
        subtitle.style.fontSize = "12px";
        subtitle.style.color = "#E0D4BB";
        subtitle.textContent = modalSubtitleText;
        
        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "1fr 1fr";
        grid.style.gap = "15px";
        grid.style.marginBottom = "25px";
        
        const templates = isEn ? [
            {
                name: "Centered Text (Intro)",
                desc: "Centered paragraph ideal for quotes or introductions.",
                html: `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 800px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">Golden Subtitle</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 2rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">New Section Title</h2><p style="color: var(--text-light, #524d47); font-size: 1rem; line-height: 1.8; font-family: 'Montserrat', sans-serif;">Write here the descriptive paragraph of your section. This text is completely editable.</p></div></section>`
            },
            {
                name: "Text and Image",
                desc: "Two-column layout with a side image.",
                html: `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--white);"><div style="display: flex; gap: 4rem; align-items: center; max-width: 1200px; margin: 0 auto; flex-wrap: wrap;"><div style="flex: 1; min-width: 300px;"><span style="text-transform: uppercase; letter-spacing: 4px; color: var(--gold); font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 1.2rem;">The Experience</span><h2 style="font-size: clamp(2rem, 4vw, 3rem); color: var(--text-dark); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">Side Title</h2><p style="color: var(--text-light, #524d47); font-size: 0.95rem; line-height: 1.8; font-family: 'Montserrat', sans-serif; margin-bottom: 2rem;">Add here a detailed description side-by-side with a large emotional image.</p><a href="#" style="display: inline-block; padding: 1rem 2.5rem; font-size: 0.75rem; border: 1.5px solid var(--text-dark); color: var(--text-dark); text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 600;">Discover more</a></div><div style="flex: 1; min-width: 300px; height: 50vh; position: relative; overflow: hidden; border-radius: 4px;"><img src="assets/images/hero-lido.webp" alt="Image" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></div></div></section>`
            },
            {
                name: "Three Columns Services",
                desc: "Three cards ideal for presenting services or features.",
                html: `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 1200px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">Our Services</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Excellence in Details</h2><div style="display: flex; gap: 2.5rem; justify-content: center; flex-wrap: wrap;"><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Service 1</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Short description of the first service offered.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid var(--gold);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Service 2</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Short description of the second service offered.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Service 3</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Short description of the third service offered.</p></div></div></div></section>`
            },
            {
                name: "Call to Action (Dark)",
                desc: "Full screen call to action with a golden button.",
                html: `<section class="reveal visible" style="padding: 6rem 8vw; background: #1A1208; text-align: center; color: var(--white);"><div style="max-width: 800px; margin: 0 auto;"><h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); color: var(--white); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Ready to live the experience?</h2><p style="color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.7; font-family: 'Montserrat', sans-serif; margin-bottom: 2.5rem;">Contact us today to reserve your table.</p><a href="contatti.html" style="display: inline-block; padding: 1.2rem 3rem; font-size: 0.75rem; background: var(--gold); border: 1.5px solid var(--gold); color: #1A1208; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 700;">Request information</a></div></section>`
            }
        ] : [
            {
                name: "Testo Centrato (Intro)",
                desc: "Paragrafo centrato ideale per citazioni o introduzioni.",
                html: `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 800px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">Sottotitolo Dorato</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 2rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">Titolo della Nuova Sezione</h2><p style="color: var(--text-light, #524d47); font-size: 1rem; line-height: 1.8; font-family: 'Montserrat', sans-serif;">Scrivi qui il paragrafo descrittivo della tua sezione. Questo testo è completamente modificabile.</p></div></section>`
            },
            {
                name: "Testo e Immagine",
                desc: "Layout a due colonne affiancato ad un'immagine laterale.",
                html: `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--white);"><div style="display: flex; gap: 4rem; align-items: center; max-width: 1200px; margin: 0 auto; flex-wrap: wrap;"><div style="flex: 1; min-width: 300px;"><span style="text-transform: uppercase; letter-spacing: 4px; color: var(--gold); font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 1.2rem;">L'Esperienza</span><h2 style="font-size: clamp(2rem, 4vw, 3rem); color: var(--text-dark); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">Titolo a Lato</h2><p style="color: var(--text-light, #524d47); font-size: 0.95rem; line-height: 1.8; font-family: 'Montserrat', sans-serif; margin-bottom: 2rem;">Aggiungi qui una descrizione dettagliata affiancata ad una grande immagine emozionale.</p><a href="#" style="display: inline-block; padding: 1rem 2.5rem; font-size: 0.75rem; border: 1.5px solid var(--text-dark); color: var(--text-dark); text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 600;">Scopri di più</a></div><div style="flex: 1; min-width: 300px; height: 50vh; position: relative; overflow: hidden; border-radius: 4px;"><img src="assets/images/hero-lido.webp" alt="Immagine" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></div></div></section>`
            },
            {
                name: "Tre Colonne Servizi",
                desc: "Tre schede ideali per presentare servizi o caratteristiche.",
                html: `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 1200px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">I Nostri Servizi</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Eccellenza nei Dettagli</h2><div style="display: flex; gap: 2.5rem; justify-content: center; flex-wrap: wrap;"><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Servizio 1</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Descrizione sintetica del primo servizio offerto.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid var(--gold);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Servizio 2</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Descrizione sintetica del secondo servizio offerto.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Servizio 3</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Descrizione sintetica del terzo servizio offerto.</p></div></div></div></section>`
            },
            {
                name: "Call to Action (Scuro)",
                desc: "Messaggio a tutto schermo con un grande bottone dorato.",
                html: `<section class="reveal visible" style="padding: 6rem 8vw; background: #1A1208; text-align: center; color: var(--white);"><div style="max-width: 800px; margin: 0 auto;"><h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); color: var(--white); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Pronto a vivere l'esperienza?</h2><p style="color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.7; font-family: 'Montserrat', sans-serif; margin-bottom: 2.5rem;">Contattaci oggi stesso per riservare il tuo tavolo.</p><a href="contatti.html" style="display: inline-block; padding: 1.2rem 3rem; font-size: 0.75rem; background: var(--gold); border: 1.5px solid var(--gold); color: #1A1208; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 700;">Richiedi informazioni</a></div></section>`
            }
        ];
        
        templates.forEach(t => {
            const btn = document.createElement("button");
            btn.style.background = "rgba(255, 255, 255, 0.03)";
            btn.style.border = "1px solid rgba(201, 168, 76, 0.2)";
            btn.style.borderRadius = "8px";
            btn.style.padding = "15px";
            btn.style.textAlign = "left";
            btn.style.cursor = "pointer";
            btn.style.transition = "all 0.2s";
            btn.style.color = "#F9F7F2";
            
            btn.onmouseover = () => {
                btn.style.background = "rgba(201, 168, 76, 0.08)";
                btn.style.borderColor = "#C9A84C";
            };
            btn.onmouseout = () => {
                btn.style.background = "rgba(255, 255, 255, 0.03)";
                btn.style.borderColor = "rgba(201, 168, 76, 0.2)";
            };
            
            const btnTitle = document.createElement("div");
            btnTitle.style.fontWeight = "bold";
            btnTitle.style.fontSize = "13px";
            btnTitle.style.color = "#C9A84C";
            btnTitle.style.marginBottom = "5px";
            btnTitle.textContent = t.name;
            
            const btnDesc = document.createElement("div");
            btnDesc.style.fontSize = "10px";
            btnDesc.style.color = "#E0D4BB";
            btnDesc.textContent = t.desc;
            
            btn.appendChild(btnTitle);
            btn.appendChild(btnDesc);
            
            btn.onclick = () => {
                insertNewSection(targetSection, t.html);
                modal.remove();
            };
            
            grid.appendChild(btn);
        });
        
        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "end";
        
        const btnCancel = document.createElement("button");
        btnCancel.style.background = "transparent";
        btnCancel.style.border = "none";
        btnCancel.style.color = "#E0D4BB";
        btnCancel.style.padding = "8px 16px";
        btnCancel.style.cursor = "pointer";
        btnCancel.style.fontSize = "12px";
        btnCancel.style.textTransform = "uppercase";
        btnCancel.style.letterSpacing = "1px";
        btnCancel.textContent = cancelBtnText;
        btnCancel.onclick = () => modal.remove();
        
        actions.appendChild(btnCancel);
        
        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(grid);
        card.appendChild(actions);
        modal.appendChild(card);
        document.body.appendChild(modal);
    }
    
    function insertNewSection(targetSection, templateHtml) {
        const temp = document.createElement("div");
        temp.innerHTML = templateHtml;
        const newSec = temp.firstElementChild;
        
        targetSection.parentNode.insertBefore(newSec, targetSection.nextSibling);
        
        // Re-apply editable text rules to the page so the new texts become editable
        makeTextsEditable();
        
        // Re-apply scroll reveal if necessary or just trigger reveal classes
        if (typeof window.IntersectionObserver !== "undefined") {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            });
            observer.observe(newSec);
            newSec.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        }
    }

    // Global function called from parent window (sidebar) to insert a new section
    window.insertSectionFromSidebar = function(type) {
        const isEn = window.location.pathname.includes('/en/');
        let templateHtml = "";
        
        if (type === 'intro') {
            templateHtml = isEn ? 
                `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 800px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">Golden Subtitle</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 2rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">New Section Title</h2><p style="color: var(--text-light, #524d47); font-size: 1rem; line-height: 1.8; font-family: 'Montserrat', sans-serif;">Write here the descriptive paragraph of your section. This text is completely editable.</p></div></section>` :
                `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 800px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">Sottotitolo Dorato</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 2rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">Titolo della Nuova Sezione</h2><p style="color: var(--text-light, #524d47); font-size: 1rem; line-height: 1.8; font-family: 'Montserrat', sans-serif;">Scrivi qui il paragrafo descrittivo della tua sezione. Questo testo è completamente modificabile.</p></div></section>`;
        } else if (type === 'split') {
            templateHtml = isEn ?
                `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--white);"><div style="display: flex; gap: 4rem; align-items: center; max-width: 1200px; margin: 0 auto; flex-wrap: wrap;"><div style="flex: 1; min-width: 300px;"><span style="text-transform: uppercase; letter-spacing: 4px; color: var(--gold); font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 1.2rem;">The Experience</span><h2 style="font-size: clamp(2rem, 4vw, 3rem); color: var(--text-dark); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">Side Title</h2><p style="color: var(--text-light, #524d47); font-size: 0.95rem; line-height: 1.8; font-family: 'Montserrat', sans-serif; margin-bottom: 2rem;">Add here a detailed description side-by-side with a large emotional image.</p><a href="#" style="display: inline-block; padding: 1rem 2.5rem; font-size: 0.75rem; border: 1.5px solid var(--text-dark); color: var(--text-dark); text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 600;">Discover more</a></div><div style="flex: 1; min-width: 300px; height: 50vh; position: relative; overflow: hidden; border-radius: 4px;"><img src="assets/images/hero-lido.webp" alt="Image" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></div></div></section>` :
                `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--white);"><div style="display: flex; gap: 4rem; align-items: center; max-width: 1200px; margin: 0 auto; flex-wrap: wrap;"><div style="flex: 1; min-width: 300px;"><span style="text-transform: uppercase; letter-spacing: 4px; color: var(--gold); font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 1.2rem;">L'Esperienza</span><h2 style="font-size: clamp(2rem, 4vw, 3rem); color: var(--text-dark); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">Titolo a Lato</h2><p style="color: var(--text-light, #524d47); font-size: 0.95rem; line-height: 1.8; font-family: 'Montserrat', sans-serif; margin-bottom: 2rem;">Aggiungi qui una descrizione dettagliata affiancata ad una grande immagine emozionale.</p><a href="#" style="display: inline-block; padding: 1rem 2.5rem; font-size: 0.75rem; border: 1.5px solid var(--text-dark); color: var(--text-dark); text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 600;">Scopri di più</a></div><div style="flex: 1; min-width: 300px; height: 50vh; position: relative; overflow: hidden; border-radius: 4px;"><img src="assets/images/hero-lido.webp" alt="Immagine" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></div></div></section>`;
        } else if (type === 'services') {
            templateHtml = isEn ?
                `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 1200px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">Our Services</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Excellence in Details</h2><div style="display: flex; gap: 2.5rem; justify-content: center; flex-wrap: wrap;"><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Service 1</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Short description of the first service offered.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid var(--gold);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Service 2</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Short description of the second service offered.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Service 3</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Short description of the third service offered.</p></div></div></div></section>` :
                `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 1200px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">I Nostri Servizi</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Eccellenza nei Dettagli</h2><div style="display: flex; gap: 2.5rem; justify-content: center; flex-wrap: wrap;"><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Servizio 1</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Descrizione sintetica del primo servizio offerto.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid var(--gold);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Servizio 2</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Descrizione sintetica del secondo servizio offerto.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Servizio 3</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Descrizione sintetica del terzo servizio offerto.</p></div></div></div></section>`;
        } else if (type === 'cta') {
            templateHtml = isEn ?
                `<section class="reveal visible" style="padding: 6rem 8vw; background: #1A1208; text-align: center; color: var(--white);"><div style="max-width: 800px; margin: 0 auto;"><h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); color: var(--white); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Ready to live the experience?</h2><p style="color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.7; font-family: 'Montserrat', sans-serif; margin-bottom: 2.5rem;">Contact us today to reserve your table.</p><a href="contatti.html" style="display: inline-block; padding: 1.2rem 3rem; font-size: 0.75rem; background: var(--gold); border: 1.5px solid var(--gold); color: #1A1208; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 700;">Request information</a></div></section>` :
                `<section class="reveal visible" style="padding: 6rem 8vw; background: #1A1208; text-align: center; color: var(--white);"><div style="max-width: 800px; margin: 0 auto;"><h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); color: var(--white); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Pronto a vivere l'esperienza?</h2><p style="color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.7; font-family: 'Montserrat', sans-serif; margin-bottom: 2.5rem;">Contattaci oggi stesso per riservare il tuo tavolo.</p><a href="contatti.html" style="display: inline-block; padding: 1.2rem 3rem; font-size: 0.75rem; background: var(--gold); border: 1.5px solid var(--gold); color: #1A1208; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 700;">Richiedi informazioni</a></div></section>`;
        }
        
        if (!templateHtml) return;
        
        // Identify insert target
        let target = activeSection;
        if (!target) {
            // Find last editable section on page
            const mainContainer = document.querySelector("main") || document.body;
            const sections = Array.from(mainContainer.children).filter(isEditableSection);
            if (sections.length > 0) {
                target = sections[sections.length - 1];
            } else {
                target = mainContainer.lastElementChild;
            }
        }
        
        if (target) {
            insertNewSection(target, templateHtml);
        } else {
            // Fallback absolute append
            const mainContainer = document.querySelector("main") || document.body;
            const temp = document.createElement("div");
            temp.innerHTML = templateHtml;
            mainContainer.appendChild(temp.firstElementChild);
            makeTextsEditable();
        }
    };

    // Global function called from parent to insert a single element inside the active section
    window.insertElementFromSidebar = function(type) {
        if (!activeSection) {
            return false; // Return false so index.html knows to show toast warning
        }
        
        let elementHtml = "";
        
        if (type === 'title') {
            elementHtml = `<h3 style="font-size: clamp(1.5rem, 3vw, 2.2rem); color: var(--text-dark); margin-top: 1.5rem; margin-bottom: 1rem; font-family: 'Playfair Display', serif; line-height: 1.3;">Nuovo Titolo</h3>`;
        } else if (type === 'paragraph') {
            elementHtml = `<p style="color: var(--text-light, #524d47); font-size: 0.95rem; line-height: 1.8; font-family: 'Montserrat', sans-serif; margin-bottom: 1.5rem;">Scrivi qui il tuo nuovo testo modificabile.</p>`;
        } else if (type === 'button') {
            elementHtml = `<a href="#" style="display: inline-block; padding: 1.1rem 2.8rem; font-size: 0.75rem; background: var(--gold); border: 1.5px solid var(--gold); color: var(--text-dark); text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 700; margin: 1rem 0;">Scopri di più</a>`;
        } else if (type === 'image') {
            elementHtml = `<div style="width: 100%; height: 350px; overflow: hidden; margin: 1.5rem 0; border-radius: 4px; position: relative;"><img src="assets/images/hero-lido.webp" alt="Immagine" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></div>`;
        } else if (type === 'video') {
            elementHtml = `<div style="width: 100%; height: 350px; overflow: hidden; margin: 1.5rem 0; border-radius: 4px; position: relative;"><video autoplay loop muted playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"><source src="assets/videos/hero.mp4" type="video/mp4"></video></div>`;
        }
        
        if (!elementHtml) return false;
        
        // Find best insertion target within activeSection.
        // Insert inside the inner div container if it exists, otherwise directly inside the section.
        const innerContainer = activeSection.querySelector("div");
        const appendTarget = innerContainer || activeSection;
        
        const temp = document.createElement("div");
        temp.innerHTML = elementHtml;
        appendTarget.appendChild(temp.firstElementChild);
        
        // Refresh text editing
        makeTextsEditable();
        return true;
    };

    // Drag & Drop Event Handlers
    // Drag & Drop Event Handlers
    let draggedSection = null;
    const dropIndicator = document.createElement("div");
    dropIndicator.className = "editor-drag-indicator";
    dropIndicator.style.height = "8px";
    dropIndicator.style.background = "#C9A84C";
    dropIndicator.style.margin = "16px 0";
    dropIndicator.style.borderRadius = "4px";
    dropIndicator.style.pointerEvents = "none";
    dropIndicator.style.boxShadow = "0 0 15px rgba(201, 168, 76, 0.8)";
    dropIndicator.style.position = "relative";
    dropIndicator.style.zIndex = "99999";

    const elementDropIndicator = document.createElement("div");
    elementDropIndicator.className = "editor-element-drop-indicator";

    document.addEventListener("dragstart", (e) => {
        let el = e.target;
        
        // Check if drag starts on section handle
        if (el.classList && (el.classList.contains("editor-btn-drag") || el.closest(".editor-btn-drag"))) {
            const handle = el.classList.contains("editor-btn-drag") ? el : el.closest(".editor-btn-drag");
            
            // Find parent section
            let sec = handle.parentElement;
            while (sec && sec !== document) {
                if (isEditableSection(sec)) {
                    draggedSection = sec;
                    draggedType = 'section';
                    draggedSection.classList.add("editor-section-dragging");
                    break;
                }
                sec = sec.parentElement;
            }
            
            if (draggedSection) {
                e.dataTransfer.effectAllowed = "move";
                const rect = draggedSection.getBoundingClientRect();
                e.dataTransfer.setDragImage(draggedSection, e.clientX - rect.left, e.clientY - rect.top);
                
                // Hide floating elements
                if (controlsMenu) {
                    controlsMenu.remove();
                    controlsMenu = null;
                }
                hideTextToolbar();
            }
        } 
        // Check if drag starts on element handle
        else if (el.classList && (el.classList.contains("editor-element-btn-drag") || el.closest(".editor-element-btn-drag"))) {
            e.dataTransfer.effectAllowed = "move";
        }
        else {
            // Sidebar drag is initiated from index.html (parent). 
            // In the iframe, we will detect it via window.parent.draggedSidebarItem on dragover.
            const isSelectableText = el.getAttribute && el.getAttribute("contenteditable") === "true";
            if (!isSelectableText) {
                if (el.tagName === "IMG" || el.tagName === "VIDEO") {
                    e.preventDefault();
                }
            }
        }
    });

    document.addEventListener("dragover", (e) => {
        let activeDragType = draggedType;
        let sidebarItem = window.parent && window.parent.draggedSidebarItem;
        
        if (!activeDragType && sidebarItem) {
            activeDragType = sidebarItem.category; // 'section' or 'element'
        }
        
        if (!activeDragType) return;
        
        e.preventDefault(); // Enable drop
        
        if (activeDragType === 'section') {
            // section dragging
            let el = e.target;
            let targetSection = null;
            while (el && el !== document) {
                if (isEditableSection(el) && el !== draggedSection) {
                    targetSection = el;
                    break;
                }
                el = el.parentElement;
            }
            
            if (targetSection) {
                const rect = targetSection.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const isTopHalf = relativeY < rect.height / 2;
                
                if (isTopHalf) {
                    targetSection.parentNode.insertBefore(dropIndicator, targetSection);
                } else {
                    targetSection.parentNode.insertBefore(dropIndicator, targetSection.nextSibling);
                }
            }
        } 
        else if (activeDragType === 'element') {
            // element dragging
            let el = e.target;
            let targetElement = null;
            
            // Find closest editable element or direct container child in section
            while (el && el !== document) {
                if (isEditableElement(el) && el !== draggedElement) {
                    targetElement = el;
                    break;
                }
                if (el.parentElement && isEditableSection(el.parentElement) && el !== draggedElement) {
                    targetElement = el;
                    break;
                }
                el = el.parentElement;
            }
            
            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const isTopHalf = relativeY < rect.height / 2;
                
                if (isTopHalf) {
                    targetElement.parentNode.insertBefore(elementDropIndicator, targetElement);
                } else {
                    targetElement.parentNode.insertBefore(elementDropIndicator, targetElement.nextSibling);
                }
            } else {
                // Check if hovering over empty section container
                let targetSec = e.target;
                while (targetSec && targetSec !== document) {
                    if (isEditableSection(targetSec)) {
                        const innerContainer = targetSec.querySelector("div") || targetSec;
                        if (innerContainer && !innerContainer.contains(elementDropIndicator)) {
                            innerContainer.appendChild(elementDropIndicator);
                        }
                        break;
                    }
                    targetSec = targetSec.parentElement;
                }
            }
        }
    });

    document.addEventListener("dragend", (e) => {
        if (draggedSection) {
            draggedSection.classList.remove("editor-section-dragging");
            draggedSection = null;
        }
        if (draggedElement) {
            draggedElement.classList.remove("editor-element-hover-outline");
            draggedElement = null;
        }
        draggedType = null;
        
        if (dropIndicator.parentNode) {
            dropIndicator.parentNode.removeChild(dropIndicator);
        }
        if (elementDropIndicator.parentNode) {
            elementDropIndicator.parentNode.removeChild(elementDropIndicator);
        }
    });

    document.addEventListener("drop", (e) => {
        e.preventDefault();
        
        let activeDragType = draggedType;
        let sidebarItem = window.parent && window.parent.draggedSidebarItem;
        
        if (!activeDragType && sidebarItem) {
            activeDragType = sidebarItem.category;
        }
        
        if (!activeDragType) return;
        
        // 1. DROP SECTION
        if (activeDragType === 'section') {
            if (dropIndicator.parentNode) {
                if (sidebarItem) {
                    // Drop section from sidebar
                    const isEn = window.location.pathname.includes('/en/');
                    let templateHtml = "";
                    const type = sidebarItem.type;
                    if (type === 'intro') {
                        templateHtml = isEn ? 
                            `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 800px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">Golden Subtitle</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 2rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">New Section Title</h2><p style="color: var(--text-light, #524d47); font-size: 1rem; line-height: 1.8; font-family: 'Montserrat', sans-serif;">Write here the descriptive paragraph of your section. This text is completely editable.</p></div></section>` :
                            `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 800px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">Sottotitolo Dorato</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 2rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">Titolo della Nuova Sezione</h2><p style="color: var(--text-light, #524d47); font-size: 1rem; line-height: 1.8; font-family: 'Montserrat', sans-serif;">Scrivi qui il paragrafo descrittivo della tua sezione. Questo testo è completamente modificabile.</p></div></section>`;
                    } else if (type === 'split') {
                        templateHtml = isEn ?
                            `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--white);"><div style="display: flex; gap: 4rem; align-items: center; max-width: 1200px; margin: 0 auto; flex-wrap: wrap;"><div style="flex: 1; min-width: 300px;"><span style="text-transform: uppercase; letter-spacing: 4px; color: var(--gold); font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 1.2rem;">The Experience</span><h2 style="font-size: clamp(2rem, 4vw, 3rem); color: var(--text-dark); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">Side Title</h2><p style="color: var(--text-light, #524d47); font-size: 0.95rem; line-height: 1.8; font-family: 'Montserrat', sans-serif; margin-bottom: 2rem;">Add here a detailed description side-by-side with a large emotional image.</p><a href="#" style="display: inline-block; padding: 1rem 2.5rem; font-size: 0.75rem; border: 1.5px solid var(--text-dark); color: var(--text-dark); text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 600;">Discover more</a></div><div style="flex: 1; min-width: 300px; height: 50vh; position: relative; overflow: hidden; border-radius: 4px;"><img src="assets/images/hero-lido.webp" alt="Image" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></div></div></section>` :
                            `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--white);"><div style="display: flex; gap: 4rem; align-items: center; max-width: 1200px; margin: 0 auto; flex-wrap: wrap;"><div style="flex: 1; min-width: 300px;"><span style="text-transform: uppercase; letter-spacing: 4px; color: var(--gold); font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 1.2rem;">L'Esperienza</span><h2 style="font-size: clamp(2rem, 4vw, 3rem); color: var(--text-dark); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400; line-height: 1.2;">Titolo a Lato</h2><p style="color: var(--text-light, #524d47); font-size: 0.95rem; line-height: 1.8; font-family: 'Montserrat', sans-serif; margin-bottom: 2rem;">Aggiungi qui una descrizione dettagliata affiancata ad una grande immagine emozionale.</p><a href="#" style="display: inline-block; padding: 1rem 2.5rem; font-size: 0.75rem; border: 1.5px solid var(--text-dark); color: var(--text-dark); text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 600;">Scopri di più</a></div><div style="flex: 1; min-width: 300px; height: 50vh; position: relative; overflow: hidden; border-radius: 4px;"><img src="assets/images/hero-lido.webp" alt="Immagine" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></div></div></section>`;
                    } else if (type === 'services') {
                        templateHtml = isEn ?
                            `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 1200px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">Our Services</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Excellence in Details</h2><div style="display: flex; gap: 2.5rem; justify-content: center; flex-wrap: wrap;"><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Service 1</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Short description of the first service offered.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid var(--gold);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Service 2</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Short description of the second service offered.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Service 3</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Short description of the third service offered.</p></div></div></div></section>` :
                            `<section class="reveal visible" style="padding: 8rem 8vw; background: var(--off-white); text-align: center;"><div style="max-width: 1200px; margin: 0 auto;"><span style="text-transform: uppercase; letter-spacing: 5px; color: var(--gold); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1.5rem;">I Nostri Servizi</span><h2 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text-dark); margin-bottom: 5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Eccellenza nei Dettagli</h2><div style="display: flex; gap: 2.5rem; justify-content: center; flex-wrap: wrap;"><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Servizio 1</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Descrizione sintetica del primo servizio offerto.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid var(--gold);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Servizio 2</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Descrizione sintetica del secondo servizio offerto.</p></div><div style="flex: 1; min-width: 280px; background: var(--white); padding: 3rem 2rem; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.02);"><h3 style="font-size: 1.5rem; color: var(--text-dark); margin-bottom: 1rem; font-family: 'Playfair Display', serif;">Servizio 3</h3><p style="color: var(--text-light, #524d47); font-size: 0.85rem; line-height: 1.6; font-family: 'Montserrat', sans-serif;">Descrizione sintetica del terzo servizio offerto.</p></div></div></div></section>`;
                    } else if (type === 'cta') {
                        templateHtml = isEn ?
                            `<section class="reveal visible" style="padding: 6rem 8vw; background: #1A1208; text-align: center; color: var(--white);"><div style="max-width: 800px; margin: 0 auto;"><h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); color: var(--white); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Ready to live the experience?</h2><p style="color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.7; font-family: 'Montserrat', sans-serif; margin-bottom: 2.5rem;">Contact us today to reserve your table.</p><a href="contatti.html" style="display: inline-block; padding: 1.2rem 3rem; font-size: 0.75rem; background: var(--gold); border: 1.5px solid var(--gold); color: #1A1208; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 700;">Request information</a></div></section>` :
                            `<section class="reveal visible" style="padding: 6rem 8vw; background: #1A1208; text-align: center; color: var(--white);"><div style="max-width: 800px; margin: 0 auto;"><h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); color: var(--white); margin-bottom: 1.5rem; font-family: 'Playfair Display', serif; font-weight: 400;">Pronto a vivere l'esperienza?</h2><p style="color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.7; font-family: 'Montserrat', sans-serif; margin-bottom: 2.5rem;">Contattaci oggi stesso per riservare il tuo tavolo.</p><a href="contatti.html" style="display: inline-block; padding: 1.2rem 3rem; font-size: 0.75rem; background: var(--gold); border: 1.5px solid var(--gold); color: #1A1208; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 700;">Richiedi informazioni</a></div></section>`;
                    }
                    
                    if (templateHtml) {
                        const temp = document.createElement("div");
                        temp.innerHTML = templateHtml;
                        const newSec = temp.firstElementChild;
                        dropIndicator.parentNode.insertBefore(newSec, dropIndicator);
                        
                        if (typeof window.IntersectionObserver !== "undefined") {
                            const observer = new IntersectionObserver((entries) => {
                                entries.forEach(entry => {
                                    if (entry.isIntersecting) entry.target.classList.add('visible');
                                });
                            });
                            observer.observe(newSec);
                            newSec.querySelectorAll('.reveal').forEach(el => observer.observe(el));
                        }
                    }
                } else if (draggedSection) {
                    dropIndicator.parentNode.insertBefore(draggedSection, dropIndicator);
                }
            }
        } 
        // 2. DROP ELEMENT
        else if (activeDragType === 'element') {
            if (elementDropIndicator.parentNode) {
                if (sidebarItem) {
                    const type = sidebarItem.type;
                    let elementHtml = "";
                    
                    if (type === 'title') {
                        elementHtml = `<h3 style="font-size: clamp(1.5rem, 3vw, 2.2rem); color: var(--text-dark); margin-top: 1.5rem; margin-bottom: 1rem; font-family: 'Playfair Display', serif; line-height: 1.3;">Nuovo Titolo</h3>`;
                    } else if (type === 'paragraph') {
                        elementHtml = `<p style="color: var(--text-light, #524d47); font-size: 0.95rem; line-height: 1.8; font-family: 'Montserrat', sans-serif; margin-bottom: 1.5rem;">Scrivi qui il tuo nuovo testo modificabile.</p>`;
                    } else if (type === 'button') {
                        elementHtml = `<a href="#" style="display: inline-block; padding: 1.1rem 2.8rem; font-size: 0.75rem; background: var(--gold); border: 1.5px solid var(--gold); color: var(--text-dark); text-transform: uppercase; letter-spacing: 2px; text-decoration: none; font-weight: 700; margin: 1rem 0;">Scopri di più</a>`;
                    } else if (type === 'image') {
                        elementHtml = `<div style="width: 100%; height: 350px; overflow: hidden; margin: 1.5rem 0; border-radius: 4px; position: relative;"><img src="assets/images/hero-lido.webp" alt="Immagine" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></div>`;
                    } else if (type === 'video') {
                        elementHtml = `<div style="width: 100%; height: 350px; overflow: hidden; margin: 1.5rem 0; border-radius: 4px; position: relative;"><video autoplay loop muted playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"><source src="assets/videos/hero.mp4" type="video/mp4"></video></div>`;
                    }
                    
                    if (elementHtml) {
                        const temp = document.createElement("div");
                        temp.innerHTML = elementHtml;
                        elementDropIndicator.parentNode.insertBefore(temp.firstElementChild, elementDropIndicator);
                    }
                } else if (draggedElement) {
                    elementDropIndicator.parentNode.insertBefore(draggedElement, elementDropIndicator);
                }
            }
        }
        
        if (draggedSection) {
            draggedSection.classList.remove("editor-section-dragging");
            draggedSection = null;
        }
        if (draggedElement) {
            draggedElement.classList.remove("editor-element-hover-outline");
            draggedElement = null;
        }
        draggedType = null;
        
        if (dropIndicator.parentNode) {
            dropIndicator.parentNode.removeChild(dropIndicator);
        }
        if (elementDropIndicator.parentNode) {
            elementDropIndicator.parentNode.removeChild(elementDropIndicator);
        }
        
        if (window.parent && window.parent.draggedSidebarItem) {
            window.parent.draggedSidebarItem = null;
        }

        makeTextsEditable();
    });

    // 5. Parent communication: listen to messages (e.g. image/video swaps)
    window.addEventListener("message", (e) => {
        const msg = e.data;
        if (msg.type === "update_image") {
            const img = document.getElementById(msg.elementId);
            if (img) {
                img.setAttribute("src", msg.newSrc);
                // Also update srcset if it exists to avoid caching issues on high-res displays
                if (img.hasAttribute("srcset")) {
                    img.removeAttribute("srcset");
                }
            }
        }
        if (msg.type === "update_video") {
            const video = document.getElementById(msg.elementId);
            if (video) {
                // If it has source elements, update the first source src
                const source = video.querySelector("source");
                if (source) {
                    source.setAttribute("src", msg.newSrc);
                } else {
                    video.setAttribute("src", msg.newSrc);
                }
                // Reload and play
                video.load();
                video.play().catch(err => console.log("Video playback delayed:", err));
            }
        }
    });

    // 6. Global method to retrieve cleaned HTML (run from parent)
    window.cleanHTMLForSaving = function() {
        // Remove helper styles, controls menus, and text toolbars
        const styleTag = document.getElementById("editor-helper-styles");
        if (styleTag) styleTag.remove();
        
        if (controlsMenu) {
            controlsMenu.remove();
            controlsMenu = null;
        }
        
        const sectionModal = document.getElementById("editor-section-modal");
        if (sectionModal) sectionModal.remove();
        
        if (textToolbar) {
            textToolbar.remove();
            textToolbar = null;
        }
        
        // Remove dropIndicator if it somehow remains
        if (dropIndicator && dropIndicator.parentNode) {
            dropIndicator.parentNode.removeChild(dropIndicator);
        }
        if (elementControls) {
            elementControls.remove();
            elementControls = null;
        }
        if (elementDropIndicator && elementDropIndicator.parentNode) {
            elementDropIndicator.parentNode.removeChild(elementDropIndicator);
        }
        
        document.querySelectorAll(".editor-text-toolbar").forEach(t => t.remove());
        document.querySelectorAll(".editor-controls-menu").forEach(m => m.remove());
        document.querySelectorAll(".editor-element-controls").forEach(el => el.remove());
        document.querySelectorAll(".editor-element-drop-indicator").forEach(el => el.remove());
        document.querySelectorAll(".editor-section-active").forEach(s => s.classList.remove("editor-section-active"));
        document.querySelectorAll(".editor-section-wrapper").forEach(s => s.classList.remove("editor-section-wrapper"));
        document.querySelectorAll(".editor-section-dragging").forEach(s => s.classList.remove("editor-section-dragging"));
        document.querySelectorAll(".editor-element-hover-outline").forEach(el => el.classList.remove("editor-element-hover-outline"));
        document.querySelectorAll(".editor-drag-indicator").forEach(el => el.remove());
        document.querySelectorAll("[draggable]").forEach(el => el.removeAttribute("draggable"));
        
        // Remove temporary IDs we generated
        document.querySelectorAll("[id^='img-']").forEach(img => {
            if (img.id.startsWith("img-")) img.removeAttribute("id");
        });
        document.querySelectorAll("[id^='video-']").forEach(vid => {
            if (vid.id.startsWith("video-")) vid.removeAttribute("id");
        });
        
        // Remove contenteditable attributes
        document.querySelectorAll("[contenteditable]").forEach(el => {
            el.removeAttribute("contenteditable");
        });
        
        return document.documentElement.outerHTML;
    };
});
