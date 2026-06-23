import re
import os

base_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend"

def create_page(lang, filename, title, description, hero_title, hero_tagline, hero_img, content_html, active_link=""):
    # Read the base damai page for the language
    if lang == "it":
        source_file = os.path.join(base_dir, "damai.html")
        en_link = "en/" + filename
        it_link = filename
    else:
        source_file = os.path.join(base_dir, "en", "damai.html")
        en_link = filename
        it_link = "../" + filename

    with open(source_file, "r", encoding="utf-8") as f:
        html = f.read()

    # Extract head
    head_match = re.search(r'(<head>.*?</head>)', html, re.DOTALL)
    head = head_match.group(1) if head_match else ""

    # Replace title and description
    if lang == "it":
        head = re.sub(r'<title>.*?</title>', f'<title>{title} | Damai Exclusive Garden</title>', head)
        head = re.sub(r'<meta content=".*?" name="description"/>', f'<meta content="{description}" name="description"/>', head)
    else:
        head = re.sub(r'<title>.*?</title>', f'<title>{title} | Damai Exclusive Garden</title>', head)
        head = re.sub(r'<meta content=".*?" name="description"/>', f'<meta content="{description}" name="description"/>', head)

    # Make sure we use the right paths for images based on lang
    prefix = "../" if lang == "en" else ""

    # Create new body
    nav_html = f"""
    <!-- NAVBAR -->
    <nav class="navbar" id="navbar">
        <ul class="nav-left">
            <li><a class="nav-link" href="{"../" if lang == "en" else ""}damai.html">{"Home" if lang == "en" else "Home"}</a></li>
            <li><a class="nav-link" href="{filename}" {"style='color: var(--gold) !important;'" if active_link == "eventi" else ""}>{"Events" if lang == "en" else "Eventi"}</a></li>
        </ul>
        <a class="logo-link" href="{"../" if lang == "en" else ""}damai.html">
            <img alt="Damai" class="logo" src="{prefix}assets/logos/logo-playaluna.webp"/>
        </a>
        <ul class="nav-right">
            <li><a class="nav-link" href="damai-contatti.html" {"style='color: var(--gold) !important;'" if active_link == "contatti" else ""}>{"Contact" if lang == "en" else "Contatti"}</a></li>
            <li class="lang-switcher">
                <a class="nav-link" href="{en_link if lang == 'it' else it_link}">{ "EN" if lang == "it" else "IT" }</a>
            </li>
        </ul>
        <div class="hamburger" id="hamburger">
            <span></span><span></span><span></span>
        </div>
    </nav>

    <!-- MOBILE OVERLAY NAVIGATION -->
    <div aria-hidden="true" class="mobile-overlay">
        <button class="mobile-close">&times;</button>
        <ul class="mobile-nav-links">
            <li><a href="{"../" if lang == "en" else ""}damai.html">{"Home" if lang == "en" else "Home"}</a></li>
            <li><a href="damai-eventi.html">{"Events" if lang == "en" else "Eventi"}</a></li>
            <li><a href="damai-contatti.html">{"Contact" if lang == "en" else "Contatti"}</a></li>
            <li><a href="{en_link if lang == 'it' else it_link}">{ "EN" if lang == "it" else "IT" }</a></li>
        </ul>
    </div>
    """

    hero_html = f"""
    <main>
        <header class="hero" style="height: 60vh;">
            <img src="{prefix}{hero_img}" class="hero-bg" style="object-fit: cover; opacity: 0.6;" alt="{title}">
            <div class="hero-content reveal visible">
                <span class="hero-tagline">{hero_tagline}</span>
                <h1 class="hero-title" style="font-size: clamp(2rem, 5vw, 4rem);">{hero_title}</h1>
            </div>
        </header>
        {content_html}
    </main>
    """

    # Extract Footer
    footer_match = re.search(r'(<footer>.*?</footer>)', html, re.DOTALL)
    footer = footer_match.group(1) if footer_match else ""

    # Extract scripts
    scripts_match = re.search(r'(<div class="wa-widget-container">.*</body>)', html, re.DOTALL)
    scripts = scripts_match.group(1) if scripts_match else ""
    # remove duplicate wa-widget-container if any inside scripts
    
    full_html = f"""<!DOCTYPE html>
<html lang="{lang}">
{head}
<body>
    <div class="decor-line line-left"></div>
    <div class="decor-line line-right"></div>
    {nav_html}
    {hero_html}
    {footer}
    <div id="scrollTop">↑</div>
    {scripts}
</html>
"""
    
    out_path = os.path.join(base_dir, filename) if lang == "it" else os.path.join(base_dir, "en", filename)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(full_html)
    print(f"Created {out_path}")

# CONTENT DEFINITIONS

