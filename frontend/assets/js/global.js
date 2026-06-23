document.addEventListener("DOMContentLoaded", function() {
    
    // --- 0. INJECT CRITICAL CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* WhatsApp Widget Styles */
        .wa-widget-container {
            position: fixed; bottom: 15px; right: 15px; z-index: 9999;
            display: flex; flex-direction: column-reverse; align-items: flex-end; gap: 15px;
            font-family: 'Space Grotesk', sans-serif;
        }
        .wa-main-button {
            width: 60px; height: 60px; background: #25D366; color: white;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3); cursor: pointer;
            transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .wa-main-button:hover { transform: scale(1.1) rotate(5deg); }
        .wa-main-button.active { transform: scale(0.9) rotate(-15deg); background: #128C7E; }
        
        .wa-options {
            display: flex; flex-direction: column-reverse; gap: 10px;
            opacity: 0; visibility: hidden; transform: translateY(20px);
            transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .wa-options.active { opacity: 1; visibility: visible; transform: translateY(0); }
        
        .wa-option {
            display: flex; align-items: center; gap: 12px; text-decoration: none;
            background: white; padding: 8px 15px; border-radius: 50px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: 0.3s;
        }
        .wa-option:hover { transform: translateX(-10px); background: #f0f0f0; }
        .wa-label { color: #333; font-weight: 700; font-size: 0.9rem; white-space: nowrap; }
        .wa-sub-button { width: 35px; height: 35px; background: #25D366; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        /* Mobile Overlay Styles */
        .mobile-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
            background: rgba(26, 18, 8, 0.98); z-index: 10000;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            opacity: 0; visibility: hidden; transition: 0.5s cubic-bezier(0.23, 1, 0.32, 1);
            backdrop-filter: blur(15px);
        }
        .mobile-overlay.active { opacity: 1; visibility: visible; }
        
        .mobile-nav-links { list-style: none; text-align: center; }
        .mobile-nav-links li { margin: 1.5rem 0; opacity: 0; transform: translateY(20px); transition: 0.5s; }
        .mobile-overlay.active .mobile-nav-links li { opacity: 1; transform: translateY(0); }
        .mobile-nav-links a { 
            text-decoration: none; color: #F9F7F2; 
            font-family: 'Playfair Display', serif; font-weight: 400; font-size: 2.2rem; 
            text-transform: uppercase; letter-spacing: 5px; transition: color 0.3s, letter-spacing 0.3s;
        }
        .mobile-nav-links a:hover { color: #C9A84C; letter-spacing: 7px; }
        
        .mobile-close {
            position: absolute; top: 30px; right: 30px;
            background: none; border: none; color: #F9F7F2; font-size: 3rem; cursor: pointer;
            opacity: 0.7; transition: 0.3s;
        }
        .mobile-close:hover { opacity: 1; }
        .mobile-divider { width: 40px; height: 1px; background: rgba(255,255,255,0.15); margin: 2rem 0; }
        .mobile-lang { font-family: 'Montserrat', sans-serif; font-size: 0.8rem; letter-spacing: 4px; color: rgba(255,255,255,0.35); text-transform: uppercase; }
        .mobile-lang a { font-family: 'Montserrat', sans-serif; color: rgba(255,255,255,0.6); font-weight: 400; font-size: 0.8rem; text-decoration: none; transition: 0.3s; margin: 0 5px; }
        .mobile-lang a:hover { color: #C9A84C; }

        /* Desktop specific: hide hamburger and overlay elements */
        @media (min-width: 1025px) {
            .hamburger, .mobile-overlay { display: none !important; }
        }

        /* Common Global Styles (Footer, Buttons, Social) */
        .social-feed { padding: 10rem var(--slide-padding, 8vw); background: var(--white, #FFFFFF); text-align: center; }
        .social-header { margin-bottom: 5rem; }
        .social-header span { text-transform: uppercase; letter-spacing: 5px; color: var(--gold, #C9A84C); font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1rem; }
        .social-header h2 a { color: var(--text-dark, #1A1208); text-decoration: none; font-size: 3rem; font-family: 'Playfair Display', serif; transition: color 0.3s; }
        .social-header h2 a:hover { color: var(--gold, #C9A84C); }
        .instagram-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .insta-post { position: relative; aspect-ratio: 1; overflow: hidden; }
        .insta-post img { width: 100%; height: 100%; object-fit: cover; transition: 1s cubic-bezier(0.19, 1, 0.22, 1); }
        .insta-post:hover img { transform: scale(1.1) rotate(1deg); }
        .insta-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(26,18,8,0.6); display: flex; align-items: center;
            justify-content: center; color: var(--white, #FFFFFF); opacity: 0; transition: 0.5s;
            z-index: 3;
        }
        .insta-post:hover .insta-overlay { opacity: 1; }

        .reveal { opacity: 0; transform: translateY(40px); transition: all 1.2s cubic-bezier(0.19, 1, 0.22, 1); }
        .reveal.visible { opacity: 1; transform: translateY(0); }

        footer { background: var(--text-dark, #1A1208); color: var(--white, #FFFFFF); padding: 8rem var(--slide-padding, 8vw); text-align: center; }
        .footer-logo { height: 120px; filter: brightness(0) invert(1); margin-bottom: 3rem; }
        .footer-info { font-size: 0.8rem; opacity: 0.6; letter-spacing: 1px; line-height: 2; margin-bottom: 3rem; }
        .footer-links { display: flex; justify-content: center; gap: 3rem; list-style: none; margin-bottom: 3rem; }
        .footer-links a { color: var(--white, #FFFFFF); text-decoration: none; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; }
        .footer-bottom { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 3rem; font-size: 0.7rem; opacity: 0.4; }

        .btn-luxury {
            display: inline-block; padding: 1.4rem 3.5rem; background: transparent;
            border: 1px solid #1A1208; color: #1A1208; text-decoration: none; text-transform: uppercase;
            font-size: 0.8rem; letter-spacing: 4px; transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            position: relative; overflow: hidden;
        }
        .btn-luxury:hover { background: #1A1208; color: var(--white, #FFFFFF); }

        @media (max-width: 1024px) {
            .social-feed { padding: 5rem 5vw; }
            .social-header h2 {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 0.35em !important;
                white-space: nowrap !important;
            }
            .social-header h2 a {
                font-size: clamp(0.85rem, 3.2vw, 1.1rem) !important;
                color: var(--gold, #C9A84C) !important;
                white-space: nowrap !important;
            }
            .ig-icon {
                width: 1.1em !important;
                height: 1.1em !important;
                flex-shrink: 0 !important;
            }
        }
        @media (max-width: 480px) {
            .instagram-grid { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
        }

    `;
    document.head.appendChild(style);

    // --- 1. WHATSAPP FLOATING BUTTON ---
    const waWidget = document.createElement('div');
    waWidget.className = "wa-widget-container";
    waWidget.innerHTML = `
        <div class="wa-options" id="waOptions">
            <a href="https://wa.me/393477183803" target="_blank" class="wa-option">
                <span class="wa-label">Ristorante</span>
                <div class="wa-sub-button"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-2.32 0-4.591 1.142-4.591 3.125 0 1.254.808 2.308 2.025 2.825l-.25 1.05c-.058.242.125.475.375.475h.017c.183 0 .342-.117.392-.292l.275-1.05h1.5l.275 1.05c.05.175.208.292.392.292h.017c.25 0 .433-.233.375-.475l-.25-1.05c1.217-.517 2.025-1.571 2.025-2.825 0-1.983-2.271-3.125-4.591-3.125zm0 1.25c1.475 0 3.091.733 3.091 1.875 0 .842-.717 1.483-1.892 1.708l-.208.042c-.225.042-.375.242-.375.475l.175.75h-.167l.175-.75c0-.233-.15-.433-.375-.475l-.208-.042c-1.175-.225-1.892-.867-1.892-1.708 0-1.142 1.617-1.875 3.091-1.875zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.168L2.054 22l4.958-1.303A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 0 1-4.144-1.157l-.297-.174-3.083.81.824-3.003-.19-.303A7.952 7.952 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg></div>
            </a>
            <a href="https://wa.me/393477183803" target="_blank" class="wa-option">
                <span class="wa-label">Spiaggia</span>
                <div class="wa-sub-button"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-2.32 0-4.591 1.142-4.591 3.125 0 1.254.808 2.308 2.025 2.825l-.25 1.05c-.058.242.125.475.375.475h.017c.183 0 .342-.117.392-.292l.275-1.05h1.5l.275 1.05c.05.175.208.292.392.292h.017c.25 0 .433-.233.375-.475l-.25-1.05c1.217-.517 2.025-1.571 2.025-2.825 0-1.983-2.271-3.125-4.591-3.125zm0 1.25c1.475 0 3.091.733 3.091 1.875 0 .842-.717 1.483-1.892 1.708l-.208.042c-.225.042-.375.242-.375.475l.175.75h-.167l.175-.75c0-.233-.15-.433-.375-.475l-.208-.042c-1.175-.225-1.892-.867-1.892-1.708 0-1.142 1.617-1.875 3.091-1.875zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.168L2.054 22l4.958-1.303A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 0 1-4.144-1.157l-.297-.174-3.083.81.824-3.003-.19-.303A7.952 7.952 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg></div>
            </a>
            <a href="https://wa.me/393477183803" target="_blank" class="wa-option">
                <span class="wa-label">Eventi Privati</span>
                <div class="wa-sub-button"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-2.32 0-4.591 1.142-4.591 3.125 0 1.254.808 2.308 2.025 2.825l-.25 1.05c-.058.242.125.475.375.475h.017c.183 0 .342-.117.392-.292l.275-1.05h1.5l.275 1.05c.05.175.208.292.392.292h.017c.25 0 .433-.233.375-.475l-.25-1.05c1.217-.517 2.025-1.571 2.025-2.825 0-1.983-2.271-3.125-4.591-3.125zm0 1.25c1.475 0 3.091.733 3.091 1.875 0 .842-.717 1.483-1.892 1.708l-.208.042c-.225.042-.375.242-.375.475l.175.75h-.167l.175-.75c0-.233-.15-.433-.375-.475l-.208-.042c-1.175-.225-1.892-.867-1.892-1.708 0-1.142 1.617-1.875 3.091-1.875zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.168L2.054 22l4.958-1.303A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 0 1-4.144-1.157l-.297-.174-3.083.81.824-3.003-.19-.303A7.952 7.952 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg></div>
            </a>
        </div>
        <div class="wa-main-button" id="waMain">
            <svg width="35" height="35" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-2.32 0-4.591 1.142-4.591 3.125 0 1.254.808 2.308 2.025 2.825l-.25 1.05c-.058.242.125.475.375.475h.017c.183 0 .342-.117.392-.292l.275-1.05h1.5l.275 1.05c.05.175.208.292.392.292h.017c.25 0 .433-.233.375-.475l-.25-1.05c1.217-.517 2.025-1.571 2.025-2.825 0-1.983-2.271-3.125-4.591-3.125zm0 1.25c1.475 0 3.091.733 3.091 1.875 0 .842-.717 1.483-1.892 1.708l-.208.042c-.225.042-.375.242-.375.475l.175.75h-.167l.175-.75c0-.233-.15-.433-.375-.475l-.208-.042c-1.175-.225-1.892-.867-1.892-1.708 0-1.142 1.617-1.875 3.091-1.875zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.168L2.054 22l4.958-1.303A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 0 1-4.144-1.157l-.297-.174-3.083.81.824-3.003-.19-.303A7.952 7.952 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
        </div>
    `;
    document.body.appendChild(waWidget);

    const waMain = document.getElementById('waMain');
    const waOptions = document.getElementById('waOptions');

    waMain.addEventListener('click', () => {
        waMain.classList.toggle('active');
        waOptions.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!waWidget.contains(e.target)) {
            waMain.classList.remove('active');
            waOptions.classList.remove('active');
        }
    });

    // --- 2. MOBILE HAMBURGER MENU ---
    // Extract unique links from the page
    const linkEls = document.querySelectorAll('.navbar .nav-link, .nav-links .nav-link');
    const langEl  = document.querySelector('.navbar .lang-switcher');
    const seen = new Set();
    const uniqueLinks = [];
    
    linkEls.forEach(link => {
        const key = link.textContent.trim();
        if (key && !seen.has(key)) {
            seen.add(key);
            uniqueLinks.push({ href: link.href, text: key });
        }
    });

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = "mobile-overlay";
    overlay.setAttribute('aria-hidden', 'true');

    const closeBtn = document.createElement('button');
    closeBtn.className = "mobile-close";
    closeBtn.innerHTML = "&times;";
    overlay.appendChild(closeBtn);

    const overlayNav = document.createElement('ul');
    overlayNav.className = "mobile-nav-links";

    uniqueLinks.forEach(({ href, text }) => {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.href = href;
        a.textContent = text;
        a.addEventListener('click', close);
        li.appendChild(a);
        overlayNav.appendChild(li);
    });

    overlay.appendChild(overlayNav);

    if (langEl) {
        const div = document.createElement('div');
        div.className = "mobile-divider";
        overlay.appendChild(div);
        const lang = document.createElement('div');
        lang.className = "mobile-lang";
        lang.innerHTML = langEl.innerHTML;
        overlay.appendChild(lang);
    }

    document.body.appendChild(overlay);

    function open() {
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
    function close() {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    // Connect hamburger if exists in HTML, else it stays hidden by CSS
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', open);
    }
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
});