eventi_it_content = """
        <section class="content-section" style="padding: 6rem 8vw; background: var(--white);">
            <div class="content-text reveal">
                <h2>Celebrazioni Indimenticabili</h2>
                <p>Al Damai Event Garden, ogni evento è un'opera d'arte creata su misura. Che si tratti di un elegante matrimonio, una festa di compleanno esclusiva, o un evento aziendale di prestigio, i nostri spazi si adattano per offrirti la cornice perfetta. <br><br> Il nostro team di event planner e designer curerà ogni dettaglio, dall'allestimento floreale boho-chic alla selezione musicale, per garantirti un'esperienza senza pari.</p>
                <a class="btn-gold" href="damai-contatti.html">Richiedi Informazioni</a>
            </div>
            <div class="content-image-wrapper reveal">
                <img alt="Damai Eventi" class="content-image" loading="lazy" src="assets/images/card-eventi-wedding.webp" style="aspect-ratio: 1;"/>
            </div>
        </section>
        
        <section class="events-section reveal" style="background-color: var(--off-white); border-top: 1px solid rgba(30, 45, 36, 0.05);">
            <div class="events-header">
                <span>Le Nostre Proposte</span>
                <h2>Scegli il tuo Evento</h2>
            </div>
            <div class="events-grid">
                <div class="event-card" style="background: var(--white);">
                    <div class="event-card-img-wrapper">
                        <img alt="Matrimoni" loading="lazy" src="assets/images/damai-boho-tables.webp"/>
                    </div>
                    <div class="event-card-text">
                        <h3>Matrimoni</h3>
                        <p>Dì il tuo "Sì" circondato dal verde lussureggiante e riflessi cristallini della nostra piscina. Un ricevimento da sogno in un'oasi di pace.</p>
                    </div>
                </div>
                <div class="event-card" style="background: var(--white);">
                    <div class="event-card-img-wrapper">
                        <img alt="Feste Private" loading="lazy" src="assets/images/damai-pool-sunset.webp"/>
                    </div>
                    <div class="event-card-text">
                        <h3>Feste Private</h3>
                        <p>Celebra i tuoi traguardi, 18esimi, lauree e compleanni con un party esclusivo a bordo piscina, con DJ set e atmosfere suggestive.</p>
                    </div>
                </div>
                <div class="event-card" style="background: var(--white);">
                    <div class="event-card-img-wrapper">
                        <img alt="Eventi Aziendali" loading="lazy" src="assets/images/fda-evento-aziendale.webp"/>
                    </div>
                    <div class="event-card-text">
                        <h3>Eventi Aziendali</h3>
                        <p>Cene di gala, presentazioni di prodotto e team building in una location che unisce eleganza, privacy e servizi di alta qualità.</p>
                    </div>
                </div>
            </div>
        </section>
"""

eventi_en_content = """
        <section class="content-section" style="padding: 6rem 8vw; background: var(--white);">
            <div class="content-text reveal">
                <h2>Unforgettable Celebrations</h2>
                <p>At Damai Event Garden, every event is a tailor-made masterpiece. Whether it's an elegant wedding, an exclusive birthday party, or a prestigious corporate event, our spaces adapt to provide the perfect setting. <br><br> Our team of event planners and designers will take care of every detail, from the boho-chic floral arrangements to the musical selection, to ensure an unparalleled experience.</p>
                <a class="btn-gold" href="damai-contatti.html">Request Information</a>
            </div>
            <div class="content-image-wrapper reveal">
                <img alt="Damai Events" class="content-image" loading="lazy" src="../assets/images/card-eventi-wedding.webp" style="aspect-ratio: 1;"/>
            </div>
        </section>
        
        <section class="events-section reveal" style="background-color: var(--off-white); border-top: 1px solid rgba(30, 45, 36, 0.05);">
            <div class="events-header">
                <span>Our Proposals</span>
                <h2>Choose your Event</h2>
            </div>
            <div class="events-grid">
                <div class="event-card" style="background: var(--white);">
                    <div class="event-card-img-wrapper">
                        <img alt="Weddings" loading="lazy" src="../assets/images/damai-boho-tables.webp"/>
                    </div>
                    <div class="event-card-text">
                        <h3>Weddings</h3>
                        <p>Say "I do" surrounded by lush greenery and the crystal-clear reflections of our pool. A dream reception in an oasis of peace.</p>
                    </div>
                </div>
                <div class="event-card" style="background: var(--white);">
                    <div class="event-card-img-wrapper">
                        <img alt="Private Parties" loading="lazy" src="../assets/images/damai-pool-sunset.webp"/>
                    </div>
                    <div class="event-card-text">
                        <h3>Private Parties</h3>
                        <p>Celebrate your milestones, 18th birthdays, graduations, and more with an exclusive pool party, featuring DJ sets and suggestive atmospheres.</p>
                    </div>
                </div>
                <div class="event-card" style="background: var(--white);">
                    <div class="event-card-img-wrapper">
                        <img alt="Corporate Events" loading="lazy" src="../assets/images/fda-evento-aziendale.webp"/>
                    </div>
                    <div class="event-card-text">
                        <h3>Corporate Events</h3>
                        <p>Gala dinners, product presentations, and team building in a location that combines elegance, privacy, and high-quality services.</p>
                    </div>
                </div>
            </div>
        </section>
"""

contatti_it_content = """
        <section class="content-section" style="padding: 6rem 8vw; background: var(--white); grid-template-columns: 1fr 1fr; gap: 4vw; align-items: start;">
            <div class="content-text reveal">
                <span style="color: var(--gold); text-transform: uppercase; letter-spacing: 3px; font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1rem;">Siamo qui per te</span>
                <h2 style="font-size: 3rem; margin-bottom: 2rem;">Inizia a progettare il tuo evento</h2>
                <p style="margin-bottom: 1.5rem;"><strong>Indirizzo:</strong><br> Via Marina di Varcaturo, 42<br>81030 Castel Volturno (CE)</p>
                <p style="margin-bottom: 1.5rem;"><strong>Email:</strong><br> info@playaluna.it</p>
                <p style="margin-bottom: 2.5rem;"><strong>Telefono / WhatsApp:</strong><br> <a href="https://wa.me/393477183803" style="color: var(--damai-green); font-weight: 600; text-decoration: none;">+39 347 718 3803</a></p>
                
                <a class="btn-gold" href="https://wa.me/393477183803?text=Vorrei%20richiedere%20un%20preventivo%20per%20un%20evento%20al%20Damai" target="_blank" style="margin-right: 1rem;">Chatta su WhatsApp</a>
            </div>
            
            <div class="reveal" style="width: 100%; height: 100%; min-height: 400px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(30, 45, 36, 0.1);">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2958.852150821558!2d13.987010212001556!3d40.91689537121703!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x133b0f5cd824ce25%3A0x8fc2af17c9d96e43!2sPlaya%20Luna!5e0!3m2!1sit!2sit!4v1717696238320!5m2!1sit!2sit" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
        </section>
"""

contatti_en_content = """
        <section class="content-section" style="padding: 6rem 8vw; background: var(--white); grid-template-columns: 1fr 1fr; gap: 4vw; align-items: start;">
            <div class="content-text reveal">
                <span style="color: var(--gold); text-transform: uppercase; letter-spacing: 3px; font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 1rem;">We are here for you</span>
                <h2 style="font-size: 3rem; margin-bottom: 2rem;">Start planning your event</h2>
                <p style="margin-bottom: 1.5rem;"><strong>Address:</strong><br> Via Marina di Varcaturo, 42<br>81030 Castel Volturno (CE), Italy</p>
                <p style="margin-bottom: 1.5rem;"><strong>Email:</strong><br> info@playaluna.it</p>
                <p style="margin-bottom: 2.5rem;"><strong>Phone / WhatsApp:</strong><br> <a href="https://wa.me/393477183803" style="color: var(--damai-green); font-weight: 600; text-decoration: none;">+39 347 718 3803</a></p>
                
                <a class="btn-gold" href="https://wa.me/393477183803?text=I%20would%20like%20to%20request%20a%20quote%20for%20an%20event%20at%20Damai" target="_blank" style="margin-right: 1rem;">Chat on WhatsApp</a>
            </div>
            
            <div class="reveal" style="width: 100%; height: 100%; min-height: 400px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(30, 45, 36, 0.1);">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2958.852150821558!2d13.987010212001556!3d40.91689537121703!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x133b0f5cd824ce25%3A0x8fc2af17c9d96e43!2sPlaya%20Luna!5e0!3m2!1sit!2sit!4v1717696238320!5m2!1sit!2sit" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
        </section>
"""

# Generate IT pages
create_page("it", "damai-eventi.html", "Eventi Esclusivi", "Scopri gli eventi privati, aziendali e i matrimoni al Damai Exclusive Garden.", "Eventi Esclusivi", "Celebra con Noi", "assets/images/damai-boho-tables.webp", eventi_it_content, active_link="eventi")

create_page("it", "damai-contatti.html", "Contatti", "Contatta il Damai Exclusive Garden per informazioni e preventivi sui tuoi eventi.", "Contattaci", "Inizia a Progettare", "assets/images/damai-pool-sunset.webp", contatti_it_content, active_link="contatti")

# Generate EN pages
create_page("en", "damai-eventi.html", "Exclusive Events", "Discover private events, corporate events, and weddings at Damai Exclusive Garden.", "Exclusive Events", "Celebrate with Us", "assets/images/damai-boho-tables.webp", eventi_en_content, active_link="eventi")

create_page("en", "damai-contatti.html", "Contact Us", "Contact Damai Exclusive Garden for information and quotes for your events.", "Contact Us", "Start Planning", "assets/images/damai-pool-sunset.webp", contatti_en_content, active_link="contatti")
